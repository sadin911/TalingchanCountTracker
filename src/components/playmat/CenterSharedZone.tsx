import {
  MapPin,
  RotateCcw,
  RotateCw,
  SkipForward,
  Coins,
  Eye,
  EyeOff,
  ArrowLeftRight,
  Zap,
  RefreshCw,
  Layers,
  Trash2,
  Sparkles,
} from 'lucide-react';
import type {
  LandMagicState,
  PlayerSide,
  PlaymatCardInstance,
  TurnPhase,
} from '../../types/playmat.ts';
import { resolveCardImageUrl, handleCardImageError } from '../../utils/cardImage.ts';

interface CenterSharedZoneProps {
  currentTurn: PlayerSide;
  turnNumber: number;
  phase: TurnPhase;
  perspective: PlayerSide;
  soloRevealAllHands: boolean;
  autoSwapOnPass: boolean;
  landMagicZone: LandMagicState | null;
  lastCoinFlip: 'HEADS' | 'TAILS' | null;
  canUndo: boolean;
  canRedo: boolean;
  p1HandCount: number;
  p2HandCount: number;
  isLandHighlight?: boolean;
  onSetPhase: (phase: TurnPhase) => void;
  onPassTurn: () => void;
  onSwapPerspective: (target?: PlayerSide) => void;
  onToggleRevealAllHands: () => void;
  onToggleAutoSwap: () => void;
  onFlipCoin: () => void;
  onClearLandMagic: () => void;
  onClickLandMagicSlot?: () => void;
  onDropOnLandMagicSlot?: (e: React.DragEvent) => void;
  onInspectCard?: (card: PlaymatCardInstance) => void;
  onUndo: () => void;
  onRedo: () => void;
  onResetGame: () => void;
  onOpenDeckSelector: () => void;
}

const PHASES: { key: TurnPhase; label: string }[] = [
  { key: 'DRAW', label: '1.Draw' },
  { key: 'MAIN', label: '2.Main' },
  { key: 'ATTACK', label: '3.Attack' },
  { key: 'END', label: '4.End' },
];

export function CenterSharedZone({
  currentTurn,
  turnNumber,
  phase,
  perspective,
  soloRevealAllHands,
  autoSwapOnPass,
  landMagicZone,
  lastCoinFlip,
  canUndo,
  canRedo,
  p1HandCount,
  p2HandCount,
  isLandHighlight = false,
  onSetPhase,
  onPassTurn,
  onSwapPerspective,
  onToggleRevealAllHands,
  onToggleAutoSwap,
  onFlipCoin,
  onClearLandMagic,
  onClickLandMagicSlot,
  onDropOnLandMagicSlot,
  onInspectCard,
  onUndo,
  onRedo,
  onResetGame,
  onOpenDeckSelector,
}: CenterSharedZoneProps) {
  return (
    <div
      className="relative w-full flex items-center justify-between gap-2 px-3 py-1 bg-slate-950/90 border-y border-slate-800/90 shadow-inner z-20 shrink-0"
      data-testid="center-shared-zone"
    >
      {/* Decorative glowing center line */}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-transparent via-rose-500/35 to-transparent" />

      {/* Left: Shared Land Magic Slot + Turn & Phase Stepper */}
      <div className="relative z-10 flex items-center gap-2 flex-wrap">
        {/* Shared Land Magic Slot */}
        <div
          data-testid="land-magic-slot"
          onClick={onClickLandMagicSlot}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDropOnLandMagicSlot}
          className={`flex items-center gap-2 rounded-xl px-2.5 py-1 border transition-all cursor-pointer select-none ${
            isLandHighlight
              ? 'bg-emerald-950/90 border-emerald-400 ring-2 ring-emerald-400/70 animate-pulse shadow-lg shadow-emerald-500/20'
              : landMagicZone
              ? 'bg-emerald-950/60 border-emerald-500/50 hover:border-emerald-400'
              : 'bg-slate-900/90 border-dashed border-slate-700 hover:border-emerald-500/50'
          }`}
          title="Land Magic Zone (คลิกหรือลากการ์ดเวทย์สนามมาวางที่นี่)"
        >
          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          {landMagicZone ? (
            <div className="flex items-center gap-1.5">
              <img
                src={resolveCardImageUrl(landMagicZone.card)}
                onError={(e) =>
                  handleCardImageError(e, landMagicZone.card.imageUrl, landMagicZone.card)
                }
                alt={landMagicZone.card.name}
                onClick={(e) => {
                  e.stopPropagation();
                  onInspectCard?.(landMagicZone.card);
                }}
                className="w-5 h-7 object-cover rounded border border-emerald-400/60 shrink-0"
              />
              <div className="leading-tight">
                <div className="text-[9px] text-emerald-300 font-bold">
                  Land ({landMagicZone.owner === 'player1' ? 'P1' : 'P2'})
                </div>
                <div className="text-[11px] font-extrabold text-white max-w-[110px] truncate">
                  {landMagicZone.card.name}
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClearLandMagic();
                }}
                title="ทำลาย Land Magic ลงนรก"
                className="p-1 rounded bg-rose-950/80 hover:bg-rose-800 text-rose-300 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="font-extrabold text-emerald-400">Land Magic</span>
              <span className="text-slate-400">
                {isLandHighlight ? (
                  <span className="text-emerald-200 font-bold flex items-center gap-0.5">
                    <Sparkles className="w-3 h-3" /> คลิกเพื่อวาง!
                  </span>
                ) : (
                  '(ว่าง)'
                )}
              </span>
            </div>
          )}
        </div>

        {/* Turn Indicator */}
        <div
          data-testid="turn-indicator"
          className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold border flex items-center gap-1.5 ${
            currentTurn === 'player1'
              ? 'bg-blue-950/90 border-blue-400/60 text-blue-200'
              : 'bg-rose-950/90 border-rose-400/60 text-rose-200'
          }`}
        >
          <span>{currentTurn === 'player1' ? '🔵 เทิร์น P1' : '🔴 เทิร์น P2'}</span>
          <span className="px-1.5 py-0.2 rounded bg-black/50 font-mono text-[10px]">
            T{turnNumber}
          </span>
        </div>

        {/* Phase Stepper */}
        <div className="flex items-center gap-0.5 bg-slate-900/90 p-0.5 rounded-xl border border-slate-800">
          {PHASES.map((p) => (
            <button
              key={p.key}
              type="button"
              data-testid={`btn-phase-${p.key}`}
              onClick={() => onSetPhase(p.key)}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                phase === p.key
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right: Quick Solo Controls, Perspective Switcher, Coin, Undo/Redo, Pass Turn */}
      <div className="relative z-10 flex items-center gap-1 flex-wrap justify-end">
        {/* P1 / P2 Hand Switcher */}
        <button
          type="button"
          data-testid="btn-perspective-p1"
          onClick={() => onSwapPerspective('player1')}
          className={`px-2 py-1 rounded-lg text-[10px] font-extrabold border transition-all cursor-pointer ${
            perspective === 'player1'
              ? 'bg-blue-600 text-white border-blue-400 shadow'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          🔵 มือ P1 ({p1HandCount})
        </button>

        <button
          type="button"
          data-testid="btn-perspective-p2"
          onClick={() => onSwapPerspective('player2')}
          className={`px-2 py-1 rounded-lg text-[10px] font-extrabold border transition-all cursor-pointer ${
            perspective === 'player2'
              ? 'bg-rose-600 text-white border-rose-400 shadow'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          🔴 มือ P2 ({p2HandCount})
        </button>

        <button
          type="button"
          data-testid="btn-swap-perspective"
          onClick={() => onSwapPerspective()}
          title="สลับฝั่งมือ P1 / P2 (ปุ่มลัด: Tab)"
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-[10px] font-bold cursor-pointer"
        >
          <ArrowLeftRight className="w-3 h-3" />
          <span className="hidden xl:inline">สลับมือ</span>
        </button>

        <button
          type="button"
          data-testid="btn-toggle-reveal-hands"
          onClick={onToggleRevealAllHands}
          title="โหมดซ้อม: แสดงการ์ดบนมือของคู่ซ้อมด้านบนสุดของจอ"
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${
            soloRevealAllHands
              ? 'bg-amber-950/90 border-amber-400 text-amber-200'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          {soloRevealAllHands ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          <span className="hidden md:inline">
            {soloRevealAllHands ? 'เปิดดูมือทั้งคู่' : 'ซ่อนมืออีกฝั่ง'}
          </span>
        </button>

        <button
          type="button"
          data-testid="btn-toggle-auto-swap"
          onClick={onToggleAutoSwap}
          title="สลับมุมมองมือให้อัตโนมัติเมื่อกดจบเทิร์น"
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${
            autoSwapOnPass
              ? 'bg-emerald-950/90 border-emerald-400/70 text-emerald-300'
              : 'bg-slate-900 border-slate-800 text-slate-400'
          }`}
        >
          <Zap className="w-3 h-3" />
          <span className="hidden xl:inline">
            {autoSwapOnPass ? 'สลับออโต้' : 'ไม่สลับออโต้'}
          </span>
        </button>

        {/* Coin Flip */}
        <button
          type="button"
          data-testid="btn-flip-coin"
          onClick={onFlipCoin}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-bold text-amber-300 cursor-pointer"
        >
          <Coins className="w-3 h-3" />
          <span>
            {lastCoinFlip ? (lastCoinFlip === 'HEADS' ? 'หัว!' : 'ก้อย!') : 'เหรียญ'}
          </span>
        </button>

        {/* Undo / Redo */}
        <button
          type="button"
          data-testid="btn-undo"
          onClick={onUndo}
          disabled={!canUndo}
          title="ย้อนกลับ (Ctrl+Z)"
          className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-35 border border-slate-800 text-slate-200 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          data-testid="btn-redo"
          onClick={onRedo}
          disabled={!canRedo}
          title="ทำซ้ำ (Ctrl+Y)"
          className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-35 border border-slate-800 text-slate-200 cursor-pointer"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        {/* Select Decks & Reset */}
        <button
          type="button"
          data-testid="btn-open-deck-selector"
          onClick={onOpenDeckSelector}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-bold text-slate-200 cursor-pointer"
        >
          <Layers className="w-3 h-3 text-rose-400" />
          <span>เลือกเด็ค</span>
        </button>

        <button
          type="button"
          data-testid="btn-reset-game"
          onClick={onResetGame}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-bold text-slate-200 cursor-pointer"
          title="สับเด็คและเริ่มเกมใหม่"
        >
          <RefreshCw className="w-3 h-3 text-amber-400" />
          <span className="hidden lg:inline">เริ่มใหม่</span>
        </button>

        {/* Pass Turn */}
        <button
          type="button"
          data-testid="btn-pass-turn"
          onClick={onPassTurn}
          className="flex items-center gap-1 px-3 py-1 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-[11px] font-extrabold shadow-md shadow-rose-950/60 cursor-pointer"
        >
          <SkipForward className="w-3.5 h-3.5" />
          <span>จบเทิร์น</span>
        </button>
      </div>
    </div>
  );
}
