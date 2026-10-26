import type { CardColor, CardType, Rarity, FinishKey } from '../types/card.ts';

export const CARD_COLORS: CardColor[] = [
  'RED',
  'BLUE',
  'GREEN',
  'BLACK',
  'WHITE',
  'YELLOW',
  'COLORLESS'
];

export const CARD_TYPES: CardType[] = [
  'Avatar',
  'Magic',
  'Land Magic',
  'Modification',
  'Life Card',
  'React Magic'
];

export const RARITIES: Rarity[] = [
  'Common',
  'Rare',
  'Super_rare',
  'Ultra_rare',
  'Secret_rare',
  'Promo'
];

export const COLOR_STYLES: Record<CardColor, { chip: string; activeChip: string; badge: string; text: string }> = {
  RED: {
    chip: 'border-red-500/40 text-red-400 hover:bg-red-950/30',
    activeChip: 'bg-red-600 text-white font-bold ring-2 ring-red-400',
    badge: 'bg-red-950/80 text-red-300 border-red-500/50',
    text: 'text-red-400'
  },
  BLUE: {
    chip: 'border-blue-500/40 text-blue-400 hover:bg-blue-950/30',
    activeChip: 'bg-blue-600 text-white font-bold ring-2 ring-blue-400',
    badge: 'bg-blue-950/80 text-blue-300 border-blue-500/50',
    text: 'text-blue-400'
  },
  GREEN: {
    chip: 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/30',
    activeChip: 'bg-emerald-600 text-white font-bold ring-2 ring-emerald-400',
    badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50',
    text: 'text-emerald-400'
  },
  BLACK: {
    chip: 'border-purple-500/40 text-purple-400 hover:bg-purple-950/30',
    activeChip: 'bg-purple-600 text-white font-bold ring-2 ring-purple-400',
    badge: 'bg-purple-950/80 text-purple-300 border-purple-500/50',
    text: 'text-purple-400'
  },
  WHITE: {
    chip: 'border-slate-300/40 text-slate-200 hover:bg-slate-800/40',
    activeChip: 'bg-slate-200 text-slate-900 font-bold ring-2 ring-white',
    badge: 'bg-slate-800 text-slate-200 border-slate-400',
    text: 'text-slate-200'
  },
  YELLOW: {
    chip: 'border-amber-400/40 text-amber-300 hover:bg-amber-950/30',
    activeChip: 'bg-amber-500 text-amber-950 font-bold ring-2 ring-amber-300',
    badge: 'bg-amber-950/80 text-amber-300 border-amber-400/50',
    text: 'text-amber-300'
  },
  COLORLESS: {
    chip: 'border-zinc-500/40 text-zinc-400 hover:bg-zinc-800/40',
    activeChip: 'bg-zinc-600 text-white font-bold ring-2 ring-zinc-400',
    badge: 'bg-zinc-800 text-zinc-300 border-zinc-500',
    text: 'text-zinc-400'
  }
};

export const FINISH_META: Record<FinishKey, { label: string; icon: string; badge: string }> = {
  normal: { label: 'Normal', icon: '▫️', badge: 'bg-slate-800 text-slate-300 border-slate-700' },
  foil: { label: 'Foil', icon: '✨', badge: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/20' },
  secret: { label: 'SCR', icon: '🔥', badge: 'bg-amber-950/80 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/30' }
};

export const TYPE_BADGES: Record<CardType, string> = {
  Avatar: 'bg-rose-950/80 text-rose-300 border-rose-500/40',
  Magic: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40',
  'Land Magic': 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
  Modification: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
  'Life Card': 'bg-pink-950/80 text-pink-300 border-pink-500/40',
  'React Magic': 'bg-violet-950/80 text-violet-300 border-violet-500/40'
};
