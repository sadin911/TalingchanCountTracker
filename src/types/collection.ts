import type { FinishKey } from './card.ts';

export type CardFinishesCount = Record<FinishKey, number>;

export interface SetProgress {
  setCode: string;
  totalCards: number;
  uniqueOwned: number;
  totalOwned: number;
  percentage: number;
}
