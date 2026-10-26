import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { FinishKey } from '../types/card.ts';
import type { CardFinishesCount, SetProgress } from '../types/collection.ts';

interface CollectionState {
  cards: Record<string, CardFinishesCount>;
  setCardCount: (cardId: string, finish: FinishKey, count: number) => void;
  incrementCard: (cardId: string, finish: FinishKey) => void;
  decrementCard: (cardId: string, finish: FinishKey) => void;
  getCardTotal: (cardId: string) => number;
  getSetProgress: (setCode: string, totalCardsInSet: number, setCardIds: string[]) => SetProgress;
  clearCollection: () => void;
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
  }
};

const DEFAULT_COUNTS: CardFinishesCount = { normal: 0, foil: 0, secret: 0 };

export const useCollectionStore = create<CollectionState>()(
  persist(
    (set, get) => ({
      cards: {},

      setCardCount: (cardId, finish, count) => {
        const safeCount = Math.max(0, count);
        set((state) => {
          const current = state.cards[cardId] || { ...DEFAULT_COUNTS };
          return {
            cards: {
              ...state.cards,
              [cardId]: {
                ...current,
                [finish]: safeCount
              }
            }
          };
        });
      },

      incrementCard: (cardId, finish) => {
        set((state) => {
          const current = state.cards[cardId] || { ...DEFAULT_COUNTS };
          return {
            cards: {
              ...state.cards,
              [cardId]: {
                ...current,
                [finish]: current[finish] + 1
              }
            }
          };
        });
      },

      decrementCard: (cardId, finish) => {
        set((state) => {
          const current = state.cards[cardId] || { ...DEFAULT_COUNTS };
          const nextVal = Math.max(0, current[finish] - 1);
          return {
            cards: {
              ...state.cards,
              [cardId]: {
                ...current,
                [finish]: nextVal
              }
            }
          };
        });
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

        const percentage = totalCardsInSet > 0 ? Math.round((uniqueOwned / totalCardsInSet) * 100) : 0;
        return {
          setCode,
          totalCards: totalCardsInSet,
          uniqueOwned,
          totalOwned,
          percentage
        };
      },

      clearCollection: () => set({ cards: {} })
    }),
    {
      name: 'talingchan_collection_v1',
      storage: createJSONStorage(() => safeStorage)
    }
  )
);
