import { describe, it, expect } from 'vitest';
import { cardImageKey, resolveCardImageUrl, DEFAULT_CARD_PLACEHOLDER } from './cardImage.ts';

describe('Card Image Resolver', () => {
  it('derives image key correctly', () => {
    expect(cardImageKey('BT01', '001', false)).toBe('card-images/BT01/001.webp');
    expect(cardImageKey('BT01', '001', true)).toBe('card-images-lg/BT01/001.webp');
  });

  it('returns default placeholder when card has missing props', () => {
    expect(resolveCardImageUrl(null, null)).toBe(DEFAULT_CARD_PLACEHOLDER);
  });
});
