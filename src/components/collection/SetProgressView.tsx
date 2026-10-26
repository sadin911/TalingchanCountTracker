import type { TalingchanCard, TalingchanSet } from '../../types/card.ts';
import { useCollectionStore } from '../../store/collectionStore.ts';
import { Trophy, CheckCircle2 } from 'lucide-react';

interface SetProgressViewProps {
  currentSet: TalingchanSet | null;
  allCards: TalingchanCard[];
}

export function SetProgressView({ currentSet, allCards }: SetProgressViewProps) {
  const getSetProgress = useCollectionStore((s) => s.getSetProgress);

  if (!currentSet) {
    // Show overall stats
    const totalUniqueCards = allCards.length;
    const progress = getSetProgress(
      'ALL',
      totalUniqueCards,
      allCards.map((c) => c.id)
    );

    return (
      <div className="bg-[#121522] border border-slate-800/80 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 font-['Prompt']">
              สถิติการสะสมรวมทุกชุด
            </h3>
            <p className="text-xs text-slate-400">
              สะสมการ์ดไม่ซ้ำได้ {progress.uniqueOwned} จากทั้งหมด {progress.totalCards} แบบ (รวมทั้งหมด {progress.totalOwned} ใบ)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-64">
          <div className="flex-1 bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-500 to-rose-500 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <span className="text-xs font-bold text-amber-400 min-w-[40px] text-right font-mono">
            {progress.percentage}%
          </span>
        </div>
      </div>
    );
  }

  const setCards = allCards.filter((c) => c.setCode === currentSet.code);
  const progress = getSetProgress(
    currentSet.code,
    setCards.length,
    setCards.map((c) => c.id)
  );

  return (
    <div className="bg-[#121522] border border-slate-800/80 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 font-bold font-mono">
          {currentSet.code}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-100 font-['Prompt']">{currentSet.name}</h3>
            {progress.percentage === 100 && (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full font-medium">
                <CheckCircle2 className="w-3 h-3" /> ครบเซ็ต!
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            สะสมแล้ว {progress.uniqueOwned}/{progress.totalCards} แบบ (มีทั้งหมด {progress.totalOwned} ใบ)
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-64">
        <div className="flex-1 bg-slate-800 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-rose-500 to-amber-500 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
        <span className="text-xs font-bold text-rose-400 min-w-[40px] text-right font-mono">
          {progress.percentage}%
        </span>
      </div>
    </div>
  );
}
