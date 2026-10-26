import { useState, useMemo } from 'react';
import { X, Copy, Check, CheckCircle2, ShoppingBag } from 'lucide-react';
import type { Deck } from '../../types/deck.ts';
import { useCollectionStore } from '../../store/collectionStore.ts';

interface MissingCardsModalProps {
  deck: Deck;
  onClose: () => void;
}

export function MissingCardsModal({ deck, onClose }: MissingCardsModalProps) {
  const [copied, setCopied] = useState(false);
  const cardsCollection = useCollectionStore((s) => s.cards);

  const missingList = useMemo(() => {
    // Combine all required cards in deck (Main + Life)
    const required: Record<string, { id: string; name: string; needed: number }> = {};

    for (const c of deck.mainDeck) {
      if (!required[c.id]) required[c.id] = { id: c.id, name: c.name, needed: 0 };
      required[c.id].needed += c.count;
    }

    for (const c of deck.lifeDeck) {
      if (!required[c.id]) required[c.id] = { id: c.id, name: c.name, needed: 0 };
      required[c.id].needed += c.count;
    }

    const missing: { id: string; name: string; needed: number; owned: number; missing: number }[] = [];

    for (const item of Object.values(required)) {
      const entry = cardsCollection[item.id];
      const owned = entry ? entry.normal + entry.foil + entry.secret : 0;
      if (owned < item.needed) {
        missing.push({
          id: item.id,
          name: item.name,
          needed: item.needed,
          owned,
          missing: item.needed - owned
        });
      }
    }

    return missing;
  }, [deck, cardsCollection]);

  const totalMissingCount = missingList.reduce((sum, item) => sum + item.missing, 0);

  function handleCopy() {
    const lines = [
      `// รายการการ์ดที่ขาดสำหรับจัดเด็ค: ${deck.name}`,
      `// ต้องการเพิ่มทั้งหมด: ${totalMissingCount} ใบ`,
      ''
    ];
    for (const item of missingList) {
      lines.push(`${item.missing}x ${item.name} (${item.id}) [มีอยู่แล้ว ${item.owned}/${item.needed}]`);
    }
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div
        className="relative w-full max-w-lg bg-[#121522] border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 font-['Prompt']">
                เช็คการ์ดที่ขาด (Check Missing Cards)
              </h2>
              <p className="text-xs text-slate-400">
                เด็ค: <span className="text-rose-400 font-semibold">{deck.name}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {missingList.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-100">คุณมีการ์ดครบสำหรับจัดเด็คนี้!</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                การ์ดทุกใบใน Main Deck และ LIFE Deck มีอยู่ในคลังสะสมของคุณเรียบร้อยแล้ว
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-slate-400 flex items-center justify-between pb-1">
                <span>การ์ดที่ยังขาดอยู่ ({missingList.length} แบบ)</span>
                <span className="font-bold text-rose-400">ขาด {totalMissingCount} ใบ</span>
              </div>

              {missingList.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between bg-[#181c2e] p-3 rounded-xl border border-slate-800"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-200">{item.name}</div>
                    <div className="text-xs text-slate-500 font-mono">
                      {item.id} • มี {item.owned} / ต้องการ {item.needed}
                    </div>
                  </div>

                  <span className="text-xs font-bold px-2 py-1 rounded-lg bg-rose-950/80 border border-rose-500/40 text-rose-300">
                    ขาด {item.missing} ใบ
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {missingList.length > 0 && (
          <div className="p-4 border-t border-slate-800 bg-[#161a2b] flex items-center justify-end gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow-lg shadow-rose-600/30 transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'คัดลอกลงคลิปบอร์ดแล้ว' : 'คัดลอกรายการการ์ดที่ขาด'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
