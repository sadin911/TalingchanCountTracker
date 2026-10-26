import type React from 'react';

export const DEFAULT_CARD_PLACEHOLDER = '/card-placeholder.svg';

export function cardImageKey(setCode: string, collectorNumber: string, large = false): string {
  const dir = large ? 'card-images-lg' : 'card-images';
  return `${dir}/${setCode}/${collectorNumber}.webp`;
}

export function resolveCardImageUrl(
  setCode?: string | null,
  collectorNumber?: string | null,
  large = false
): string {
  if (!setCode || !collectorNumber) return DEFAULT_CARD_PLACEHOLDER;
  const key = cardImageKey(setCode, collectorNumber, large);
  return `/${key}`;
}

export function handleCardImageError(e: React.SyntheticEvent<HTMLImageElement, Event>) {
  const target = e.currentTarget;
  if (!target || target.src.includes('card-placeholder.svg')) return;
  target.src = DEFAULT_CARD_PLACEHOLDER;
}
