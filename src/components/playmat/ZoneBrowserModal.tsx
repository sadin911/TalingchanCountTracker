import { useState } from 'react';
import { X, Search, Shuffle } from 'lucide-react';
import type { PlaymatCardInstance, PlaymatZoneName } from '../../types/playmat.ts';
import { resolveCardImageUrl, handleCardImageError } from '../../utils/cardImage.ts';

interface ZoneBrowserModalProps {
  title: string;
  zoneName: PlaymatZoneName;
  cards: PlaymatCardInstance[];
  topLimit?: number;
  onClose: () => void;
  onMoveCard: (
    instanceId: string,
    targetZone: PlaymatZoneName | 'DECK_TOP' | 'DECK_BOTTOM'
  ) => void;
  onShuffleDeck?: () => void;
}

export function ZoneBrowserModal({
  title,
  zoneName,
  cards,
  topLimit,
  onClose,
  onMoveCard,
  onShuffleDeck,
}: ZoneBrowserModalProps) {
  const [query, setQuery] = useState('');

  const displayedCards = (topLimit ? cards.slice(0, topLimit) : cards).filter((c) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      c.symbol.toLowerCase().includes(q) ||
      c.cardType.toLowerCase().includes(q)
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#121522] border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        data-testid={`zone-browser-modal-${zoneName}`}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-white">{title}</h3>
            <p className="text-xs text-slate-400">
              แสดง {displayedCards.length} ใบ (จากทั้งหมด {cards.length} ใบ)
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onShuffleDeck && zoneName === 'DECK' && (
              <button
                type="button"
                onClick={() => {
                  onShuffleDeck();
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
              >
                <Shuffle className="w-3.5 h-3.5" /> สับกองและปิด
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="px-4 py-2.5 border-b border-slate-800/80 bg-[#0d101b]">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาชื่อการ์ด, รหัสการ์ด, เผ่า หรือประเภท..."
              className="w-full bg-[#161b2e] border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>

        {/* Card List */}
        <div className="p-4 overflow-y-auto flex-1">
          {displayedCards.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">
              ไม่มีการ์ดในโซนนี้
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {displayedCards.map((card, index) => (
                <div
                  key={card.instanceId}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-[#161a2c] border border-slate-800 hover:border-slate-700"
                >
                  <img
                    src={resolveCardImageUrl(card)}
                    onError={(e) => handleCardImageError(e, card.imageUrl, card)}
                    alt={card.name}
                    className="w-12 h-16 object-cover rounded-lg border border-slate-700 shrink-0"
                  />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-slate-400">
                          #{index + 1} • {card.id}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-rose-300 font-semibold">
                          {card.cardType}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-white truncate">{card.name}</div>
                    </div>

                    <div className="flex items-center gap-1 flex-wrap">
                      <button
                        type="button"
                        data-testid={`zone-card-to-hand-${card.instanceId}`}
                        onClick={() => onMoveCard(card.instanceId, 'HAND')}
                        className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-[10px] font-bold cursor-pointer"
                      >
                        + ขึ้นมือ
                      </button>
                      <button
                        type="button"
                        data-testid={`zone-card-to-avatar-${card.instanceId}`}
                        onClick={() => onMoveCard(card.instanceId, 'AVATAR')}
                        className="px-2 py-1 rounded bg-rose-700 hover:bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                      >
                        ลง Avatar
                      </button>
                      {zoneName !== 'HELL' && (
                        <button
                          type="button"
                          onClick={() => onMoveCard(card.instanceId, 'HELL')}
                          className="px-2 py-1 rounded bg-purple-900 hover:bg-purple-800 text-purple-200 text-[10px] font-bold cursor-pointer"
                        >
                          ลงนรก
                        </button>
                      )}
                      {zoneName !== 'DARK' && (
                        <button
                          type="button"
                          onClick={() => onMoveCard(card.instanceId, 'DARK')}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold cursor-pointer"
                        >
                          เนรเทศ
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onMoveCard(card.instanceId, 'DECK_TOP')}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer"
                      >
                        บนกอง
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveCard(card.instanceId, 'DECK_BOTTOM')}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer"
                      >
                        ใต้กอง
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

