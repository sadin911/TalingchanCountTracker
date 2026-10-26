import type { TalingchanCard } from './card.ts';

export interface DeckCard extends Pick<TalingchanCard, 'id' | 'name' | 'setCode' | 'collectorNumber' | 'cardType' | 'color' | 'cost' | 'isOnlyOne' | 'isBiased'> {
  count: number;
}

export interface Deck {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  mainDeck: DeckCard[];
  lifeDeck: DeckCard[];
}

export interface ValidationResult {
  isValid: boolean;
  mainCount: number;
  lifeCount: number;
  errors: string[];
  warnings: string[];
}
