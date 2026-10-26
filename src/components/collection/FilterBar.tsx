import { Search, X, SlidersHorizontal } from 'lucide-react';
import type { CardColor, CardType, TalingchanSet } from '../../types/card.ts';
import { CARD_COLORS, CARD_TYPES, COLOR_STYLES } from '../../constants/botc.ts';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedColor: CardColor | null;
  onColorChange: (color: CardColor | null) => void;
  selectedType: CardType | null;
  onTypeChange: (type: CardType | null) => void;
  selectedSet: string;
  onSetChange: (setCode: string) => void;
  sets: TalingchanSet[];
  sortBy: 'number' | 'cost' | 'power' | 'name';
  onSortChange: (sort: 'number' | 'cost' | 'power' | 'name') => void;
  totalVisible: number;
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  selectedColor,
  onColorChange,
  selectedType,
  onTypeChange,
  selectedSet,
  onSetChange,
  sets,
  sortBy,
  onSortChange,
  totalVisible,
}: FilterBarProps) {
  return (
    <div className="bg-[#121522]/90 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 shadow-xl space-y-3">
      {/* Top row: Search input + Set Selector + Sort */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="ค้นหาชื่อการ์ด, รหัส (BT01-001), ความสามารถ..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-[#1a1f33] border border-slate-700/60 rounded-xl pl-9 pr-9 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500/80 focus:ring-1 focus:ring-rose-500/50 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Set Selector */}
        <div className="flex gap-2">
          <select
            value={selectedSet}
            onChange={(e) => onSetChange(e.target.value)}
            className="bg-[#1a1f33] border border-slate-700/60 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-rose-500/80 cursor-pointer"
          >
            <option value="ALL">ทุกชุดการ์ด ({sets.length} ชุด)</option>
            {sets.map((s) => (
              <option key={s.code} value={s.code}>
                {s.code} — {s.name}
              </option>
            ))}
          </select>

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as 'number' | 'cost' | 'power' | 'name')}
            className="bg-[#1a1f33] border border-slate-700/60 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-rose-500/80 cursor-pointer"
          >
            <option value="number">เรียงตามรหัสการ์ด</option>
            <option value="cost">เรียงตามค่าร่าย (Cost)</option>
            <option value="power">เรียงตามพลัง (Power)</option>
            <option value="name">เรียงตามชื่อ ก-ฮ</option>
          </select>
        </div>
      </div>

      {/* Second row: Color Chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs text-slate-400 font-medium mr-1 flex items-center gap-1">
          <SlidersHorizontal className="w-3 h-3" /> สี:
        </span>
        <button
          onClick={() => onColorChange(null)}
          className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
            selectedColor === null
              ? 'bg-slate-200 text-slate-900 border-slate-200 font-bold shadow-sm'
              : 'border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
          }`}
        >
          ทั้งหมด
        </button>
        {CARD_COLORS.map((color) => {
          const isSelected = selectedColor === color;
          const styles = COLOR_STYLES[color];
          return (
            <button
              key={color}
              onClick={() => onColorChange(isSelected ? null : color)}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                isSelected ? styles.activeChip : `${styles.chip} border`
              }`}
            >
              {color}
            </button>
          );
        })}
      </div>

      {/* Third row: Card Type Chips & count badge */}
      <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-slate-800/50">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-slate-400 font-medium mr-1">ประเภท:</span>
          <button
            onClick={() => onTypeChange(null)}
            className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
              selectedType === null
                ? 'bg-rose-600 text-white border-rose-500 font-bold shadow-sm shadow-rose-600/30'
                : 'border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            ทั้งหมด
          </button>
          {CARD_TYPES.map((type) => {
            const isSelected = selectedType === type;
            return (
              <button
                key={type}
                onClick={() => onTypeChange(isSelected ? null : type)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                  isSelected
                    ? 'bg-rose-600/90 text-white border-rose-400 font-bold shadow-sm shadow-rose-600/30'
                    : 'border-slate-800/80 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {type}
              </button>
            );
          })}
        </div>

        <div className="text-xs text-slate-400 font-medium">
          พบ <span className="text-rose-400 font-bold">{totalVisible}</span> ใบ
        </div>
      </div>
    </div>
  );
}
