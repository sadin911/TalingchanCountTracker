import type React from 'react';
import type { TalingchanCard } from '../types/card.ts';

const viteBaseUrl =
  typeof import.meta !== 'undefined' &&
  typeof (import.meta as unknown as { env?: { BASE_URL?: string } }).env === 'object'
    ? (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL
    : '/';
export const DEFAULT_CARD_PLACEHOLDER = `${viteBaseUrl || '/'}card-placeholder.svg`.replace('//', '/');
export const R2_PUBLIC_BASE_URL = 'https://pub-851c7b1da9514507a99b79bc2fd47577.r2.dev';
export const R2_CDN_BASE = R2_PUBLIC_BASE_URL;

export function cardImageKey(setCode: string, collectorNumber: string, large = false): string {
  const dir = large ? 'card-images-lg' : 'card-images';
  return `${dir}/${setCode}/${collectorNumber}.webp`;
}

/**
 * Resolves a card image path to its best URL.
 * Primary source: Cloudflare R2 CDN (`https://pub-851c7b1da9514507a99b79bc2fd47577.r2.dev`).
 */
export function resolveCardImageUrl(
  cardOrSetCode?: string | Partial<Pick<TalingchanCard, 'id' | 'setCode' | 'collectorNumber' | 'imageUrl'>> | null,
  collectorNumberOrLarge?: string | boolean | null,
  large = false
): string {
  if (!cardOrSetCode) return DEFAULT_CARD_PLACEHOLDER;

  let setCode = '';
  let collectorNumber = '';
  let remoteUrl: string | undefined;

  if (typeof cardOrSetCode === 'object') {
    setCode = cardOrSetCode.setCode || '';
    collectorNumber = cardOrSetCode.collectorNumber || '';
    remoteUrl = cardOrSetCode.imageUrl;
  } else if (typeof cardOrSetCode === 'string') {
    setCode = cardOrSetCode;
    collectorNumber = typeof collectorNumberOrLarge === 'string' ? collectorNumberOrLarge : '';
    if (typeof collectorNumberOrLarge === 'boolean') {
      large = collectorNumberOrLarge;
    }
  }

  if (setCode && collectorNumber) {
    const key = cardImageKey(setCode, collectorNumber, large);
    return `${R2_CDN_BASE}/${key}`;
  }

  if (remoteUrl) {
    return remoteUrl;
  }

  return DEFAULT_CARD_PLACEHOLDER;
}

export function handleCardImageError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallbackUrl?: string,
  card?: { setCode?: string; collectorNumber?: string }
) {
  const target = e.currentTarget;
  if (!target) return;

  // Prevent infinite loop if placeholder fails
  if (target.src.includes('card-placeholder.svg')) {
    return;
  }

  // 1. Try Cloudflare R2 CDN if not already tried
  if (card?.setCode && card?.collectorNumber) {
    const r2Url = `${R2_CDN_BASE}/${cardImageKey(card.setCode, card.collectorNumber)}`;
    if (target.src !== r2Url && !target.dataset.triedR2) {
      target.dataset.triedR2 = '1';
      target.src = r2Url;
      return;
    }
  }

  // 2. Try local / Worker static asset path (/card-images/...) if R2 returned 429/error
  if (card?.setCode && card?.collectorNumber && !target.dataset.triedLocal) {
    target.dataset.triedLocal = '1';
    target.src = `/${cardImageKey(card.setCode, card.collectorNumber)}`;
    return;
  }

  // 3. Try Official BotTCG CDN fallback URL if available
  if (
    fallbackUrl &&
    target.src !== fallbackUrl &&
    !target.dataset.triedFallback &&
    !target.src.includes('card-placeholder.svg')
  ) {
    target.dataset.triedFallback = '1';
    target.src = fallbackUrl;
    return;
  }

  // 4. Final fallback to placeholder SVG
  target.src = DEFAULT_CARD_PLACEHOLDER;
}
