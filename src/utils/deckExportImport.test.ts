import { describe, it, expect } from 'vitest';
import { exportDeckToText, importDeckFromText } from './deckExportImport.ts';
import type { Deck } from '../types/deck.ts';

describe('Deck Export and Import', () => {
  const sampleDeck: Deck = {
    id: 'test-1',
    name: 'เด็คตงิดแค้น',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    mainDeck: [
      { id: 'BT01-001', name: 'นนทก นิ้วเพชร', setCode: 'BT01', collectorNumber: '001', cardType: 'Avatar', color: 'RED', isOnlyOne: false, isBiased: false, cost: 3, count: 4 }
    ],
    lifeDeck: [
      { id: 'BT01-006', name: 'จิตวิญญาณแห่งตลิ่งชัน', setCode: 'BT01', collectorNumber: '006', cardType: 'Life Card', color: 'COLORLESS', isOnlyOne: false, isBiased: false, cost: null, count: 1 }
    ]
  };

  it('exports deck to clean text format', () => {
    const text = exportDeckToText(sampleDeck);
    expect(text).toContain('=== MAIN DECK ===');
    expect(text).toContain('4x นนทก นิ้วเพชร (BT01-001)');
    expect(text).toContain('=== LIFE DECK ===');
    expect(text).toContain('1x จิตวิญญาณแห่งตลิ่งชัน (BT01-006)');
  });

  it('parses text format back to deck cards', () => {
    const text = exportDeckToText(sampleDeck);
    const parsed = importDeckFromText(text, 'เด็คตงิดแค้น');
    expect(parsed.mainDeck).toHaveLength(1);
    expect(parsed.mainDeck[0].id).toBe('BT01-001');
    expect(parsed.mainDeck[0].count).toBe(4);
    expect(parsed.lifeDeck).toHaveLength(1);
    expect(parsed.lifeDeck[0].id).toBe('BT01-006');
  });
});
