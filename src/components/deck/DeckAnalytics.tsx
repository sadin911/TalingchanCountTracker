import { useMemo } from 'react';
import type { Deck } from '../../types/deck.ts';
import type { CardColor } from '../../types/card.ts';
import { validateDeck } from '../../utils/deckValidator.ts';
import { COLOR_STYLES } from '../../constants/botc.ts';
import { CheckCircle2, AlertOctagon, AlertTriangle, BarChart3 } from 'lucide-react';

interface DeckAnalyticsProps {
  deck: Deck;
}

export function DeckAnalytics({ deck }: DeckAnalyticsProps) {
  const validation = useMemo(() => {
    return validateDeck(deck.mainDeck, deck.lifeDeck);
  }, [deck.mainDeck, deck.lifeDeck]);

  // Cost Curve Distribution (0-1, 2, 3, 4, 5+)
  const costDistribution = useMemo(() => {
    const counts: Record<string, number> = {
      '0-1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5+': 0
    };

    for (const card of deck.mainDeck) {
      const c = card.cost ?? 0;
      if (c <= 1) counts['0-1'] += card.count;
      else if (c === 2) counts['2'] += card.count;
      else if (c === 3) counts['3'] += card.count;
      else if (c === 4) counts['4'] += card.count;
      else counts['5+'] += card.count;
    }

    const maxCount = Math.max(1, ...Object.values(counts));
    return { counts, maxCount };
  }, [deck.mainDeck]);

  // Color breakdown
  const colorBreakdown = useMemo(() => {
    const total = deck.mainDeck.reduce((s, c) => s + c.count, 0) || 1;
    const colors: Record<string, number> = {};

    for (const card of deck.mainDeck) {
      colors[card.color] = (colors[card.color] || 0) + card.count;
    }

    return Object.entries(colors).map(([color, count]) => ({
      color,
      count,
      percent: Math.round((count / total) * 100)
    }));
  }, [deck.mainDeck]);

  return (
    <div className="bg-[#121522] border border-slate-800/80 rounded-2xl p-4 shadow-xl space-y-4">
      {/* 1. Validation Status Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="w-5 h-5 text-rose-400" />
          <h3 className="text-sm font-bold text-slate-100 font-['Prompt']">
            การตรวจสอบและวิเคราะห์เด็ค
          </h3>
        </div>

        {validation.isValid ? (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <div>
              <div className="font-bold">เด็คถูกต้องตามกติกาทุกประการ</div>
              <div className="text-[11px] text-emerald-400/80">
                Main Deck ครบ 50 ใบ และ LIFE Deck ครบ 5 ใบ ไม่ซ้ำกัน
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-rose-300">
              <AlertOctagon className="w-4 h-4 shrink-0 text-rose-400" />
              <span>เด็คยังไม่พร้อมสำหรับการแข่งขัน ({validation.errors.length} ข้อกำหนด)</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-200/90 pl-1">
              {validation.errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Warnings */}
        {validation.warnings.length > 0 && (
          <div className="mt-2 p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>คำเตือนกติกา</span>
            </div>
            <ul className="list-disc list-inside text-[11px] text-amber-200/90 pl-1">
              {validation.warnings.map((warn, idx) => (
                <li key={idx}>{warn}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 2. Cost Curve */}
      <div className="pt-2 border-t border-slate-800">
        <div className="text-xs font-semibold text-slate-300 mb-2">สัดส่วนค่าร่าย (Cost Curve)</div>
        <div className="grid grid-cols-5 gap-2 items-end h-28 pt-4 pb-2 bg-[#181c2e] px-3 rounded-xl border border-slate-800">
          {Object.entries(costDistribution.counts).map(([costRange, count]) => {
            const heightPercent = Math.max(8, Math.round((count / costDistribution.maxCount) * 100));
            return (
              <div key={costRange} className="flex flex-col items-center gap-1.5 h-full justify-end">
                <span className="text-[10px] font-bold text-rose-400 font-mono">{count}</span>
                <div
                  className="w-full bg-gradient-to-t from-rose-700 to-rose-400 rounded-t-md transition-all duration-300 shadow-sm"
                  style={{ height: `${heightPercent}%` }}
                />
                <span className="text-[10px] text-slate-400 font-mono">{costRange}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Color Ratio Breakdown */}
      {colorBreakdown.length > 0 && (
        <div className="pt-2 border-t border-slate-800 space-y-2">
          <div className="text-xs font-semibold text-slate-300">สัดส่วนสีของการ์ดในเด็ค</div>
          <div className="space-y-1.5">
            {colorBreakdown.map((item) => {
              const style = COLOR_STYLES[item.color as CardColor] || COLOR_STYLES.COLORLESS;
              return (
                <div key={item.color} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className={`font-semibold ${style.text}`}>{item.color}</span>
                    <span className="text-slate-400">
                      {item.count} ใบ ({item.percent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${style.activeChip.split(' ')[0]}`}
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
