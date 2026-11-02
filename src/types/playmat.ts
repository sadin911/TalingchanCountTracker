import type { TalingchanCard } from './card.ts';

export type PlayerSide = 'player1' | 'player2';

export type TurnPhase = 'DRAW' | 'MAIN' | 'ATTACK' | 'END';

export type PlaymatZoneName =
  | 'DECK'
  | 'HAND'
  | 'AVATAR'
  | 'CONSTRUCT'
  | 'MAGIC'
  | 'LIFE'
  | 'GEM'
  | 'HELL'
  | 'DARK'
  | 'LAND';

export interface PlaymatCardInstance extends TalingchanCard {
  instanceId: string;
  owner: PlayerSide;
  isFaceDown?: boolean;
}

export interface AvatarSlotState {
  id: string;
  card: PlaymatCardInstance;
  powerModifier: number;
  isRested: boolean;
  attachedModifications: PlaymatCardInstance[];
  note?: string;
}

export interface ConstructSlotState {
  id: string;
  card: PlaymatCardInstance;
  isRested?: boolean;
}

export interface LandMagicState {
  card: PlaymatCardInstance;
  owner: PlayerSide;
}

export interface PlayerBoardState {
  id: PlayerSide;
  name: string;
  deckName: string;
  deck: PlaymatCardInstance[];
  hand: PlaymatCardInstance[];
  lifeZone: PlaymatCardInstance[];
  avatarZoneLimit: number; // Default 4, expandable 4..8
  avatarZone: (AvatarSlotState | null)[];
  constructZone: (ConstructSlotState | null)[]; // Fixed 3 slots
  magicZone: PlaymatCardInstance[];
  gemZone: PlaymatCardInstance[]; // ช่องวาง Gem (Cost staging / Gem Zone)
  hellZone: PlaymatCardInstance[]; // โซนนรก (Graveyard)
  darkZone: PlaymatCardInstance[]; // โซนมิติมืด (Banished)
}

export interface PlaymatState {
  player1: PlayerBoardState;
  player2: PlayerBoardState;
  landMagicZone: LandMagicState | null;
  currentTurn: PlayerSide;
  firstPlayer: PlayerSide;
  turnNumber: number;
  phase: TurnPhase;
  perspective: PlayerSide;
  soloRevealAllHands: boolean;
  isGameStarted: boolean;
  lastCoinFlip: 'HEADS' | 'TAILS' | null;
  actionLog: string[];
  winner: { side: PlayerSide; reason: string } | null;
}

