import { describe, it, expect } from 'vitest';
import {
  cardImageKey,
  resolveCardImageUrl,
  DEFAULT_CARD_PLACEHOLDER,
  R2_CDN_BASE,
} from './cardImage.ts';
import cardsData from '../data/talingchanCards.json';
import setsData from '../data/talingchanSets.json';

describe('Card Image Resolver & Official BotTCG Catalog Integrity', () => {
  it('derives image key correctly', () => {
    expect(cardImageKey('BT01', '001', false)).toBe('card-images/BT01/001.webp');
    expect(cardImageKey('BT01', '001', true)).toBe('card-images-lg/BT01/001.webp');
  });

  it('resolves card images directly to Cloudflare R2 CDN', () => {
    expect(resolveCardImageUrl('BT01', '001')).toBe(
      `${R2_CDN_BASE}/card-images/BT01/001.webp`
    );
    expect(
      resolveCardImageUrl({
        id: 'BT01-001-SCR',
        setCode: 'BT01',
        collectorNumber: '001-SCR',
      })
    ).toBe(`${R2_CDN_BASE}/card-images/BT01/001-SCR.webp`);
  });

  it('returns default placeholder when card has missing props', () => {
    expect(resolveCardImageUrl(null, null)).toBe(DEFAULT_CARD_PLACEHOLDER);
  });

  it('contains all 1,851 official cards across 35 sets with zero broken placeholders', () => {
    expect(cardsData.length).toBe(1851);
    expect(setsData.length).toBe(35);

    const uniqueIds = new Set(cardsData.map((c) => c.id));
    expect(uniqueIds.size).toBe(1851);

    for (const card of cardsData) {
      expect(card.setCode).toBeTruthy();
      expect(card.collectorNumber).toBeTruthy();
      expect(card.name).not.toContain('colspan=');
      expect(card.name).not.toContain('rowspan=');
      expect(resolveCardImageUrl(card)).toContain(`${R2_CDN_BASE}/card-images/`);
      expect(card.memeLore).toBeTruthy();
      expect(card.memeLore!.length).toBeGreaterThan(10);
    }
  });
});
