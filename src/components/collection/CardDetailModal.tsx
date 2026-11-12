import { useEffect, useState } from 'react';
import { X, Layers, Heart, Sparkles, AlertTriangle, Laugh, Quote, ZoomIn, ZoomOut } from 'lucide-react';
import type { TalingchanCard } from '../../types/card.ts';
import { rarityLabel } from '../../types/card.ts';
import { COLOR_STYLES, TYPE_BADGES } from '../../constants/botc.ts';
import { resolveCardImageUrl, handleCardImageError, cardImageKey } from '../../utils/cardImage.ts';
import { useDeckStore } from '../../store/deckStore.ts';
import { useCollectionStore } from '../../store/collectionStore.ts';

interface CardDetailModalProps {
  card: TalingchanCard | null;
  onClose: () => void;
}

export function CardDetailModal({ card, onClose }: CardDetailModalProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const activeDeckId = useDeckStore((s) => s.activeDeckId);
  const activeDeck = useDeckStore((s) => s.decks.find((d) => d.id === activeDeckId));
  const addCardToMain = useDeckStore((s) => s.addCardToMain);
  const addCardToLife = useDeckStore((s) => s.addCardToLife);
  const getCardTotal = useCollectionStore((s) => s.getCardTotal);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (isZoomed) {
          setIsZoomed(false);
        } else {
          onClose();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isZoomed]);

  if (!card) return null;

  const colorStyle = COLOR_STYLES[card.color] || COLOR_STYLES.COLORLESS;
  const typeBadge = TYPE_BADGES[card.cardType] || 'bg-slate-800 text-slate-300';
  const totalOwned = getCardTotal(card.id);

  const mainCountInActiveDeck = activeDeck?.mainDeck.find((c) => c.id === card.id)?.count || 0;
  const lifeCountInActiveDeck = activeDeck?.lifeDeck.find((c) => c.id === card.id)?.count || 0;

  // Prefer local high-res asset in DEV mode if available, otherwise R2 CDN
  const detailImageSrc =
    import.meta.env.DEV && card.setCode && card.collectorNumber
      ? `/${cardImageKey(card.setCode, card.collectorNumber)}`
      : resolveCardImageUrl(card, false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      {/* Modal Dialog */}
      <div
        className="relative w-full max-w-4xl bg-[#121522] border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="ปิดหน้าต่างรายละเอียดการ์ด"
          className="absolute top-3.5 right-3.5 z-20 w-9 h-9 rounded-full bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center border border-slate-700 transition-colors shadow-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Card Artwork Column */}
        <div className="w-full md:w-[46%] lg:w-[48%] bg-gradient-to-b from-[#1a1f35] to-[#131726] p-4 sm:p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-800/90 shrink-0">
          <div
            onClick={() => setIsZoomed(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsZoomed(true);
              }
            }}
            data-testid="card-detail-artwork-trigger"
            className="group relative aspect-[388/528] w-64 sm:w-72 md:w-full max-w-[360px] rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.75)] border border-slate-700/70 bg-slate-950/60 cursor-zoom-in transition-transform duration-200 hover:scale-[1.02]"
          >
            <img
              src={detailImageSrc}
              alt={card.name}
              onError={(e) => handleCardImageError(e, card.imageUrl, card)}
              className="w-full h-full object-contain select-none"
            />
            <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-full bg-slate-950/85 border border-slate-700/80 text-[11px] font-medium text-slate-200 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 group-hover:bg-rose-600/90 group-hover:border-rose-400/60 transition-all shadow-lg">
              <ZoomIn className="w-3.5 h-3.5" />
              <span>ขยายเต็มจอ</span>
            </div>
          </div>

          <div className="mt-3.5 flex items-center justify-between w-full max-w-[360px] px-1 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <span>ภาพโดย:</span>
              <span className="font-semibold text-slate-200">{card.illustrator || 'PASULOL'}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsZoomed(true)}
              className="text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1 transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
              <span>ดูภาพขนาดใหญ่</span>
            </button>
          </div>
        </div>

        {/* Card Details Column */}
        <div className="w-full md:w-[54%] lg:w-[52%] p-5 sm:p-6 overflow-y-auto space-y-4">
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

          {card.isCollab && (
            <div className="flex items-center gap-2 bg-fuchsia-950/40 border border-fuchsia-500/40 p-2.5 rounded-xl text-fuchsia-300 text-xs">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>การ์ดสัญลักษณ์ <strong>โดนใจ</strong> — การ์ดคอลแลบส์พิเศษกับครีเอเตอร์และมีมดัง</span>
            </div>
          )}

          {/* Card Effect Text */}
          <div className="bg-[#181c2e] p-3.5 rounded-xl border border-slate-800 space-y-1">
            <div className="text-xs font-semibold text-slate-300">ความสามารถการ์ด (Effect):</div>
            <p className="text-sm text-slate-200 leading-relaxed font-['Prompt'] whitespace-pre-wrap">
              {card.effect || 'ไม่มีคำอธิบายความสามารถพิเศษ'}
            </p>
          </div>

          {/* Meme / Parody / Lore Explanation */}
          {card.memeLore && (
            <div
              data-testid="card-detail-meme-lore"
              className="bg-gradient-to-br from-amber-950/45 via-[#1b192b] to-rose-950/35 p-3.5 rounded-xl border border-amber-500/35 space-y-1.5"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                <Laugh className="w-4 h-4 shrink-0 text-amber-400" />
                <span>ที่มามีม / ล้อเลียนอะไร & เกร็ดการ์ด:</span>
              </div>
              <p className="text-xs text-amber-100/90 leading-relaxed font-['Prompt'] whitespace-pre-wrap">
                {card.memeLore}
              </p>
            </div>
          )}

          {/* Flavor Quote Box */}
          {card.flavorText && card.flavorText !== card.effect && (
            <div
              data-testid="card-detail-flavor-text"
              className="bg-slate-900/75 p-3 rounded-xl border border-slate-700/70 flex items-start gap-2.5"
            >
              <Quote className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <p className="text-xs italic text-slate-300 leading-relaxed font-['Prompt'] whitespace-pre-wrap">
                {card.flavorText}
              </p>
            </div>
          )}

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

      {/* Full-Screen High-Res Card Lightbox */}
      {isZoomed && (
        <div
          data-testid="card-detail-lightbox"
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-fadeIn cursor-zoom-out"
          onClick={(e) => {
            e.stopPropagation();
            setIsZoomed(false);
          }}
        >
          <button
            type="button"
            onClick={() => setIsZoomed(false)}
            aria-label="ปิดโหมดขยายภาพการ์ด"
            className="absolute top-4 right-4 z-10 px-3.5 py-2 rounded-full bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white flex items-center gap-1.5 border border-slate-700 text-xs font-medium shadow-xl transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
            <span>ย่อกลับ (ESC)</span>
          </button>

          <img
            src={detailImageSrc}
            alt={card.name}
            onError={(e) => handleCardImageError(e, card.imageUrl, card)}
            className="max-h-[88vh] max-w-[94vw] w-auto h-auto object-contain rounded-2xl shadow-[0_25px_70px_rgba(0,0,0,0.9)] border border-slate-700/70 select-none"
          />

          <div className="mt-3 text-center">
            <div className="text-sm font-bold text-slate-100 font-['Prompt']">{card.name}</div>
            <div className="text-xs text-slate-400 font-mono">
              {card.id} • {card.setName}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
