import type { TalingchanCard } from '../types/card.ts';
import type { Deck, DeckCard } from '../types/deck.ts';
import rawCards from '../data/talingchanCards.json';

const allCards = rawCards as TalingchanCard[];

function cardToDeckCard(card: TalingchanCard, count: number): DeckCard {
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

/**
 * Generates a balanced 50-card Main Deck + 5-card Life Deck from a given Starter Set code (e.g. SD01, SD02).
 * Uses cards from the set (respecting Only 1 = max 1 copy, normal cards = up to 4 copies)
 * and supplements from BT01 if needed to reach exactly 50 Main + 5 distinct Life cards.
 */
function buildStarterPreset(
  id: string,
  name: string,
  setCode: string
): Deck {
  const setCards = allCards.filter((c) => c.setCode === setCode && !c.isBiased);
  const fallbackCards = allCards.filter((c) => c.setCode === 'BT01' && !c.isBiased);
  const pool = [...setCards, ...fallbackCards];

  // Pick 5 distinct Life Cards (cardType === 'Life Card') for Life Deck
  const lifePool = pool.filter((c) => c.cardType === 'Life Card');
  const lifeDeck: DeckCard[] = [];
  const usedLifeNames = new Set<string>();
  for (const card of lifePool) {
    if (lifeDeck.length >= 5) break;
    if (!usedLifeNames.has(card.name)) {
      usedLifeNames.add(card.name);
      lifeDeck.push(cardToDeckCard(card, 1));
    }
  }

  // Build 50-card Main Deck from non-Life cards (Avatar, Magic, Construct)
  const mainPool = pool.filter((c) => c.cardType !== 'Life Card');
  const mainDeck: DeckCard[] = [];
  const nameCounts = new Map<string, number>();
  let hasOnlyOne = false;
  let mainTotal = 0;

  for (const card of mainPool) {
    if (mainTotal >= 50) break;
    if (card.isOnlyOne && hasOnlyOne) continue;

    const currentForName = nameCounts.get(card.name) || 0;
    const maxAllowed = card.isOnlyOne ? 1 : 4;
    const canAdd = Math.min(maxAllowed - currentForName, 50 - mainTotal);

    if (canAdd > 0) {
      mainDeck.push(cardToDeckCard(card, canAdd));
      nameCounts.set(card.name, currentForName + canAdd);
      mainTotal += canAdd;
      if (card.isOnlyOne) hasOnlyOne = true;
    }
  }

  return {
    id,
    name,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    mainDeck,
    lifeDeck,
  };
}

export const STARTER_DECK_PRESETS: Deck[] = [
  buildStarterPreset('preset-sd01', 'SD01: ตัวตึงไกรลาส (Starter)', 'SD01'),
  buildStarterPreset('preset-sd02', 'SD02: วีรบุรุษปากซอย (Starter)', 'SD02'),
  buildStarterPreset('preset-sd03', 'SD03: นรกก็แค่น้ำพริก (Starter)', 'SD03'),
  buildStarterPreset('preset-sd04', 'SD04: ทหารไก่ชนเขา (Starter)', 'SD04'),
  buildStarterPreset('preset-sd05', 'SD05: กำเนิดจากน้ำ (Starter)', 'SD05'),
];

