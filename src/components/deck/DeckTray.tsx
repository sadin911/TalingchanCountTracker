import { Plus, Minus, Trash2, Heart, Layers, AlertCircle } from 'lucide-react';
import type { Deck, DeckCard } from '../../types/deck.ts';
import { COLOR_STYLES } from '../../constants/botc.ts';
import { useDeckStore } from '../../store/deckStore.ts';

interface DeckTrayProps {
  deck: Deck;
}

export function DeckTray({ deck }: DeckTrayProps) {
  const addCardToMain = useDeckStore((s) => s.addCardToMain);
  const removeCardFromMain = useDeckStore((s) => s.removeCardFromMain);
  const removeCardFromLife = useDeckStore((s) => s.removeCardFromLife);

  const mainCount = deck.mainDeck.reduce((sum, c) => sum + c.count, 0);
  const lifeCount = deck.lifeDeck.reduce((sum, c) => sum + c.count, 0);

  // Group Main Deck by Card Type
  const avatars = deck.mainDeck.filter((c) => c.cardType === 'Avatar');
  const magics = deck.mainDeck.filter((c) => c.cardType === 'Magic' || c.cardType === 'React Magic');
  const lands = deck.mainDeck.filter((c) => c.cardType === 'Land Magic' || c.cardType === 'Modification');
  const others = deck.mainDeck.filter(
    (c) => c.cardType !== 'Avatar' && c.cardType !== 'Magic' && c.cardType !== 'React Magic' && c.cardType !== 'Land Magic' && c.cardType !== 'Modification'
  );

  return (
    <div className="space-y-4">
      {/* 1. LIFE DECK TRAY (Top) */}
      <div className="bg-[#121522] border border-slate-800/80 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-400 fill-pink-500/20" />
            <h3 className="text-sm font-bold text-slate-100 font-['Prompt']">
              LIFE Deck (การ์ดชีวิต 5 ใบ ไม่ซ้ำกัน)
            </h3>
          </div>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-bold font-mono border ${
              lifeCount === 5
                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40'
                : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
            }`}
          >
            {lifeCount} / 5 ใบ
          </span>
        </div>

        {deck.lifeDeck.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
            ยังไม่มีการ์ดใน LIFE Deck (สามารถกดเพิ่มจากการค้นหาการ์ดด้านล่าง หรือจากหน้ารายละเอียดการ์ด)
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {deck.lifeDeck.map((card) => {
              const colorStyle = COLOR_STYLES[card.color] || COLOR_STYLES.COLORLESS;
              return (
                <div
                  key={card.id}
                  className="flex items-center justify-between bg-[#181c2e] p-2 rounded-xl border border-slate-800"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${colorStyle.badge}`} />
                    <div className="truncate">
                      <div className="text-xs font-semibold text-slate-200 truncate">{card.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{card.id}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => removeCardFromLife(deck.id, card.id)}
                    className="p-1 rounded-lg hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. MAIN DECK TRAY */}
      <div className="bg-[#121522] border border-slate-800/80 rounded-2xl p-4 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-rose-400" />
            <h3 className="text-sm font-bold text-slate-100 font-['Prompt']">
              Main Deck (การ์ดหลัก 50 ใบพอดี)
            </h3>
          </div>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-bold font-mono border ${
              mainCount === 50
                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40'
                : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
            }`}
          >
            {mainCount} / 50 ใบ
          </span>
        </div>

        {deck.mainDeck.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
            เด็คหลักยังว่างอยู่ กดค้นหาการ์ดด้านล่างเพื่อเพิ่มการ์ดเข้าเด็ค
          </div>
        ) : (
          <div className="space-y-4">
            {/* Avatars */}
            {avatars.length > 0 && (
              <DeckCardGroup
                title="Avatar (ตัวละคร)"
                cards={avatars}
                deckId={deck.id}
                onAdd={(c) => addCardToMain(deck.id, c as any)}
                onRemove={(id) => removeCardFromMain(deck.id, id)}
              />
            )}

            {/* Magics */}
            {magics.length > 0 && (
              <DeckCardGroup
                title="Magic & React Magic (เวทมนตร์)"
                cards={magics}
                deckId={deck.id}
                onAdd={(c) => addCardToMain(deck.id, c as any)}
                onRemove={(id) => removeCardFromMain(deck.id, id)}
              />
            )}

            {/* Land & Modifications */}
            {lands.length > 0 && (
              <DeckCardGroup
                title="Land Magic & อุปกรณ์ (สนาม/ส่วนเสริม)"
                cards={lands}
                deckId={deck.id}
                onAdd={(c) => addCardToMain(deck.id, c as any)}
                onRemove={(id) => removeCardFromMain(deck.id, id)}
              />
            )}

            {/* Others */}
            {others.length > 0 && (
              <DeckCardGroup
                title="อื่นๆ"
                cards={others}
                deckId={deck.id}
                onAdd={(c) => addCardToMain(deck.id, c as any)}
                onRemove={(id) => removeCardFromMain(deck.id, id)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface DeckCardGroupProps {
  title: string;
  cards: DeckCard[];
  deckId: string;
  onAdd: (card: DeckCard) => void;
  onRemove: (cardId: string) => void;
}

function DeckCardGroup({ title, cards, onAdd, onRemove }: DeckCardGroupProps) {
  const groupCount = cards.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-400 font-medium px-1">
        <span>{title}</span>
        <span className="font-mono text-slate-400">{groupCount} ใบ</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {cards.map((card) => {
          const colorStyle = COLOR_STYLES[card.color] || COLOR_STYLES.COLORLESS;
          return (
            <div
              key={card.id}
              className="flex items-center justify-between bg-[#181c2e] p-2 rounded-xl border border-slate-800"
            >
              <div className="flex items-center gap-2 min-w-0">
                {card.cost !== null ? (
                  <span className="w-5 h-5 rounded-md bg-slate-900 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-amber-300 shrink-0">
                    {card.cost}
                  </span>
                ) : (
                  <span className="w-5 h-5 shrink-0" />
                )}

                <div className="truncate">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-xs font-semibold text-slate-200 truncate">{card.name}</span>
                    {card.isOnlyOne && (
                      <span className="text-[9px] px-1 rounded bg-amber-500 text-slate-950 font-bold shrink-0">
                        1
                      </span>
                    )}
                    {card.isBiased && (
                      <span title="การ์ดลำเอียง">
                        <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    <span className={colorStyle.text}>{card.color}</span> • {card.id}
                  </div>
                </div>
              </div>

              {/* Stepper +/- */}
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button
                  onClick={() => onRemove(card.id)}
                  className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-5 text-center text-xs font-bold text-rose-400">{card.count}</span>
                <button
                  disabled={card.count >= 4}
                  onClick={() => onAdd(card)}
                  className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
