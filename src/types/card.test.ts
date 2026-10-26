import { describe, it, expect } from 'vitest';
import { rarityLabel, cardDisplayName } from './card.ts';

describe('Card type utilities', () => {
  it('formats rarity label correctly', () => {
    expect(rarityLabel('Super_rare')).toBe('Super Rare');
    expect(rarityLabel('Ultra_rare')).toBe('Ultra Rare');
    expect(rarityLabel('Common')).toBe('Common');
  });

  it('formats card display name with code and number', () => {
    const card = { id: 'BT01-001', name: 'นนทก นิ้วเพชร' };
    expect(cardDisplayName(card)).toBe('นนทก นิ้วเพชร (BT01-001)');
  });
});
