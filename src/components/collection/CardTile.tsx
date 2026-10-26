import { Plus, Minus } from 'lucide-react';
import type { TalingchanCard, FinishKey } from '../../types/card.ts';
import { rarityLabel } from '../../types/card.ts';
import { COLOR_STYLES, TYPE_BADGES, FINISH_META } from '../../constants/botc.ts';
import { resolveCardImageUrl, handleCardImageError } from '../../utils/cardImage.ts';
import { useCollectionStore } from '../../store/collectionStore.ts';

interface CardTileProps {
  card: TalingchanCard;
  onSelectCard: (card: TalingchanCard) => void;
}

export function CardTile({ card, onSelectCard }: CardTileProps) {
  const cardsCollection = useCollectionStore((s) => s.cards[card.id]) || { normal: 0, foil: 0, secret: 0 };
  const incrementCard = useCollectionStore((s) => s.incrementCard);
  const decrementCard = useCollectionStore((s) => s.decrementCard);

  const totalOwned = cardsCollection.normal + cardsCollection.foil + cardsCollection.secret;
  const isOwned = totalOwned > 0;
  const colorStyle = COLOR_STYLES[card.color] || COLOR_STYLES.COLORLESS;
  const typeBadge = TYPE_BADGES[card.cardType] || 'bg-slate-800 text-slate-300';

  return (
    <div
      className={`group relative flex flex-col bg-[#121522] rounded-2xl border transition-all duration-200 overflow-hidden ${
        isOwned
          ? 'border-slate-700/80 shadow-lg shadow-black/40 hover:border-slate-500 hover:shadow-rose-950/20'
          : 'border-slate-800/60 opacity-80 hover:opacity-100 hover:border-slate-700'
      }`}
    >
      {/* Clickable Card Art Container */}
      <div
        onClick={() => onSelectCard(card)}
        className="relative aspect-[3/4] w-full overflow-hidden bg-[#181c2e] cursor-pointer"
      >
        <img
          src={resolveCardImageUrl(card.setCode, card.collectorNumber, false)}
          alt={card.name}
          onError={handleCardImageError}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Cost Badge (Top Left) */}
        {card.cost !== null && (
          <div className="absolute top-2 left-2 flex items-center justify-center w-7 h-7 rounded-full bg-slate-900/90 border border-slate-600 text-amber-300 font-bold text-xs shadow-md">
            {card.cost}
          </div>
        )}

        {/* Power Badge (Bottom Left of Image) */}
        {card.power !== null && (
          <div className="absolute bottom-2 left-2 flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-rose-950/90 border border-rose-500/60 text-rose-200 font-bold text-xs shadow-md">
            <span className="text-[10px] text-rose-400">POW</span> {card.power}
          </div>
        )}

        {/* Color & Rarity Tag (Top Right) */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${colorStyle.badge}`}>
            {card.color}
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/80 text-slate-300 border border-slate-700 font-medium">
            {rarityLabel(card.rarity)}
          </span>
        </div>

        {/* Special Rules Badges (Bottom Right) */}
        <div className="absolute bottom-2 right-2 flex flex-col gap-1 items-end">
          {card.isOnlyOne && (
            <span className="text-[9px] px-1.5 py-0.5 rounded font-extrabold bg-amber-500 text-slate-950 shadow-md">
              Only 1
            </span>
          )}
          {card.isBiased && (
            <span className="text-[9px] px-1.5 py-0.5 rounded font-extrabold bg-red-600 text-white shadow-md animate-pulse">
              ลำเอียง
            </span>
          )}
        </div>
      </div>

      {/* Card Info Section */}
      <div className="p-2.5 flex-1 flex flex-col justify-between space-y-2">
        <div>
          {/* Subtitle row: Type & Symbol */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span className={`px-1.5 py-0.5 rounded border text-[10px] font-medium ${typeBadge}`}>
              {card.cardType}
            </span>
            <span className="text-slate-400 text-[10px] font-medium truncate max-w-[80px]">
              {card.symbol}
            </span>
          </div>

          {/* Card Name */}
          <h3
            onClick={() => onSelectCard(card)}
            title={card.name}
            className="text-sm font-semibold text-slate-100 hover:text-rose-400 cursor-pointer line-clamp-1 font-['Prompt']"
          >
            {card.name}
          </h3>

          <div className="text-[10px] text-slate-500 font-mono mt-0.5">{card.id}</div>
        </div>

        {/* Stepper Counters per finish */}
        <div className="pt-2 border-t border-slate-800/80 space-y-1">
          {card.finishes.map((finishKey: FinishKey) => {
            const count = cardsCollection[finishKey] || 0;
            const meta = FINISH_META[finishKey];
            return (
              <div
                key={finishKey}
                className="flex items-center justify-between bg-[#171b2c] px-2 py-1 rounded-lg border border-slate-800/80"
              >
                <span className="text-[11px] text-slate-300 flex items-center gap-1 font-medium">
                  <span>{meta.icon}</span> {meta.label}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    disabled={count <= 0}
                    onClick={() => decrementCard(card.id, finishKey)}
                    className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>

                  <span
                    className={`w-6 text-center text-xs font-bold ${
                      count > 0 ? 'text-rose-400' : 'text-slate-500'
                    }`}
                  >
                    {count}
                  </span>

                  <button
                    onClick={() => incrementCard(card.id, finishKey)}
                    className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
