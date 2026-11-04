import { useState, useEffect, useRef } from 'react';
import type { TalingchanCard } from '../../types/card.ts';
import { CardTile } from './CardTile.tsx';
import { Sparkles, ChevronDown } from 'lucide-react';

interface CardGridProps {
  cards: TalingchanCard[];
  onSelectCard: (card: TalingchanCard) => void;
}

const PAGE_SIZE = 72;

export function CardGrid({ cards, onSelectCard }: CardGridProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [cards]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || visibleCount >= cards.length) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(cards.length, prev + PAGE_SIZE));
        }
      },
      { rootMargin: '400px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, cards.length]);

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-[#121522] rounded-3xl border border-slate-800/80 my-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-800/60 flex items-center justify-center text-slate-400 mb-3">
          <Sparkles className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-200">ไม่พบการ์ดที่ตรงกับเงื่อนไขค้นหา</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          ลองล้างตัวกรองหรือค้นหาด้วยคำอื่น เช่น รหัสการ์ด (เช่น BT01-001) หรือชื่อการ์ด
        </p>
      </div>
    );
  }

  const visibleCards = cards.slice(0, visibleCount);
  const hasMore = visibleCount < cards.length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
        {visibleCards.map((card) => (
          <CardTile key={card.id} card={card} onSelectCard={onSelectCard} />
        ))}
      </div>

      {hasMore && (
        <div ref={sentinelRef} className="flex flex-col items-center justify-center py-6 gap-2">
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => Math.min(cards.length, prev + PAGE_SIZE))}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-extrabold text-slate-200 transition-colors cursor-pointer"
          >
            <ChevronDown className="w-4 h-4 text-rose-400" />
            แสดงการ์ดเพิ่มเติม ({visibleCards.length} / {cards.length} ใบ)
          </button>
        </div>
      )}
    </div>
  );
}
