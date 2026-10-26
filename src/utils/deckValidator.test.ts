import { describe, it, expect } from 'vitest';
import { validateDeck } from './deckValidator.ts';
import type { DeckCard } from '../types/deck.ts';

function makeCard(id: string, name: string, overrides: Partial<DeckCard> = {}): DeckCard {
  return {
    id,
    name,
    setCode: 'BT01',
    collectorNumber: id.split('-')[1] || '001',
    cardType: 'Avatar',
    color: 'RED',
    isOnlyOne: false,
    isBiased: false,
    cost: 2,
    count: 1,
    ...overrides
  };
}

describe('BOTC Deck Validator', () => {
  it('validates a correct 50 main + 5 life deck', () => {
    // 12 unique cards * 4 copies = 48 + 1 unique card * 2 copies = 50
    const main: DeckCard[] = [];
    for (let i = 1; i <= 12; i++) {
      main.push(makeCard(`BT01-${i.toString().padStart(3, '0')}`, `Card ${i}`, { count: 4 }));
    }
    main.push(makeCard('BT01-013', 'Card 13', { count: 2 }));

    const life: DeckCard[] = [
      makeCard('BT01-020', 'Life 1', { cardType: 'Life Card', count: 1 }),
      makeCard('BT01-021', 'Life 2', { cardType: 'Life Card', count: 1 }),
      makeCard('BT01-022', 'Life 3', { cardType: 'Life Card', count: 1 }),
      makeCard('BT01-023', 'Life 4', { cardType: 'Life Card', count: 1 }),
      makeCard('BT01-024', 'Life 5', { cardType: 'Life Card', count: 1 })
    ];

    const result = validateDeck(main, life);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects duplicate names in the LIFE deck', () => {
    const life: DeckCard[] = [
      makeCard('BT01-020', 'Same Life Name', { cardType: 'Life Card', count: 1 }),
      makeCard('BT01-021', 'Same Life Name', { cardType: 'Life Card', count: 1 }),
      makeCard('BT01-022', 'Life 3', { cardType: 'Life Card', count: 1 }),
      makeCard('BT01-023', 'Life 4', { cardType: 'Life Card', count: 1 }),
      makeCard('BT01-024', 'Life 5', { cardType: 'Life Card', count: 1 })
    ];
    const result = validateDeck([], life);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('LIFE Card ห้ามมีชื่อซ้ำกัน'))).toBe(true);
  });

  it('rejects more than 4 copies of any card in Main Deck', () => {
    const main: DeckCard[] = [
      makeCard('BT01-001', 'Over Limit', { count: 5 })
    ];
    const result = validateDeck(main, []);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('เกิน 4 ใบ'))).toBe(true);
  });

  it('rejects more than 1 Only 1 card in Main Deck', () => {
    const main: DeckCard[] = [
      makeCard('BT01-007', 'Only 1 A', { isOnlyOne: true, count: 1 }),
      makeCard('BT01-009', 'Only 1 B', { isOnlyOne: true, count: 1 })
    ];
    const result = validateDeck(main, []);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('Only 1'))).toBe(true);
  });

  it('flags warning when deck contains biased (ลำเอียง) cards', () => {
    const main: DeckCard[] = [
      makeCard('BT01-008', 'Biased Card', { isBiased: true, count: 1 })
    ];
    const result = validateDeck(main, []);
    expect(result.warnings.some(w => w.includes('ลำเอียง'))).toBe(true);
  });
});
