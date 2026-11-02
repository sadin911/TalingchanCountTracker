import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../utils/firebase.ts';
import type { FinishKey } from '../types/card.ts';
import type { CardFinishesCount, SetProgress } from '../types/collection.ts';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export const SCHEMA_VERSION = 2;

/**
 * Strips undefined values recursively via JSON serialization so Firestore setDoc
 * never throws "Unsupported field value: undefined".
 */
export function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

/**
 * Prunes zero-count card entries so Firestore documents remain compact.
 */
export function pruneCards(
  cards: Record<string, CardFinishesCount>
): Record<string, CardFinishesCount> {
  const pruned: Record<string, CardFinishesCount> = {};
  for (const [cardId, counts] of Object.entries(cards)) {
    if (!counts) continue;
    const normal = Math.max(0, Number(counts.normal) || 0);
    const foil = Math.max(0, Number(counts.foil) || 0);
    const secret = Math.max(0, Number(counts.secret) || 0);
    if (normal + foil + secret > 0) {
      pruned[cardId] = { normal, foil, secret };
    }
  }
  return pruned;
}

/**
 * Two-way reconciliation between local cards and cloud cards.
 * Uses Math.max per finish so offline/guest additions are never lost on login.
 */
export function reconcileCards(
  localCards: Record<string, CardFinishesCount>,
  cloudCards: Record<string, CardFinishesCount>
): { merged: Record<string, CardFinishesCount>; changedFromCloud: boolean } {
  const merged: Record<string, CardFinishesCount> = {};
  let changedFromCloud = false;

  const allCardIds = new Set([...Object.keys(localCards || {}), ...Object.keys(cloudCards || {})]);
  for (const cardId of allCardIds) {
    const l = localCards?.[cardId] || { normal: 0, foil: 0, secret: 0 };
    const c = cloudCards?.[cardId] || { normal: 0, foil: 0, secret: 0 };

    const normal = Math.max(0, Number(l.normal) || 0, Number(c.normal) || 0);
    const foil = Math.max(0, Number(l.foil) || 0, Number(c.foil) || 0);
    const secret = Math.max(0, Number(l.secret) || 0, Number(c.secret) || 0);

    if (normal + foil + secret > 0) {
      merged[cardId] = { normal, foil, secret };
      if (
        normal !== (Number(c.normal) || 0) ||
        foil !== (Number(c.foil) || 0) ||
        secret !== (Number(c.secret) || 0)
      ) {
        changedFromCloud = true;
      }
    }
  }

  return { merged, changedFromCloud };
}

interface CollectionState {
  cards: Record<string, CardFinishesCount>;
  syncStatus: SyncStatus;
  lastSyncedAt: number | null;
  cloudLoadedUid: string | null;
  setCardCount: (cardId: string, finish: FinishKey, count: number) => void;
  incrementCard: (cardId: string, finish: FinishKey) => void;
  decrementCard: (cardId: string, finish: FinishKey) => void;
  getCardTotal: (cardId: string) => number;
  getSetProgress: (setCode: string, totalCardsInSet: number, setCardIds: string[]) => SetProgress;
  clearCollection: () => void;
  loadUserFromCloud: (uid: string) => Promise<boolean>;
  forceSyncCloud: (uid?: string) => Promise<boolean>;
  resetToGuest: () => void;
  exportCollectionJSON: () => string;
  importCollectionJSON: (jsonString: string) => { success: boolean; message: string };
}

const memoryStore: Record<string, string> = {};

const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
        return localStorage.getItem(key);
      }
      return memoryStore[key] || null;
    } catch {
      return memoryStore[key] || null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
        localStorage.setItem(key, value);
      }
      memoryStore[key] = value;
    } catch {
      memoryStore[key] = value;
    }
  },
  removeItem: (key: string): void => {
    try {
      if (typeof localStorage !== 'undefined' && typeof localStorage.removeItem === 'function') {
        localStorage.removeItem(key);
      }
      delete memoryStore[key];
    } catch {
      delete memoryStore[key];
    }
  },
};

const DEFAULT_COUNTS: CardFinishesCount = { normal: 0, foil: 0, secret: 0 };

let collectionSyncTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Schedules a debounced cloud write ONLY if the signed-in user's cloud state
 * has already finished loading (`cloudLoadedUid === user.uid`), preventing
 * race conditions during app boot from overwriting cloud data.
 */
function scheduleCloudCollectionSync(get: () => CollectionState) {
  const user = auth?.currentUser;
  if (!user) return;
  if (get().cloudLoadedUid !== user.uid) return;
  if (collectionSyncTimer) clearTimeout(collectionSyncTimer);
  collectionSyncTimer = setTimeout(() => {
    collectionSyncTimer = null;
    if (get().cloudLoadedUid === user.uid) {
      void get().forceSyncCloud(user.uid);
    }
  }, 500);
}

export const useCollectionStore = create<CollectionState>()(
  persist(
    (set, get) => ({
      cards: {},
      syncStatus: 'idle',
      lastSyncedAt: null,
      cloudLoadedUid: null,

      setCardCount: (cardId, finish, count) => {
        const safeCount = Math.max(0, count);
        set((state) => {
          const current = state.cards[cardId] || { ...DEFAULT_COUNTS };
          const updated = { ...current, [finish]: safeCount };
          const nextCards = { ...state.cards };
          if (updated.normal + updated.foil + updated.secret === 0) {
            delete nextCards[cardId];
          } else {
            nextCards[cardId] = updated;
          }
          return { cards: nextCards };
        });
        scheduleCloudCollectionSync(get);
      },

      incrementCard: (cardId, finish) => {
        set((state) => {
          const current = state.cards[cardId] || { ...DEFAULT_COUNTS };
          return {
            cards: {
              ...state.cards,
              [cardId]: {
                ...current,
                [finish]: current[finish] + 1,
              },
            },
          };
        });
        scheduleCloudCollectionSync(get);
      },

      decrementCard: (cardId, finish) => {
        set((state) => {
          const current = state.cards[cardId] || { ...DEFAULT_COUNTS };
          const nextVal = Math.max(0, current[finish] - 1);
          const updated = { ...current, [finish]: nextVal };
          const nextCards = { ...state.cards };
          if (updated.normal + updated.foil + updated.secret === 0) {
            delete nextCards[cardId];
          } else {
            nextCards[cardId] = updated;
          }
          return { cards: nextCards };
        });
        scheduleCloudCollectionSync(get);
      },

      getCardTotal: (cardId) => {
        const entry = get().cards[cardId];
        if (!entry) return 0;
        return entry.normal + entry.foil + entry.secret;
      },

      getSetProgress: (setCode, totalCardsInSet, setCardIds) => {
        const cards = get().cards;
        let uniqueOwned = 0;
        let totalOwned = 0;

        for (const id of setCardIds) {
          const entry = cards[id];
          if (entry) {
            const sum = entry.normal + entry.foil + entry.secret;
            if (sum > 0) {
              uniqueOwned += 1;
              totalOwned += sum;
            }
          }
        }

        const percentage =
          totalCardsInSet > 0 ? Math.round((uniqueOwned / totalCardsInSet) * 100) : 0;
        return {
          setCode,
          totalCards: totalCardsInSet,
          uniqueOwned,
          totalOwned,
          percentage,
        };
      },

      clearCollection: () => {
        set({ cards: {} });
        scheduleCloudCollectionSync(get);
      },

      loadUserFromCloud: async (uid) => {
        if (!db || !uid) return false;
        if (collectionSyncTimer) {
          clearTimeout(collectionSyncTimer);
          collectionSyncTimer = null;
        }
        set({ syncStatus: 'syncing' });

        // 1. Save a durable pre-sync safeguard backup in localStorage
        const preSyncLocalCards = pruneCards(get().cards);
        if (Object.keys(preSyncLocalCards).length > 0) {
          safeStorage.setItem(
            'talingchan_safeguard_backup',
            JSON.stringify({
              savedAt: Date.now(),
              cards: preSyncLocalCards,
            })
          );
        }

        // 2. Check per-user local cache for zero-blanking hydration
        let cachedUserCards: Record<string, CardFinishesCount> = {};
        try {
          const cachedRaw = safeStorage.getItem(`talingchan_user_cache_${uid}`);
          if (cachedRaw) {
            const parsed = JSON.parse(cachedRaw) as { cards?: Record<string, CardFinishesCount> };
            if (parsed?.cards) {
              cachedUserCards = pruneCards(parsed.cards);
            }
          }
        } catch {
          // ignore cache parse errors
        }

        try {
          const docRef = doc(db, 'users', uid, 'collection', 'main');
          const snap = await getDoc(docRef);
          const cloudCards = snap.exists()
            ? pruneCards(
                (snap.data() as { cards?: Record<string, CardFinishesCount> })?.cards || {}
              )
            : {};

          // Combine local cards and per-user cached cards before reconciling with cloud
          const { merged: localCombined } = reconcileCards(preSyncLocalCards, cachedUserCards);
          const { merged, changedFromCloud } = reconcileCards(localCombined, cloudCards);

          // Persist per-user cache
          safeStorage.setItem(
            `talingchan_user_cache_${uid}`,
            JSON.stringify({ updatedAt: Date.now(), cards: merged })
          );

          // Write reconciled state back to Firestore if local had new/higher card counts
          if (changedFromCloud || (!snap.exists() && Object.keys(merged).length > 0)) {
            await setDoc(
              docRef,
              sanitizeForFirestore({
                cards: merged,
                schemaVersion: SCHEMA_VERSION,
                updatedAt: Date.now(),
              })
            );
          }

          set({
            cards: merged,
            syncStatus: 'synced',
            lastSyncedAt: Date.now(),
            cloudLoadedUid: uid,
          });
          return true;
        } catch (err) {
          console.warn('loadUserFromCloud error:', err);
          set({ syncStatus: 'error' });
          return false;
        }
      },

      forceSyncCloud: async (uid) => {
        const targetUid = uid || auth?.currentUser?.uid;
        if (!db || !targetUid) return false;
        set({ syncStatus: 'syncing' });
        try {
          const pruned = pruneCards(get().cards);
          const docRef = doc(db, 'users', targetUid, 'collection', 'main');
          await setDoc(
            docRef,
            sanitizeForFirestore({
              cards: pruned,
              schemaVersion: SCHEMA_VERSION,
              updatedAt: Date.now(),
            })
          );
          safeStorage.setItem(
            `talingchan_user_cache_${targetUid}`,
            JSON.stringify({ updatedAt: Date.now(), cards: pruned })
          );
          set({
            cards: pruned,
            syncStatus: 'synced',
            lastSyncedAt: Date.now(),
            cloudLoadedUid: targetUid,
          });
          return true;
        } catch (err) {
          console.warn('forceSyncCloud error:', err);
          set({ syncStatus: 'error' });
          return false;
        }
      },

      resetToGuest: () => {
        if (collectionSyncTimer) {
          clearTimeout(collectionSyncTimer);
          collectionSyncTimer = null;
        }
        set({
          syncStatus: 'idle',
          lastSyncedAt: null,
          cloudLoadedUid: null,
        });
      },

      exportCollectionJSON: () => {
        return JSON.stringify(
          {
            app: 'TalingchanCountTracker',
            version: '1.0.0',
            schemaVersion: SCHEMA_VERSION,
            exportedAt: new Date().toISOString(),
            cards: pruneCards(get().cards),
          },
          null,
          2
        );
      },

      importCollectionJSON: (jsonString) => {
        try {
          const parsed = JSON.parse(jsonString) as {
            cards?: Record<string, CardFinishesCount>;
          };
          if (!parsed || typeof parsed !== 'object' || !parsed.cards) {
            return {
              success: false,
              message: 'รูปแบบไฟล์ JSON ไม่ถูกต้อง (ไม่พบข้อมูล cards)',
            };
          }
          const pruned = pruneCards(parsed.cards);
          set({ cards: pruned });
          scheduleCloudCollectionSync(get);
          return {
            success: true,
            message: `นำเข้าข้อมูลการ์ดสำเร็จ (${Object.keys(pruned).length} รายการ)`,
          };
        } catch {
          return {
            success: false,
            message: 'ไม่สามารถอ่านไฟล์ JSON ได้ กรุณาตรวจสอบรูปแบบข้อมูล',
          };
        }
      },
    }),
    {
      name: 'talingchan_collection_v1',
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({ cards: state.cards }),
    }
  )
);
