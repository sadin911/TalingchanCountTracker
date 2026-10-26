import type { TalingchanCard } from '../../types/card.ts';
import { CardTile } from './CardTile.tsx';
import { Sparkles } from 'lucide-react';

interface CardGridProps {
  cards: TalingchanCard[];
  onSelectCard: (card: TalingchanCard) => void;
}

export function CardGrid({ cards, onSelectCard }: CardGridProps) {
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

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
      {cards.map((card) => (
        <CardTile key={card.id} card={card} onSelectCard={onSelectCard} />
      ))}
    </div>
  );
}
