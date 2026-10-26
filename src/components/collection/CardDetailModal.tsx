import { useEffect } from 'react';
import { X, Layers, Heart, Sparkles, AlertTriangle } from 'lucide-react';
import type { TalingchanCard } from '../../types/card.ts';
import { rarityLabel } from '../../types/card.ts';
import { COLOR_STYLES, TYPE_BADGES } from '../../constants/botc.ts';
import { resolveCardImageUrl, handleCardImageError } from '../../utils/cardImage.ts';
import { useDeckStore } from '../../store/deckStore.ts';
import { useCollectionStore } from '../../store/collectionStore.ts';

interface CardDetailModalProps {
  card: TalingchanCard | null;
  onClose: () => void;
}

export function CardDetailModal({ card, onClose }: CardDetailModalProps) {
  const activeDeckId = useDeckStore((s) => s.activeDeckId);
  const activeDeck = useDeckStore((s) => s.decks.find((d) => d.id === activeDeckId));
  const addCardToMain = useDeckStore((s) => s.addCardToMain);
  const addCardToLife = useDeckStore((s) => s.addCardToLife);
  const getCardTotal = useCollectionStore((s) => s.getCardTotal);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!card) return null;

  const colorStyle = COLOR_STYLES[card.color] || COLOR_STYLES.COLORLESS;
  const typeBadge = TYPE_BADGES[card.cardType] || 'bg-slate-800 text-slate-300';
  const totalOwned = getCardTotal(card.id);

  const mainCountInActiveDeck = activeDeck?.mainDeck.find((c) => c.id === card.id)?.count || 0;
  const lifeCountInActiveDeck = activeDeck?.lifeDeck.find((c) => c.id === card.id)?.count || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      {/* Modal Dialog */}
      <div
        className="relative w-full max-w-2xl bg-[#121522] border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center border border-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Card Artwork Column */}
        <div className="w-full md:w-5/12 bg-[#181c2e] p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-800">
          <div className="relative aspect-[3/4] w-48 md:w-full rounded-xl overflow-hidden shadow-2xl border border-slate-700/60">
            <img
              src={resolveCardImageUrl(card.setCode, card.collectorNumber, true)}
              alt={card.name}
              onError={handleCardImageError}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
            <span>ภาพโดย:</span>
            <span className="font-semibold text-slate-200">{card.illustrator || 'PASULOL'}</span>
          </div>
        </div>

        {/* Card Details Column */}
        <div className="w-full md:w-7/12 p-6 overflow-y-auto space-y-4">
          <div>
            {/* Header tags */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-md font-bold border ${colorStyle.badge}`}>
                {card.color}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-md font-medium border ${typeBadge}`}>
                {card.cardType}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700">
                {rarityLabel(card.rarity)}
              </span>
              <span className="text-xs text-slate-500 font-mono">ซอย {card.soi}</span>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-slate-100 font-['Prompt']">{card.name}</h2>
            <div className="text-xs text-slate-400 font-mono">
              {card.id} • {card.setName}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2 bg-[#181c2e] p-3 rounded-xl border border-slate-800">
            <div className="text-center">
              <div className="text-[10px] text-slate-400 font-medium">ค่าร่าย (Cost)</div>
              <div className="text-lg font-bold text-amber-400">{card.cost ?? '-'}</div>
            </div>
            <div className="text-center border-x border-slate-800">
              <div className="text-[10px] text-slate-400 font-medium">พลัง (Power)</div>
              <div className="text-lg font-bold text-rose-400">{card.power ?? '-'}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-slate-400 font-medium">สัญลักษณ์ (Tribe)</div>
              <div className="text-sm font-bold text-slate-200 truncate mt-1">{card.symbol || '-'}</div>
            </div>
          </div>

          {/* Special Traits Alerts */}
          {card.isOnlyOne && (
            <div className="flex items-center gap-2 bg-amber-950/40 border border-amber-500/40 p-2.5 rounded-xl text-amber-300 text-xs">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>การ์ดระดับ <strong>Only 1</strong> — สามารถใส่ในเด็คหลักได้สูงสุดเพียง 1 ใบเท่านั้น</span>
            </div>
          )}

          {card.isBiased && (
            <div className="flex items-center gap-2 bg-rose-950/40 border border-rose-500/40 p-2.5 rounded-xl text-rose-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>การ์ดสัญลักษณ์ <strong>ลำเอียง</strong> — ไม่อนุญาตให้นำมาใช้ในการแข่งขันทางการ</span>
            </div>
          )}

          {/* Card Effect Text */}
          <div className="bg-[#181c2e] p-3.5 rounded-xl border border-slate-800 space-y-1">
            <div className="text-xs font-semibold text-slate-300">ความสามารถการ์ด (Effect):</div>
            <p className="text-sm text-slate-200 leading-relaxed font-['Prompt'] whitespace-pre-wrap">
              {card.effect || 'ไม่มีคำอธิบายความสามารถพิเศษ'}
            </p>
          </div>

          {/* Collection Status */}
          <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400">ครอบครองในคลัง:</span>
            <span className="font-bold text-slate-100">{totalOwned} ใบ</span>
          </div>

          {/* Deck Action Buttons */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            {activeDeck ? (
              <div className="flex gap-2">
                <button
                  onClick={() => addCardToMain(activeDeck.id, card)}
                  disabled={mainCountInActiveDeck >= 4}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow-lg shadow-rose-600/30 transition-all disabled:opacity-40 disabled:pointer-events-none"
                >
                  <Layers className="w-3.5 h-3.5" />
                  + ใส่ Main Deck ({mainCountInActiveDeck}/4)
                </button>

                <button
                  onClick={() => addCardToLife(activeDeck.id, card)}
                  disabled={lifeCountInActiveDeck >= 1}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-pink-600/80 hover:bg-pink-500 text-white font-medium text-xs border border-pink-500/40 shadow-lg shadow-pink-600/20 transition-all disabled:opacity-40 disabled:pointer-events-none"
                >
                  <Heart className="w-3.5 h-3.5" />
                  + ใส่ Life ({lifeCountInActiveDeck}/1)
                </button>
              </div>
            ) : (
              <div className="text-center text-xs text-slate-500 py-1">
                (ยังไม่ได้เลือกเด็คที่ใช้งานอยู่ สามารถไปที่แท็บ 'จัดเด็ค' เพื่อสร้างเด็ค)
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
