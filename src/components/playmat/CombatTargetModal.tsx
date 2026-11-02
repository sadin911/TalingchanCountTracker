import { X, Swords, Heart, RotateCw, Skull, Ban, Undo2, AlertTriangle } from 'lucide-react';
import type { AvatarSlotState, PlaymatCardInstance } from '../../types/playmat.ts';
import { getEffectiveAvatarPower } from '../../utils/talingchanTabletopHelper.ts';
import { resolveCardImageUrl, handleCardImageError } from '../../utils/cardImage.ts';

interface CombatTargetModalProps {
  slotIndex: number;
  slot: AvatarSlotState;
  opponentAvatars: { index: number; slot: AvatarSlotState }[];
  opponentLifeCards: PlaymatCardInstance[];
  isFirstTurnFirstPlayer: boolean;
  onClose: () => void;
  onAdjustPower: (delta: number) => void;
  onToggleRest: () => void;
  onAttackAvatar: (defenderSlotIndex: number) => void;
  onAttackLife: (lifeIndex: number, effect: 'FLIP' | 'DESTROY') => void;
  onMoveAvatar: (destination: 'HELL' | 'DARK' | 'HAND' | 'DECK_TOP' | 'DECK_BOTTOM') => void;
}

export function CombatTargetModal({
  slotIndex,
  slot,
  opponentAvatars,
  opponentLifeCards,
  isFirstTurnFirstPlayer,
  onClose,
  onAdjustPower,
  onToggleRest,
  onAttackAvatar,
  onAttackLife,
  onMoveAvatar,
}: CombatTargetModalProps) {
  const effectivePower = getEffectiveAvatarPower(slot);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#121522] border border-slate-700/90 rounded-2xl max-w-2xl w-full p-5 shadow-2xl space-y-4 my-auto"
        onClick={(e) => e.stopPropagation()}
        data-testid="combat-target-modal"
      >
        {/* Header: Active Avatar Info */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <img
              src={resolveCardImageUrl(slot.card)}
              onError={(e) => handleCardImageError(e, slot.card.imageUrl, slot.card)}
              alt={slot.card.name}
              className="w-16 h-22 object-cover rounded-lg border border-slate-700 shrink-0"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded bg-rose-950/90 text-rose-300 border border-rose-500/40 font-bold">
                  Avatar ช่อง #{slotIndex + 1}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded bg-red-600 text-white font-extrabold">
                  POWER ปัจจุบัน: {effectivePower}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded font-bold ${
                    slot.isRested
                      ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {slot.isRested ? '🔄 ตะแคง (Rest)' : '⬆️ ตั้งพร้อมสู้ (Stand)'}
                </span>
              </div>
              <h3 className="text-lg font-extrabold text-white mt-1">{slot.card.name}</h3>
              {slot.card.effect && (
                <p className="text-xs text-slate-300 mt-1 line-clamp-2">{slot.card.effect}</p>
              )}
              {slot.attachedModifications.length > 0 && (
                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-amber-300 font-semibold">เวทย์สวมใส่:</span>
                  {slot.attachedModifications.map((mod) => (
                    <span
                      key={mod.instanceId}
                      className="text-[10px] px-2 py-0.5 rounded bg-amber-950/80 text-amber-200 border border-amber-500/40"
                    >
                      {mod.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* POWER Adjuster & Stand/Rest Toggle */}
        <div className="bg-[#0b0d16] border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-300 mr-1">ปรับ POWER:</span>
            {[-2, -1, 1, 2, 3].map((delta) => (
              <button
                key={delta}
                type="button"
                data-testid={`btn-power-delta-${delta}`}
                onClick={() => onAdjustPower(delta)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer border ${
                  delta > 0
                    ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-500/40'
                    : 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border-rose-500/40'
                }`}
              >
                {delta > 0 ? `+${delta}` : delta}
              </button>
            ))}
            {slot.powerModifier !== 0 && (
              <button
                type="button"
                onClick={() => onAdjustPower(-slot.powerModifier)}
                className="px-2 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                รีเซ็ต ({slot.card.power ?? 0})
              </button>
            )}
          </div>

          <button
            type="button"
            data-testid="btn-toggle-rest"
            onClick={onToggleRest}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 text-xs font-bold cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>{slot.isRested ? 'จับตั้งการ์ด (Stand)' : 'ตะแคงการ์ด (Rest)'}</span>
          </button>
        </div>

        {/* First Turn Rule Notice */}
        {isFirstTurnFirstPlayer && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              หมายเหตุตามกติกา: ผู้เล่นที่เริ่มเล่นคนแรกในเทิร์นที่ 1 จะยังไม่สามารถสั่งโจมตีได้
            </span>
          </div>
        )}

        {/* 1. Attack Enemy Avatars */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
            <Swords className="w-4 h-4" />
            <span>สั่งโจมตี Avatar ของฝ่ายตรงข้าม (เทียบค่า POWER อัตโนมัติ):</span>
          </div>

          {opponentAvatars.length === 0 ? (
            <p className="text-xs text-slate-500 bg-[#0b0d16] p-2.5 rounded-xl border border-slate-800/80">
              ฝ่ายตรงข้ามไม่มี Avatar บนสนาม — สามารถสั่งโจมตี Life Card ได้โดยตรง!
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {opponentAvatars.map(({ index: defIdx, slot: defSlot }) => {
                const defPower = getEffectiveAvatarPower(defSlot);
                const outcome =
                  effectivePower > defPower
                    ? { text: 'ชนะ (ทำลายศัตรู)', cls: 'text-emerald-400' }
                    : effectivePower === defPower
                    ? { text: 'เสมอ (ตกนรกทั้งคู่)', cls: 'text-amber-300' }
                    : { text: 'แพ้ (เราตกนรก)', cls: 'text-rose-400' };

                return (
                  <button
                    key={defSlot.id}
                    type="button"
                    data-testid={`btn-attack-avatar-${defIdx}`}
                    onClick={() => onAttackAvatar(defIdx)}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#161a2c] hover:bg-rose-950/50 border border-slate-700 hover:border-rose-500/60 text-left transition-all cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">
                        #{defIdx + 1} {defSlot.card.name}
                      </div>
                      <div className={`text-[11px] font-semibold ${outcome.cls}`}>
                        POWER {effectivePower} vs {defPower} → {outcome.text}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold shrink-0">
                      ⚔️ โจมตี
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Attack Enemy Life Cards */}
        <div className="space-y-2 border-t border-slate-800 pt-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-xs font-bold text-pink-400 flex items-center gap-1.5">
              <Heart className="w-4 h-4" />
              <span>สั่งโจมตี Life Card ฝ่ายตรงข้าม (เหลือ {opponentLifeCards.length} ใบ):</span>
            </div>
            {opponentAvatars.length > 0 && (
              <span className="text-[11px] text-amber-300">
                ⚠️ กติกาปกติ: ต้องทำลาย Avatar ศัตรูให้หมดก่อนตี Life (ยกเว้นมีเอฟเฟกต์ตีข้าม)
              </span>
            )}
          </div>

          {opponentLifeCards.length === 0 ? (
            <p className="text-xs text-emerald-400 font-bold">
              ฝ่ายตรงข้ามไม่เหลือ Life Card แล้ว!
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {opponentLifeCards.map((life, idx) => (
                <div
                  key={life.instanceId}
                  className="bg-[#0b0d16] border border-slate-800 rounded-xl p-2 flex flex-col items-center gap-1.5"
                >
                  <span className="text-[11px] font-bold text-slate-300">
                    Life #{idx + 1} {life.isFaceDown ? '(คว่ำ)' : `(${life.name})`}
                  </span>
                  <div className="flex items-center gap-1 w-full">
                    <button
                      type="button"
                      data-testid={`btn-attack-life-destroy-${idx}`}
                      onClick={() => onAttackLife(idx, 'DESTROY')}
                      className="flex-1 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold cursor-pointer"
                    >
                      ทำลาย
                    </button>
                    <button
                      type="button"
                      data-testid={`btn-attack-life-flip-${idx}`}
                      onClick={() => onAttackLife(idx, 'FLIP')}
                      className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-bold cursor-pointer"
                    >
                      หงาย
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. Move Avatar to Another Zone */}
        <div className="border-t border-slate-800 pt-3 flex items-center justify-between flex-wrap gap-2">
          <span className="text-[11px] text-slate-400">ย้าย Avatar ใบนี้ไปโซนอื่น:</span>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              data-testid="btn-avatar-to-hell"
              onClick={() => onMoveAvatar('HELL')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-950/70 hover:bg-purple-900 text-purple-300 border border-purple-500/40 text-xs font-semibold cursor-pointer"
            >
              <Skull className="w-3.5 h-3.5" /> ส่งลงโซนนรก
            </button>
            <button
              type="button"
              onClick={() => onMoveAvatar('DARK')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 text-xs font-semibold cursor-pointer"
            >
              <Ban className="w-3.5 h-3.5" /> เนรเทศไปมิติมืด
            </button>
            <button
              type="button"
              onClick={() => onMoveAvatar('HAND')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" /> ยกกลับขึ้นมือ
            </button>
            <button
              type="button"
              onClick={() => onMoveAvatar('DECK_BOTTOM')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
            >
              กลับใต้กอง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

