import type React from 'react';
import type { TalingchanCard } from '../types/card.ts';

export const DEFAULT_CARD_PLACEHOLDER = `${import.meta.env.BASE_URL || '/'}card-placeholder.svg`.replace('//', '/');
export const R2_PUBLIC_BASE_URL = 'https://pub-851c7b1da9514507a99b79bc2fd47577.r2.dev';
export const R2_CDN_BASE = R2_PUBLIC_BASE_URL;

export function cardImageKey(setCode: string, collectorNumber: string, large = false): string {
  const dir = large ? 'card-images-lg' : 'card-images';
  return `${dir}/${setCode}/${collectorNumber}.webp`;
}

/**
 * Resolves a card image path to its best URL.
 * - In Production (Cloudflare Pages/Web): routes directly to Cloudflare R2 CDN.
 * - In Local Dev: uses local asset path (/card-images/...) for instant offline loading.
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
    // In Production, resolve directly to Cloudflare R2 CDN
    if (import.meta.env.PROD) {
      return `${R2_CDN_BASE}/${key}`;
    }
    return `/${key}`;
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

  // 1. Try Cloudflare R2 CDN if local failed
  if (card?.setCode && card?.collectorNumber) {
    const r2Url = `${R2_CDN_BASE}/${cardImageKey(card.setCode, card.collectorNumber)}`;
    if (target.src !== r2Url) {
      target.src = r2Url;
      return;
    }
  }

  // 2. Try Wiki fallback if available
  if (fallbackUrl && target.src !== fallbackUrl && !target.src.includes('card-placeholder.svg')) {
    target.src = fallbackUrl;
    return;
  }

  // 3. Final fallback to placeholder SVG
  target.src = DEFAULT_CARD_PLACEHOLDER;
}

