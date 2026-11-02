import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { auth, db } from '../utils/firebase.ts';
import { sanitizeForFirestore } from './collectionStore.ts';
import type { Deck, DeckCard } from '../types/deck.ts';
import type { TalingchanCard } from '../types/card.ts';

export type DeckSyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

/**
 * Reconciles local and cloud decks while respecting deleted deck tombstones.
 * If a deck exists in both local and cloud, the one with the latest `updatedAt` wins.
 */
export function reconcileDecks(
  localDecks: Deck[],
  cloudDecks: Deck[],
  deletedIds: Set<string>
): { mergedDecks: Deck[]; decksToUpload: Deck[] } {
  const map = new Map<string, Deck>();
  const decksToUpload: Deck[] = [];

  for (const cDeck of cloudDecks) {
    if (!cDeck?.id || deletedIds.has(cDeck.id)) continue;
    map.set(cDeck.id, cDeck);
  }

  for (const lDeck of localDecks) {
    if (!lDeck?.id || deletedIds.has(lDeck.id)) continue;
    const existingCloud = map.get(lDeck.id);
    if (!existingCloud) {
      map.set(lDeck.id, lDeck);
      decksToUpload.push(lDeck);
    } else {
      const localTime = Date.parse(lDeck.updatedAt || '') || 0;
      const cloudTime = Date.parse(existingCloud.updatedAt || '') || 0;
      if (localTime > cloudTime) {
        map.set(lDeck.id, lDeck);
        decksToUpload.push(lDeck);
      }
    }
  }

  const mergedDecks = Array.from(map.values()).sort((a, b) => {
    const tA = Date.parse(a.updatedAt || '') || 0;
    const tB = Date.parse(b.updatedAt || '') || 0;
    return tB - tA;
  });

  return { mergedDecks, decksToUpload };
}

interface DeckState {
  decks: Deck[];
  activeDeckId: string | null;
  pendingPlaymatDeckId: string | null;
  syncStatus: DeckSyncStatus;
  lastSyncedAt: number | null;
  cloudLoadedUid: string | null;
  createDeck: (name: string) => string;
  deleteDeck: (deckId: string) => void;
  renameDeck: (deckId: string, name: string) => void;
  setActiveDeck: (deckId: string) => void;
  setPendingPlaymatDeck: (deckId: string | null) => void;
  addCardToMain: (deckId: string, card: TalingchanCard) => void;
  removeCardFromMain: (deckId: string, cardId: string) => void;
  addCardToLife: (deckId: string, card: TalingchanCard) => void;
  removeCardFromLife: (deckId: string, cardId: string) => void;
  importDeck: (deckData: Pick<Deck, 'name' | 'mainDeck' | 'lifeDeck'>) => string;
  loadUserDecksFromCloud: (uid: string) => Promise<boolean>;
  forceSyncDecksCloud: (uid?: string) => Promise<boolean>;
  resetToGuestDecks: () => void;
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

function getLocalDeletedDeckIds(uid: string): Set<string> {
  try {
    const raw = safeStorage.getItem(`talingchan_deleted_decks_${uid}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch {
    // ignore
  }
  return new Set();
}

function addLocalDeletedDeckId(uid: string, deckId: string): void {
  const current = getLocalDeletedDeckIds(uid);
  current.add(deckId);
  safeStorage.setItem(`talingchan_deleted_decks_${uid}`, JSON.stringify(Array.from(current)));
}

function cardToDeckCard(card: TalingchanCard, count = 1): DeckCard {
  return {
    id: card.id,
    name: card.name,
    setCode: card.setCode,
    collectorNumber: card.collectorNumber,
    cardType: card.cardType,
    color: card.color,
    cost: card.cost,
    isOnlyOne: card.isOnlyOne,
    isBiased: card.isBiased,
    count,
  };
}

let deckSyncTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleCloudDeckSync(get: () => DeckState) {
  const user = auth?.currentUser;
  if (!user) return;
  if (get().cloudLoadedUid !== user.uid) return;
  if (deckSyncTimer) clearTimeout(deckSyncTimer);
  deckSyncTimer = setTimeout(() => {
    deckSyncTimer = null;
    if (get().cloudLoadedUid === user.uid) {
      void get().forceSyncDecksCloud(user.uid);
    }
  }, 500);
}

export const useDeckStore = create<DeckState>()(
  persist(
    (set, get) => ({
      decks: [],
      activeDeckId: null,
      pendingPlaymatDeckId: null,
      syncStatus: 'idle',
      lastSyncedAt: null,
      cloudLoadedUid: null,

      createDeck: (name) => {
        const id = `deck_${Date.now()}`;
        const newDeck: Deck = {
          id,
          name: name.trim() || 'เด็คใหม่',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          mainDeck: [],
          lifeDeck: [],
        };
        set((state) => ({
          decks: [newDeck, ...state.decks],
          activeDeckId: id,
        }));
        scheduleCloudDeckSync(get);
        return id;
      },

      deleteDeck: (deckId) => {
        set((state) => ({
          decks: state.decks.filter((d) => d.id !== deckId),
          activeDeckId:
            state.activeDeckId === deckId
              ? state.decks.find((d) => d.id !== deckId)?.id || null
              : state.activeDeckId,
        }));
        const uid = auth?.currentUser?.uid || get().cloudLoadedUid;
        if (uid) {
          addLocalDeletedDeckId(uid, deckId);
          if (db) {
            deleteDoc(doc(db, 'users', uid, 'decks', deckId)).catch(console.warn);
            setDoc(
              doc(db, 'users', uid, 'deleted_decks', deckId),
              sanitizeForFirestore({ id: deckId, deletedAt: Date.now() })
            ).catch(console.warn);
          }
        }
      },

      renameDeck: (deckId, name) => {
        set((state) => ({
          decks: state.decks.map((d) =>
            d.id === deckId
              ? { ...d, name: name.trim(), updatedAt: new Date().toISOString() }
              : d
          ),
        }));
        scheduleCloudDeckSync(get);
      },

      setActiveDeck: (deckId) => set({ activeDeckId: deckId }),

      setPendingPlaymatDeck: (deckId) => set({ pendingPlaymatDeckId: deckId }),

      addCardToMain: (deckId, card) => {
        set((state) => ({
          decks: state.decks.map((deck) => {
            if (deck.id !== deckId) return deck;
            const existing = deck.mainDeck.find((c) => c.id === card.id);
            let updatedMain: DeckCard[];
            if (existing) {
              updatedMain = deck.mainDeck.map((c) =>
                c.id === card.id ? { ...c, count: c.count + 1 } : c
              );
            } else {
              updatedMain = [...deck.mainDeck, cardToDeckCard(card, 1)];
            }
            return {
              ...deck,
              mainDeck: updatedMain,
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
        scheduleCloudDeckSync(get);
      },

      removeCardFromMain: (deckId, cardId) => {
        set((state) => ({
          decks: state.decks.map((deck) => {
            if (deck.id !== deckId) return deck;
            const existing = deck.mainDeck.find((c) => c.id === cardId);
            if (!existing) return deck;
            let updatedMain: DeckCard[];
            if (existing.count > 1) {
              updatedMain = deck.mainDeck.map((c) =>
                c.id === cardId ? { ...c, count: c.count - 1 } : c
              );
            } else {
              updatedMain = deck.mainDeck.filter((c) => c.id !== cardId);
            }
            return {
              ...deck,
              mainDeck: updatedMain,
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
        scheduleCloudDeckSync(get);
      },

      addCardToLife: (deckId, card) => {
        set((state) => ({
          decks: state.decks.map((deck) => {
            if (deck.id !== deckId) return deck;
            const existing = deck.lifeDeck.find((c) => c.id === card.id);
            if (existing) return deck;
            return {
              ...deck,
              lifeDeck: [...deck.lifeDeck, cardToDeckCard(card, 1)],
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
        scheduleCloudDeckSync(get);
      },

      removeCardFromLife: (deckId, cardId) => {
        set((state) => ({
          decks: state.decks.map((deck) => {
            if (deck.id !== deckId) return deck;
            return {
              ...deck,
              lifeDeck: deck.lifeDeck.filter((c) => c.id !== cardId),
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
        scheduleCloudDeckSync(get);
      },

      importDeck: (deckData) => {
        const id = `deck_${Date.now()}`;
        const newDeck: Deck = {
          id,
          name: deckData.name,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          mainDeck: deckData.mainDeck,
          lifeDeck: deckData.lifeDeck,
        };
        set((state) => ({
          decks: [newDeck, ...state.decks],
          activeDeckId: id,
        }));
        scheduleCloudDeckSync(get);
        return id;
      },

      loadUserDecksFromCloud: async (uid) => {
        if (!db || !uid) return false;
        if (deckSyncTimer) {
          clearTimeout(deckSyncTimer);
          deckSyncTimer = null;
        }
        set({ syncStatus: 'syncing' });
        try {
          const deletedIds = getLocalDeletedDeckIds(uid);

          // Load cloud tombstones
          try {
            const delSnap = await getDocs(collection(db, 'users', uid, 'deleted_decks'));
            delSnap.forEach((d) => deletedIds.add(d.id));
            safeStorage.setItem(
              `talingchan_deleted_decks_${uid}`,
              JSON.stringify(Array.from(deletedIds))
            );
          } catch {
            // ignore tombstone read error
          }

          const decksCol = collection(db, 'users', uid, 'decks');
          const snap = await getDocs(decksCol);
          const cloudDecks: Deck[] = [];
          snap.forEach((docSnap) => {
            const data = docSnap.data() as Deck;
            if (data && data.id) {
              cloudDecks.push(data);
            }
          });

          const localDecks = get().decks;
          const { mergedDecks, decksToUpload } = reconcileDecks(
            localDecks,
            cloudDecks,
            deletedIds
          );

          for (const d of decksToUpload) {
            await setDoc(doc(db, 'users', uid, 'decks', d.id), sanitizeForFirestore(d));
          }

          set({
            decks: mergedDecks,
            activeDeckId:
              mergedDecks.find((d) => d.id === get().activeDeckId)?.id ||
              mergedDecks[0]?.id ||
              null,
            syncStatus: 'synced',
            lastSyncedAt: Date.now(),
            cloudLoadedUid: uid,
          });
          return true;
        } catch (err) {
          console.warn('loadUserDecksFromCloud error:', err);
          set({ syncStatus: 'error' });
          return false;
        }
      },

      forceSyncDecksCloud: async (uid) => {
        const targetUid = uid || auth?.currentUser?.uid;
        if (!db || !targetUid) return false;
        set({ syncStatus: 'syncing' });
        try {
          const deletedIds = getLocalDeletedDeckIds(targetUid);
          const localDecks = get().decks.filter((d) => !deletedIds.has(d.id));
          for (const d of localDecks) {
            await setDoc(doc(db, 'users', targetUid, 'decks', d.id), sanitizeForFirestore(d));
          }
          set({
            syncStatus: 'synced',
            lastSyncedAt: Date.now(),
            cloudLoadedUid: targetUid,
          });
          return true;
        } catch (err) {
          console.warn('forceSyncDecksCloud error:', err);
          set({ syncStatus: 'error' });
          return false;
        }
      },

      resetToGuestDecks: () => {
        if (deckSyncTimer) {
          clearTimeout(deckSyncTimer);
          deckSyncTimer = null;
        }
        set({
          syncStatus: 'idle',
          lastSyncedAt: null,
          cloudLoadedUid: null,
        });
      },
    }),
    {
      name: 'talingchan_decks_v1',
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({
        decks: state.decks,
        activeDeckId: state.activeDeckId,
      }),
    }
  )
);
