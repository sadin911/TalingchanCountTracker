import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Deck, DeckCard } from '../types/deck.ts';
import type { TalingchanCard } from '../types/card.ts';

interface DeckState {
  decks: Deck[];
  activeDeckId: string | null;
  createDeck: (name: string) => string;
  deleteDeck: (deckId: string) => void;
  renameDeck: (deckId: string, name: string) => void;
  setActiveDeck: (deckId: string) => void;
  addCardToMain: (deckId: string, card: TalingchanCard) => void;
  removeCardFromMain: (deckId: string, cardId: string) => void;
  addCardToLife: (deckId: string, card: TalingchanCard) => void;
  removeCardFromLife: (deckId: string, cardId: string) => void;
  importDeck: (deckData: Pick<Deck, 'name' | 'mainDeck' | 'lifeDeck'>) => string;
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
    count
  };
}

export const useDeckStore = create<DeckState>()(
  persist(
    (set) => ({
      decks: [],
      activeDeckId: null,

      createDeck: (name) => {
        const id = `deck_${Date.now()}`;
        const newDeck: Deck = {
          id,
          name: name.trim() || 'เด็คใหม่',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          mainDeck: [],
          lifeDeck: []
        };
        set((state) => ({
          decks: [newDeck, ...state.decks],
          activeDeckId: id
        }));
        return id;
      },

      deleteDeck: (deckId) => {
        set((state) => ({
          decks: state.decks.filter((d) => d.id !== deckId),
          activeDeckId: state.activeDeckId === deckId ? (state.decks.find(d => d.id !== deckId)?.id || null) : state.activeDeckId
        }));
      },

      renameDeck: (deckId, name) => {
        set((state) => ({
          decks: state.decks.map((d) => (d.id === deckId ? { ...d, name: name.trim(), updatedAt: new Date().toISOString() } : d))
        }));
      },

      setActiveDeck: (deckId) => set({ activeDeckId: deckId }),

      addCardToMain: (deckId, card) => {
        set((state) => ({
          decks: state.decks.map((deck) => {
            if (deck.id !== deckId) return deck;
            const existing = deck.mainDeck.find((c) => c.id === card.id);
            let updatedMain: DeckCard[];
            if (existing) {
              updatedMain = deck.mainDeck.map((c) => (c.id === card.id ? { ...c, count: c.count + 1 } : c));
            } else {
              updatedMain = [...deck.mainDeck, cardToDeckCard(card, 1)];
            }
            return { ...deck, mainDeck: updatedMain, updatedAt: new Date().toISOString() };
          })
        }));
      },

      removeCardFromMain: (deckId, cardId) => {
        set((state) => ({
          decks: state.decks.map((deck) => {
            if (deck.id !== deckId) return deck;
            const existing = deck.mainDeck.find((c) => c.id === cardId);
            if (!existing) return deck;
            let updatedMain: DeckCard[];
            if (existing.count > 1) {
              updatedMain = deck.mainDeck.map((c) => (c.id === cardId ? { ...c, count: c.count - 1 } : c));
            } else {
              updatedMain = deck.mainDeck.filter((c) => c.id !== cardId);
            }
            return { ...deck, mainDeck: updatedMain, updatedAt: new Date().toISOString() };
          })
        }));
      },

      addCardToLife: (deckId, card) => {
        set((state) => ({
          decks: state.decks.map((deck) => {
            if (deck.id !== deckId) return deck;
            const existing = deck.lifeDeck.find((c) => c.id === card.id);
            if (existing) return deck; // Only 1 copy in Life Deck
            return {
              ...deck,
              lifeDeck: [...deck.lifeDeck, cardToDeckCard(card, 1)],
              updatedAt: new Date().toISOString()
            };
          })
        }));
      },

      removeCardFromLife: (deckId, cardId) => {
        set((state) => ({
          decks: state.decks.map((deck) => {
            if (deck.id !== deckId) return deck;
            return {
              ...deck,
              lifeDeck: deck.lifeDeck.filter((c) => c.id !== cardId),
              updatedAt: new Date().toISOString()
            };
          })
        }));
      },

      importDeck: (deckData) => {
        const id = `deck_${Date.now()}`;
        const newDeck: Deck = {
          id,
          name: deckData.name,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          mainDeck: deckData.mainDeck,
          lifeDeck: deckData.lifeDeck
        };
        set((state) => ({
          decks: [newDeck, ...state.decks],
          activeDeckId: id
        }));
        return id;
      }
    }),
    {
      name: 'talingchan_decks_v1',
      storage: createJSONStorage(() => safeStorage)
    }
  )
);
