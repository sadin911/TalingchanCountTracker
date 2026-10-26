import type { DeckCard, ValidationResult } from '../types/deck.ts';

export const BOTC_RULES = {
  MAIN_DECK_SIZE: 50,
  LIFE_DECK_SIZE: 5,
  MAX_COPIES_PER_NAME: 4,
  MAX_ONLY_ONE_CARDS: 1
};

export function validateDeck(mainDeck: DeckCard[], lifeDeck: DeckCard[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const mainCount = mainDeck.reduce((sum, c) => sum + c.count, 0);
  const lifeCount = lifeDeck.reduce((sum, c) => sum + c.count, 0);

  // 1. Total Deck Size checks
  if (mainCount !== BOTC_RULES.MAIN_DECK_SIZE) {
    errors.push(`Main Deck ต้องมี 50 ใบพอดี (ปัจจุบันมี ${mainCount} ใบ)`);
  }

  if (lifeCount !== BOTC_RULES.LIFE_DECK_SIZE) {
    errors.push(`LIFE Deck ต้องมี 5 ใบพอดี (ปัจจุบันมี ${lifeCount} ใบ)`);
  }

  // 2. Main Deck copy limits & Only 1 check
  const mainCardNames: Record<string, number> = {};
  let onlyOneCount = 0;

  for (const card of mainDeck) {
    mainCardNames[card.name] = (mainCardNames[card.name] || 0) + card.count;
    if (mainCardNames[card.name] > BOTC_RULES.MAX_COPIES_PER_NAME) {
      errors.push(`การ์ด "${card.name}" ใส่ได้สูงสุดไม่เกิน 4 ใบใน Main Deck`);
    }

    if (card.isOnlyOne) {
      onlyOneCount += card.count;
    }

    if (card.isBiased) {
      warnings.push(`มีการ์ดติดสัญลักษณ์ "ลำเอียง" (${card.name}) ซึ่งไม่อนุญาตในการแข่งขันทางการ`);
    }
  }

  if (onlyOneCount > BOTC_RULES.MAX_ONLY_ONE_CARDS) {
    errors.push(`การ์ดที่มีสัญลักษณ์ "Only 1" ใส่ได้สูงสุด 1 ใบในเด็ค (ปัจจุบันมี ${onlyOneCount} ใบ)`);
  }

  // 3. LIFE Deck uniqueness check
  const lifeNames = new Set<string>();
  for (const card of lifeDeck) {
    if (card.count > 1 || lifeNames.has(card.name)) {
      errors.push(`LIFE Card ห้ามมีชื่อซ้ำกันเด็ดขาด ("${card.name}")`);
    }
    lifeNames.add(card.name);
  }

  return {
    isValid: errors.length === 0,
    mainCount,
    lifeCount,
    errors,
    warnings
  };
}
