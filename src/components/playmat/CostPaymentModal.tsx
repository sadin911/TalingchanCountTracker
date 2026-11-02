import { useState } from 'react';
import { X, Flame, Sparkles, Shield, Hammer, Wand2, MapPin, Skull, Ban } from 'lucide-react';
import type { AvatarSlotState, PlaymatCardInstance } from '../../types/playmat.ts';
import { resolveCardImageUrl, handleCardImageError } from '../../utils/cardImage.ts';

interface CostPaymentModalProps {
  card: PlaymatCardInstance;
  otherHandCards: PlaymatCardInstance[];
  occupiedAvatarSlots: { index: number; slot: AvatarSlotState }[];
  onClose: () => void;
  onSummonAvatar: (costCardIds: string[]) => void;
  onBuildConstruct: (costCardIds: string[]) => void;
  onCastMagic: () => void;
  onPlayLandMagic: () => void;
  onAttachModification: (avatarSlotIndex: number) => void;
  onMoveToZone: (targetZone: 'HELL' | 'DARK' | 'DECK_TOP' | 'DECK_BOTTOM') => void;
}

export function CostPaymentModal({
  card,
  otherHandCards,
  occupiedAvatarSlots,
  onClose,
  onSummonAvatar,
  onBuildConstruct,
  onCastMagic,
  onPlayLandMagic,
  onAttachModification,
  onMoveToZone,
}: CostPaymentModalProps) {
  const [selectedCostIds, setSelectedCostIds] = useState<string[]>([]);
  const requiredCost = card.cost ?? 0;

  const selectedGemsTotal = otherHandCards
    .filter((c) => selectedCostIds.includes(c.instanceId))
    .reduce((sum, c) => sum + Math.max(1, c.gems ?? 1), 0);

  function toggleCostCard(instanceId: string) {
    setSelectedCostIds((prev) =>
      prev.includes(instanceId) ? prev.filter((id) => id !== instanceId) : [...prev, instanceId]
    );
  }

  const isAvatar = card.cardType === 'Avatar';
  const isConstruct = card.cardType === 'Construct';
  const isLand =
    card.cardType === 'Land Magic' ||
    card.effect.includes('Land Magic') ||
    card.symbol.includes('สนาม');

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#121522] border border-slate-700/90 rounded-2xl max-w-2xl w-full p-5 shadow-2xl space-y-4 my-auto"
        onClick={(e) => e.stopPropagation()}
        data-testid="cost-payment-modal"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <img
              src={resolveCardImageUrl(card)}
              onError={(e) => handleCardImageError(e, card.imageUrl, card)}
              alt={card.name}
              className="w-16 h-22 object-cover rounded-lg border border-slate-700 shrink-0"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded bg-rose-950/90 text-rose-300 border border-rose-500/40 font-bold">
                  {card.cardType}
                </span>
                <span className="text-xs font-mono text-slate-400">{card.id}</span>
                {card.cost !== null && (
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-950/90 text-amber-300 border border-amber-500/40 font-bold">
                    Cost: {card.cost}
                  </span>
                )}
                {card.power !== null && (
                  <span className="text-xs px-2 py-0.5 rounded bg-red-950/90 text-red-300 border border-red-500/40 font-bold">
                    POWER: {card.power}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-extrabold text-white mt-1">{card.name}</h3>
              {card.effect && (
                <p className="text-xs text-slate-300 mt-1 line-clamp-3 leading-relaxed">
                  {card.effect}
                </p>
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

        {/* Cost / Gem Payment Selector from Hand */}
        {(isAvatar || isConstruct || requiredCost > 0) && (
          <div className="bg-[#0b0d16] border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>
                  เลือกการ์ดบนมือทิ้งลงโซนนรกเพื่อจ่าย Cost (ต้องการ Cost: {requiredCost})
                </span>
              </div>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                  selectedGemsTotal >= requiredCost
                    ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/40'
                    : 'bg-amber-950/90 text-amber-300 border border-amber-500/40'
                }`}
              >
                เลือกแล้ว {selectedCostIds.length} ใบ (รวม ~{selectedGemsTotal} Gem)
              </span>
            </div>

            {otherHandCards.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">
                ไม่มีการ์ดใบอื่นบนมือให้ทิ้งจ่าย Cost (สามารถกดอัญเชิญฟรี/พิเศษได้ด้านล่าง)
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-44 overflow-y-auto pr-1">
                {otherHandCards.map((handCard) => {
                  const isSelected = selectedCostIds.includes(handCard.instanceId);
                  return (
                    <button
                      key={handCard.instanceId}
                      type="button"
                      onClick={() => toggleCostCard(handCard.instanceId)}
                      data-testid={`cost-card-${handCard.instanceId}`}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-rose-950/70 border-rose-400 ring-1 ring-rose-400 text-white'
                          : 'bg-[#141829] border-slate-800 hover:border-slate-600 text-slate-300'
                      }`}
                    >
                      <img
                        src={resolveCardImageUrl(handCard)}
                        onError={(e) => handleCardImageError(e, handCard.imageUrl, handCard)}
                        alt={handCard.name}
                        className="w-8 h-11 object-cover rounded shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-bold truncate">{handCard.name}</div>
                        <div className="text-[10px] text-amber-300 font-mono">
                          💎 Gem: {handCard.gems ?? 1}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Primary Play Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            data-testid="btn-confirm-summon-avatar"
            onClick={() => onSummonAvatar(selectedCostIds)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-950/50 transition-all cursor-pointer"
          >
            <Shield className="w-4 h-4" />
            <span>
              อัญเชิญลง Avatar Zone{' '}
              {selectedCostIds.length > 0 ? `(ทิ้ง ${selectedCostIds.length} ใบลงนรก)` : '(ไม่ทิ้งการ์ด)'}
            </span>
          </button>

          {selectedCostIds.length > 0 && (
            <button
              type="button"
              data-testid="btn-free-summon-avatar"
              onClick={() => onSummonAvatar([])}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600/80 hover:bg-amber-500 text-white font-bold text-xs transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>อัญเชิญพิเศษลง Avatar Zone (ข้ามจ่าย Cost)</span>
            </button>
          )}

          <button
            type="button"
            data-testid="btn-confirm-build-construct"
            onClick={() => onBuildConstruct(selectedCostIds)}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
              isConstruct
                ? 'bg-orange-600 hover:bg-orange-500 text-white border-orange-400'
                : 'bg-[#1a1f33] hover:bg-slate-800 text-orange-300 border-orange-500/30'
            }`}
          >
            <Hammer className="w-4 h-4" />
            <span>
              ก่อสร้างลง Construct Zone{' '}
              {selectedCostIds.length > 0 ? `(ทิ้ง ${selectedCostIds.length} ใบ)` : ''}
            </span>
          </button>

          <button
            type="button"
            data-testid="btn-cast-magic"
            onClick={onCastMagic}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-700/80 hover:bg-cyan-600 text-white font-bold text-xs border border-cyan-400/40 transition-all cursor-pointer"
          >
            <Wand2 className="w-4 h-4" />
            <span>ร่ายลง Magic Zone</span>
          </button>

          <button
            type="button"
            data-testid="btn-play-land-magic"
            onClick={onPlayLandMagic}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
              isLand
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400'
                : 'bg-[#1a1f33] hover:bg-slate-800 text-emerald-300 border-emerald-500/30'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>วางใน Land Magic Zone (สนามกลาง)</span>
          </button>
        </div>

        {/* Attach as Modification to an occupied Avatar slot */}
        {occupiedAvatarSlots.length > 0 && (
          <div className="border-t border-slate-800 pt-3 space-y-2">
            <div className="text-xs font-bold text-amber-300">
              🗡️ ติดตั้งเป็น Modification (เวทย์สวมใส่) ให้ Avatar บนสนาม:
            </div>
            <div className="flex flex-wrap gap-2">
              {occupiedAvatarSlots.map(({ index, slot }) => (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => onAttachModification(index)}
                  className="px-3 py-1.5 rounded-xl bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/40 text-xs font-semibold text-amber-200 cursor-pointer"
                >
                  ช่อง #{index + 1}: {slot.card.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Secondary Zone Movements from Hand */}
        <div className="border-t border-slate-800 pt-3 flex items-center justify-between flex-wrap gap-2">
          <span className="text-[11px] text-slate-400">ย้ายจากมือไปโซนอื่นโดยตรง:</span>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              data-testid="btn-hand-to-hell"
              onClick={() => onMoveToZone('HELL')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-950/70 hover:bg-purple-900 text-purple-300 border border-purple-500/40 text-xs font-semibold cursor-pointer"
            >
              <Skull className="w-3.5 h-3.5" /> ทิ้งลงโซนนรก
            </button>
            <button
              type="button"
              data-testid="btn-hand-to-dark"
              onClick={() => onMoveToZone('DARK')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 text-xs font-semibold cursor-pointer"
            >
              <Ban className="w-3.5 h-3.5" /> เนรเทศไปมิติมืด
            </button>
            <button
              type="button"
              onClick={() => onMoveToZone('DECK_TOP')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
            >
              วางบนสุดกอง
            </button>
            <button
              type="button"
              onClick={() => onMoveToZone('DECK_BOTTOM')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
            >
              วางใต้สุดกอง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

