import {
  Plus,
  Minus,
  Shield,
  Hammer,
  Wand2,
  Heart,
  Skull,
  Ban,
  Search,
  Eye,
  Shuffle,
  AlertTriangle,
  Swords,
  RotateCw,
  MoreHorizontal,
  Sparkles,
  Gem,
  Flame,
  Undo2,
} from 'lucide-react';
import type {
  AvatarSlotState,
  PlayerBoardState,
  PlaymatCardInstance,
  PlaymatZoneName,
} from '../../types/playmat.ts';
import {
  getEffectiveAvatarPower,
  getGemZoneTotal,
} from '../../utils/talingchanTabletopHelper.ts';
import { resolveCardImageUrl, handleCardImageError } from '../../utils/cardImage.ts';

interface PlayerBoardZoneProps {
  board: PlayerBoardState;
  isTopOpponentView?: boolean;
  isActiveTurn: boolean;
  selectedHandCardForThisSide?: PlaymatCardInstance | null;
  activeAttacker?: {
    side: 'player1' | 'player2';
    slotIndex: number;
    slot: AvatarSlotState;
  } | null;
  onDrawOne: () => void;
  onDrawToThree: () => void;
  onShuffleDeck: () => void;
  onChangeAvatarZoneLimit: (newLimit: number) => void;
  onClickAvatarSlot: (slotIndex: number, slot: AvatarSlotState) => void;
  onQuickAdjustAvatarPower: (slotIndex: number, delta: number) => void;
  onQuickToggleAvatarRest: (slotIndex: number) => void;
  onQuickDestroyAvatar: (slotIndex: number) => void;
  onStartAttackWithAvatar: (slotIndex: number, slot: AvatarSlotState) => void;
  onSelectAttackTargetAvatar: (defenderSlotIndex: number) => void;
  onSelectAttackTargetLife: (lifeIndex: number) => void;
  onDirectPlaceOnAvatarSlot: (slotIndex: number) => void;
  onDirectAttachToAvatarSlot: (slotIndex: number) => void;
  onDirectPlaceOnConstructSlot: (slotIndex: number) => void;
  onDirectCastToMagicZone: () => void;
  onDirectPlaceToGemZone: () => void;
  onFlushGemZoneToHell: () => void;
  onReturnGemCardToHand: (instanceId: string) => void;
  onSendGemCardToHell: (instanceId: string) => void;
  onDirectDiscardToHellZone: () => void;
  onDropCardToTarget: (
    e: React.DragEvent,
    targetZone: 'AVATAR' | 'CONSTRUCT' | 'MAGIC' | 'GEM' | 'HELL' | 'DARK',
    slotIndex?: number
  ) => void;
  onRemoveConstructSlot: (slotIndex: number) => void;
  onResolveMagicToHell: (instanceId: string) => void;
  onFlipLifeCard: (lifeIndex: number) => void;
  onDestroyLifeCardToHell: (lifeIndex: number) => void;
  onAddLifeCardToHand: (lifeIndex: number) => void;
  onOpenZoneBrowser: (zone: PlaymatZoneName, title: string, topLimit?: number) => void;
  onInspectCard?: (card: PlaymatCardInstance) => void;
}

export function PlayerBoardZone({
  board,
  isTopOpponentView = false,
  isActiveTurn,
  selectedHandCardForThisSide,
  activeAttacker,
  onDrawOne,
  onDrawToThree,
  onShuffleDeck,
  onChangeAvatarZoneLimit,
  onClickAvatarSlot,
  onQuickAdjustAvatarPower,
  onQuickToggleAvatarRest,
  onQuickDestroyAvatar,
  onStartAttackWithAvatar,
  onSelectAttackTargetAvatar,
  onSelectAttackTargetLife,
  onDirectPlaceOnAvatarSlot,
  onDirectAttachToAvatarSlot,
  onDirectPlaceOnConstructSlot,
  onDirectCastToMagicZone,
  onDirectPlaceToGemZone,
  onFlushGemZoneToHell,
  onReturnGemCardToHand,
  onSendGemCardToHell,
  onDirectDiscardToHellZone,
  onDropCardToTarget,
  onRemoveConstructSlot,
  onResolveMagicToHell,
  onFlipLifeCard,
  onDestroyLifeCardToHell,
  onAddLifeCardToHand,
  onOpenZoneBrowser,
  onInspectCard,
}: PlayerBoardZoneProps) {
  const constructNames = board.constructZone
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .map((s) => s.card.name);
  const hasDuplicateConstruct = new Set(constructNames).size !== constructNames.length;

  const isEnemyOfActiveAttacker = Boolean(
    activeAttacker && activeAttacker.side !== board.id
  );
  const attackerPower = activeAttacker ? getEffectiveAvatarPower(activeAttacker.slot) : 0;

  const canHighlightEmptyAvatarSlot = Boolean(
    selectedHandCardForThisSide &&
      (selectedHandCardForThisSide.cardType === 'Avatar' ||
        selectedHandCardForThisSide.cardType !== 'Construct')
  );
  const canHighlightOccupiedAvatarForMod = Boolean(
    selectedHandCardForThisSide &&
      selectedHandCardForThisSide.cardType === 'Modification'
  );
  const canHighlightEmptyConstructSlot = Boolean(
    selectedHandCardForThisSide &&
      (selectedHandCardForThisSide.cardType === 'Construct' ||
        selectedHandCardForThisSide.cardType !== 'Avatar')
  );
  const canHighlightMagicZone = Boolean(
    selectedHandCardForThisSide &&
      ['Magic', 'Normal Magic', 'React Magic', 'Modification'].includes(
        selectedHandCardForThisSide.cardType
      )
  );
  const canHighlightGemZone = Boolean(selectedHandCardForThisSide);

  const totalGemInZone = getGemZoneTotal(board);
  const faceDownLifeCount = board.lifeZone.filter((c) => c.isFaceDown).length;
  const isCriticalStatus = board.lifeZone.length > 0 && faceDownLifeCount === 0;

  // ============================================================================
  // 1. OFFICIAL LIFE CARD COLUMN (Tall Vertical Box with 5 Horizontal Cards Stacked Top-to-Bottom)
  //    - Bottom Player ("คุณ"): Placed on LEFT column
  //    - Top Opponent ("อีกฝ่าย"): Placed on RIGHT column (180° mirrored per Rulebook diagram)
  // ============================================================================
  const renderLifeCardColumn = () => (
    <div className="flex flex-col justify-between gap-1 shrink-0 bg-slate-900/85 border-2 border-slate-600/70 rounded-2xl p-1.5 shadow-lg">
      {/* Header: Player Badge + LIFE Counter */}
      <div className="flex items-center justify-between gap-1">
        <span
          className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold ${
            board.id === 'player1' ? 'bg-blue-600 text-white' : 'bg-rose-600 text-white'
          }`}
        >
          {board.id === 'player1' ? '🔵 P1' : '🔴 P2'}
        </span>
        <span
          data-testid={`life-count-${board.id}`}
          className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold flex items-center gap-0.5 ${
            isCriticalStatus
              ? 'bg-red-600 text-white animate-pulse'
              : 'bg-pink-950/90 text-pink-200 border border-pink-500/40'
          }`}
        >
          <Heart className="w-2.5 h-2.5 text-pink-400" />
          {isCriticalStatus
            ? `สาหัส! (${board.lifeZone.length}/5)`
            : `Life: ${board.lifeZone.length}/5`}
        </span>
      </div>

      {/* Vertical Stack of 5 HORIZONTAL (แนวนอน) Life Cards */}
      {board.lifeZone.length === 0 ? (
        <div className="botc-life-card-horizontal flex items-center justify-center text-[9px] text-rose-400 font-bold border border-dashed border-rose-500/40 rounded-lg">
          Life หมด! (0/5)
        </div>
      ) : (
        <div className="flex flex-col gap-1 items-center">
          {board.lifeZone.map((lifeCard, idx) => (
            <div
              key={lifeCard.instanceId}
              data-testid={`life-slot-${board.id}-${idx}`}
              onClick={() => {
                if (isEnemyOfActiveAttacker) {
                  onSelectAttackTargetLife(idx);
                  return;
                }
                onFlipLifeCard(idx);
              }}
              title={
                lifeCard.isFaceDown
                  ? `LIFE Card ใบที่ #${idx + 1} (วางแนวนอนคว่ำหน้า — คลิกเพื่อหงาย)`
                  : `${lifeCard.name}: ${lifeCard.effect || 'คลิกเพื่อดูรายละเอียด'}`
              }
              className={`botc-life-card-horizontal relative group rounded-md border flex items-center justify-between overflow-hidden transition-all cursor-pointer select-none ${
                isEnemyOfActiveAttacker
                  ? 'bg-rose-950/85 border-rose-400 ring-2 ring-rose-500 animate-pulse shadow-md shadow-rose-500/30'
                  : lifeCard.isFaceDown
                  ? 'bg-gradient-to-r from-slate-900 via-rose-950/80 to-slate-900 border-slate-500/70 hover:border-pink-400'
                  : 'bg-[#1a1528] border-amber-400/80 hover:border-amber-300 shadow'
              }`}
            >
              {lifeCard.isFaceDown ? (
                <div className="w-full h-full flex items-center justify-between px-2">
                  <span className="text-[8px] font-black tracking-wider text-slate-300">
                    LIFE #{idx + 1}
                  </span>
                  <span className="text-[7px] text-rose-300/90 font-bold">คว่ำ</span>
                </div>
              ) : (
                <div className="w-full h-full relative flex items-center">
                  <img
                    src={resolveCardImageUrl(lifeCard)}
                    onError={(e) => handleCardImageError(e, lifeCard.imageUrl, lifeCard)}
                    alt={lifeCard.name}
                    onClick={(e) => {
                      if (!isEnemyOfActiveAttacker) {
                        e.stopPropagation();
                        onInspectCard?.(lifeCard);
                      }
                    }}
                    className="w-8 h-full object-cover object-top shrink-0 border-r border-amber-500/40"
                  />
                  <div className="flex-1 min-w-0 px-1 leading-tight">
                    <div className="text-[8px] font-extrabold text-amber-200 truncate">
                      {lifeCard.name}
                    </div>
                    <div className="text-[7px] text-emerald-300 truncate">หงายแล้ว</div>
                  </div>
                </div>
              )}

              {/* Attack Target Overlay */}
              {isEnemyOfActiveAttacker && (
                <div className="absolute inset-0 bg-rose-950/80 flex items-center justify-center gap-1 z-20">
                  <Swords className="w-3 h-3 text-rose-300 animate-bounce" />
                  <span className="text-[8px] font-black text-white">ตี Life #{idx + 1}!</span>
                </div>
              )}

              {/* Hover Quick Action Pills (Flip / Destroy / Hand) */}
              {!isEnemyOfActiveAttacker && (
                <div
                  className="opacity-0 group-hover:opacity-100 absolute inset-y-0 right-0 bg-slate-950/95 flex items-center gap-0.5 px-1 z-10 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    data-testid={`btn-flip-life-${board.id}-${idx}`}
                    onClick={() => onFlipLifeCard(idx)}
                    className="px-1 py-0.2 rounded bg-slate-800 hover:bg-slate-700 text-[7px] font-bold text-amber-300 cursor-pointer"
                  >
                    {lifeCard.isFaceDown ? 'หงาย' : 'คว่ำ'}
                  </button>
                  <button
                    type="button"
                    data-testid={`btn-destroy-life-${board.id}-${idx}`}
                    onClick={() => onDestroyLifeCardToHell(idx)}
                    className="px-1 py-0.2 rounded bg-rose-900 hover:bg-rose-700 text-[7px] font-bold text-white cursor-pointer"
                  >
                    ทำลาย
                  </button>
                  <button
                    type="button"
                    onClick={() => onAddLifeCardToHand(idx)}
                    className="px-1 py-0.2 rounded bg-emerald-900 hover:bg-emerald-700 text-[7px] font-bold text-white cursor-pointer"
                  >
                    มือ
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer of LIFE Column */}
      <button
        type="button"
        onClick={() =>
          onOpenZoneBrowser(
            'LIFE',
            `${board.name} — การ์ดใน LIFE Card Zone (${board.lifeZone.length} ใบ)`
          )
        }
        className="text-[8px] text-center text-slate-300 hover:text-pink-300 font-bold tracking-wider uppercase cursor-pointer"
      >
        LIFE CARD ({faceDownLifeCount} คว่ำ)
      </button>
    </div>
  );

  // ============================================================================
  // 2. DECK + HELL ZONE (นรก) + DARK DIMENSION (มิติมืด) COLUMN
  //    - Bottom Player ("คุณ"): Placed on RIGHT column (นรก on top, Deck on bottom per Rulebook diagram)
  //    - Top Opponent ("อีกฝ่าย"): Placed on LEFT column (Deck on top, นรก on bottom per Rulebook diagram)
  // ============================================================================
  const renderDeckAndHellColumn = () => {
    const deckBlock = (
      <div className="flex flex-col items-center gap-0.5">
        <button
          type="button"
          data-testid={`btn-draw-one-${board.id}`}
          onClick={onDrawOne}
          title="คลิกที่กองเด็คเพื่อจั่วการ์ด 1 ใบ"
          className="botc-deck-card relative rounded-xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 border-2 border-slate-400/70 hover:border-emerald-400 shadow-lg flex flex-col items-center justify-center p-1 cursor-pointer group transition-transform active:scale-95"
        >
          <span className="text-[7px] font-extrabold text-slate-300 tracking-tighter uppercase">
            BATTLE OF TALINGCHAN
          </span>
          <span className="text-xs font-black text-white font-mono my-0.5">
            {board.deck.length}
          </span>
          <span className="text-[8px] font-bold text-emerald-300 group-hover:underline">
            + จั่ว 1 ใบ
          </span>
        </button>

        {/* Quick Deck Mini Buttons */}
        <div className="grid grid-cols-2 gap-0.5 w-full">
          <button
            type="button"
            data-testid={`btn-draw-to-three-${board.id}`}
            onClick={onDrawToThree}
            title="จั่วเข้าเทิร์นให้ครบ 3 ใบ (หรือ +1 หากมี 3 ใบขึ้นไป)"
            className="px-1 py-0.2 rounded bg-teal-900/90 hover:bg-teal-800 text-teal-200 border border-teal-500/40 text-[7px] font-bold cursor-pointer text-center"
          >
            ครบ 3
          </button>
          <button
            type="button"
            data-testid={`btn-top5-${board.id}`}
            onClick={() =>
              onOpenZoneBrowser('DECK', `${board.name} — ดูการ์ดใบบนสุด 5 ใบ`, 5)
            }
            className="px-1 py-0.2 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[7px] font-bold flex items-center justify-center gap-0.5 cursor-pointer"
          >
            <Eye className="w-2 h-2" /> Top5
          </button>
          <button
            type="button"
            data-testid={`btn-search-deck-${board.id}`}
            onClick={() =>
              onOpenZoneBrowser(
                'DECK',
                `${board.name} — ค้นหากองการ์ดหลัก (${board.deck.length} ใบ)`
              )
            }
            className="px-1 py-0.2 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[7px] font-bold flex items-center justify-center gap-0.5 cursor-pointer"
          >
            <Search className="w-2 h-2" /> ค้น
          </button>
          <button
            type="button"
            data-testid={`btn-shuffle-${board.id}`}
            onClick={onShuffleDeck}
            title="สับกองการ์ด"
            className="px-1 py-0.2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[7px] font-bold flex items-center justify-center cursor-pointer"
          >
            <Shuffle className="w-2 h-2" />
          </button>
        </div>
      </div>
    );

    const hellBlock = (
      <div className="flex flex-col items-center gap-0.5">
        <button
          type="button"
          data-testid={`btn-hell-zone-${board.id}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => onDropCardToTarget(e, 'HELL')}
          onClick={() => {
            if (selectedHandCardForThisSide) {
              onDirectDiscardToHellZone();
              return;
            }
            onOpenZoneBrowser(
              'HELL',
              `${board.name} — โซนนรก / Graveyard (${board.hellZone.length} ใบ)`
            );
          }}
          title={
            selectedHandCardForThisSide
              ? 'คลิกเพื่อทิ้งการ์ดที่เลือกลงโซนนรกทันที'
              : 'คลิกเพื่อเปิดดูการ์ดในโซนนรก'
          }
          className={`botc-deck-card relative rounded-xl border-2 flex flex-col items-center justify-center overflow-hidden cursor-pointer transition-all ${
            selectedHandCardForThisSide
              ? 'bg-zinc-900 border-rose-400 ring-2 ring-rose-400/70 animate-pulse'
              : 'bg-zinc-950/90 border-zinc-600/80 hover:border-rose-400'
          }`}
        >
          {board.hellZone[0] ? (
            <>
              <img
                src={resolveCardImageUrl(board.hellZone[0])}
                onError={(e) =>
                  handleCardImageError(e, board.hellZone[0].imageUrl, board.hellZone[0])
                }
                alt={board.hellZone[0].name}
                className="w-full h-full object-cover opacity-75"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent flex flex-col items-center justify-end p-1">
                <span className="text-[9px] font-extrabold text-rose-300">
                  นรก ({board.hellZone.length})
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-1 text-rose-400">
              <Skull className="w-4 h-4 text-rose-500 mb-0.5" />
              <span className="text-[9px] font-extrabold text-white">
                นรก ({board.hellZone.length})
              </span>
              {selectedHandCardForThisSide && (
                <span className="text-[7px] text-amber-300 font-bold">คลิกทิ้ง!</span>
              )}
            </div>
          )}
        </button>

        {/* Dark Dimension (โซนมิติมืด — positioned between Construct and Hell Zone per Rulebook) */}
        <button
          type="button"
          data-testid={`btn-dark-zone-${board.id}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => onDropCardToTarget(e, 'DARK')}
          onClick={() =>
            onOpenZoneBrowser(
              'DARK',
              `${board.name} — โซนมิติมืด / เนรเทศ (${board.darkZone.length} ใบ)`
            )
          }
          className="w-full flex items-center justify-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-[8px] font-bold cursor-pointer"
        >
          <Ban className="w-2.5 h-2.5 text-zinc-400" />
          <span>มิติมืด ({board.darkZone.length})</span>
        </button>
      </div>
    );

    return (
      <div className="flex items-center gap-1.5 shrink-0 bg-slate-900/80 border border-slate-700/80 rounded-2xl p-1.5 shadow-lg">
        {isTopOpponentView ? (
          <>
            {deckBlock}
            {hellBlock}
          </>
        ) : (
          <>
            {hellBlock}
            {deckBlock}
          </>
        )}
      </div>
    );
  };

  // ============================================================================
  // 3. CONSTRUCT ZONE (Yellow Box per Rulebook diagram) + AVATAR ZONE (Red Box, 4..8 slots)
  // ============================================================================
  const renderConstructBox = () => (
    <div className="bg-amber-500/15 border-2 border-amber-400/70 rounded-xl px-2 py-1 flex flex-col items-center justify-center gap-1 shrink-0 shadow-md">
      <div className="flex items-center justify-between gap-1 w-full">
        <span className="text-[9px] font-black text-amber-300 flex items-center gap-0.5 tracking-wide uppercase">
          <Hammer className="w-2.5 h-2.5" />
          CONSTRUCT ({board.constructZone.filter(Boolean).length}/3)
        </span>
        {hasDuplicateConstruct && (
          <span className="text-[8px] text-rose-300 flex items-center gap-0.5 font-bold">
            <AlertTriangle className="w-2.5 h-2.5" /> ซ้ำ!
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {board.constructZone.map((slot, idx) => (
          <div
            key={idx}
            data-testid={`construct-slot-${board.id}-${idx}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDropCardToTarget(e, 'CONSTRUCT', idx)}
            onClick={() => {
              if (!slot && selectedHandCardForThisSide) {
                onDirectPlaceOnConstructSlot(idx);
              }
            }}
            className={`botc-construct-card relative rounded-lg border flex flex-col items-center justify-center p-0.5 transition-all select-none ${
              slot
                ? 'bg-[#1f1a12] border-amber-400 shadow'
                : canHighlightEmptyConstructSlot
                ? 'bg-amber-950/60 border-amber-300 ring-2 ring-amber-300/80 animate-pulse text-amber-200 cursor-pointer'
                : 'bg-slate-950/65 border-dashed border-amber-400/40 text-amber-200/50'
            }`}
          >
            {slot ? (
              <div className="w-full h-full relative rounded overflow-hidden group">
                <img
                  src={resolveCardImageUrl(slot.card)}
                  onError={(e) => handleCardImageError(e, slot.card.imageUrl, slot.card)}
                  alt={slot.card.name}
                  onClick={(e) => {
                    e.stopPropagation();
                    onInspectCard?.(slot.card);
                  }}
                  className="w-full h-full object-cover cursor-pointer"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveConstructSlot(idx);
                  }}
                  title="ทำลาย Construct ลงนรก"
                  className="opacity-0 group-hover:opacity-100 absolute top-0.5 right-0.5 px-1 py-0.2 rounded bg-rose-700/95 hover:bg-rose-600 text-white text-[7px] font-bold cursor-pointer transition-opacity"
                >
                  ลงนรก
                </button>
                <div className="absolute bottom-0 inset-x-0 bg-black/85 px-0.5 py-0.2 text-[7px] font-bold text-white truncate text-center">
                  {slot.card.name}
                </div>
              </div>
            ) : (
              <span className="text-[7px] font-extrabold text-center px-0.5">
                {canHighlightEmptyConstructSlot ? '✨ วาง' : `#${idx + 1}`}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderAvatarBox = () => (
    <div className="bg-rose-950/35 border-2 border-rose-500/65 rounded-xl px-2.5 py-1 flex flex-col items-center justify-center gap-1 shadow-md flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2 w-full">
        <span
          data-testid={`avatar-zone-header-${board.id}`}
          className="text-[9px] font-black text-rose-300 flex items-center gap-1 tracking-wide uppercase"
        >
          <Shield className="w-3 h-3 text-rose-400" />
          AVATAR ZONE ({board.avatarZone.filter(Boolean).length}/{board.avatarZoneLimit} ช่อง)
        </span>

        {/* Expand / Shrink Avatar Zone (4..8 slots) */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            data-testid={`btn-shrink-avatar-zone-${board.id}`}
            disabled={board.avatarZoneLimit <= 4}
            onClick={() => onChangeAvatarZoneLimit(board.avatarZoneLimit - 1)}
            title="ลดช่อง Avatar Zone (ต่ำสุด 4 ช่อง)"
            className="px-1.5 py-0.2 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-35 text-slate-200 text-[8px] font-bold flex items-center gap-0.5 cursor-pointer"
          >
            <Minus className="w-2.5 h-2.5" /> ลด
          </button>
          <button
            type="button"
            data-testid={`btn-expand-avatar-zone-${board.id}`}
            disabled={board.avatarZoneLimit >= 8}
            onClick={() => onChangeAvatarZoneLimit(board.avatarZoneLimit + 1)}
            title="ขยายช่อง Avatar Zone จากเอฟเฟกต์การ์ด (สูงสุด 8 ช่อง)"
            className="px-1.5 py-0.2 rounded bg-rose-600/40 hover:bg-rose-600/60 disabled:opacity-35 border border-rose-400/50 text-rose-100 text-[8px] font-bold flex items-center gap-0.5 cursor-pointer"
          >
            <Plus className="w-2.5 h-2.5" /> ขยายช่อง ({board.avatarZoneLimit})
          </button>
        </div>
      </div>

      {/* Avatar Slots Strip */}
      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        {board.avatarZone.map((slot, idx) => {
          const isSelectedAttacker =
            activeAttacker?.side === board.id && activeAttacker?.slotIndex === idx;
          const slotPower = slot ? getEffectiveAvatarPower(slot) : 0;

          return (
            <div
              key={idx}
              data-testid={`avatar-slot-${board.id}-${idx}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDropCardToTarget(e, 'AVATAR', idx)}
              onClick={() => {
                if (!slot && selectedHandCardForThisSide) {
                  onDirectPlaceOnAvatarSlot(idx);
                  return;
                }
                if (slot && canHighlightOccupiedAvatarForMod) {
                  onDirectAttachToAvatarSlot(idx);
                  return;
                }
                if (slot && isEnemyOfActiveAttacker) {
                  onSelectAttackTargetAvatar(idx);
                  return;
                }
                if (slot) {
                  onClickAvatarSlot(idx, slot);
                }
              }}
              className={`botc-avatar-card relative rounded-xl border flex flex-col items-center justify-center p-0.5 transition-all select-none ${
                slot
                  ? isSelectedAttacker
                    ? 'bg-[#1c1528] border-amber-400 ring-2 ring-amber-400 shadow-lg shadow-amber-500/30 cursor-pointer'
                    : isEnemyOfActiveAttacker
                    ? 'bg-[#2a121b] border-rose-400 ring-2 ring-rose-500 animate-pulse shadow-lg shadow-rose-500/30 cursor-pointer'
                    : canHighlightOccupiedAvatarForMod
                    ? 'bg-[#1f1c14] border-amber-400 ring-2 ring-amber-400 animate-pulse cursor-pointer'
                    : 'bg-[#15192b] border-rose-400/70 hover:border-rose-300 cursor-pointer shadow-md group'
                  : canHighlightEmptyAvatarSlot
                  ? 'bg-emerald-950/50 border-emerald-400 ring-2 ring-emerald-400/80 animate-pulse text-emerald-200 cursor-pointer'
                  : 'bg-slate-950/60 border-dashed border-rose-400/35 text-rose-200/45'
              }`}
            >
              {slot ? (
                <div
                  className={`w-full h-full relative rounded-lg overflow-hidden transition-transform ${
                    slot.isRested ? 'rotate-6 scale-95 opacity-85 ring-2 ring-amber-400' : ''
                  }`}
                >
                  <img
                    src={resolveCardImageUrl(slot.card)}
                    onError={(e) => handleCardImageError(e, slot.card.imageUrl, slot.card)}
                    alt={slot.card.name}
                    className="w-full h-full object-cover"
                  />

                  {/* Top-Right Effective POWER + Quick -/+ Controls */}
                  <div className="absolute top-0.5 right-0.5 flex items-center gap-0.5 z-10">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickAdjustAvatarPower(idx, -1);
                      }}
                      title="ลด POWER -1"
                      className="opacity-0 group-hover:opacity-100 w-3.5 h-3.5 rounded bg-slate-950/90 hover:bg-rose-700 text-white text-[8px] font-black flex items-center justify-center border border-slate-700 cursor-pointer transition-opacity"
                    >
                      -
                    </button>
                    <div
                      data-testid={`avatar-power-${board.id}-${idx}`}
                      className={`px-1 py-0.2 rounded text-[9px] font-extrabold shadow ${
                        slot.powerModifier > 0
                          ? 'bg-emerald-600 text-white'
                          : slot.powerModifier < 0
                          ? 'bg-amber-600 text-white'
                          : 'bg-red-600 text-white'
                      }`}
                    >
                      ⚔️ {slotPower}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickAdjustAvatarPower(idx, 1);
                      }}
                      title="เพิ่ม POWER +1"
                      className="opacity-0 group-hover:opacity-100 w-3.5 h-3.5 rounded bg-slate-950/90 hover:bg-emerald-700 text-white text-[8px] font-black flex items-center justify-center border border-slate-700 cursor-pointer transition-opacity"
                    >
                      +
                    </button>
                  </div>

                  {/* Rested Indicator */}
                  {slot.isRested && (
                    <div className="absolute top-0.5 left-0.5 px-1 py-0.2 rounded bg-amber-500 text-slate-950 text-[7px] font-black">
                      REST
                    </div>
                  )}

                  {/* Attached Modification Count */}
                  {slot.attachedModifications.length > 0 && (
                    <div className="absolute bottom-3.5 left-0.5 px-1 py-0.2 rounded bg-amber-950/90 border border-amber-400/60 text-amber-200 text-[7px] font-bold">
                      🗡️ +{slot.attachedModifications.length}
                    </div>
                  )}

                  {/* Enemy Target Outcome Overlay */}
                  {isEnemyOfActiveAttacker && (
                    <div className="absolute inset-0 bg-rose-950/65 backdrop-blur-[1px] flex flex-col items-center justify-center p-1 text-center z-20">
                      <Swords className="w-3.5 h-3.5 text-rose-300 animate-bounce" />
                      <span className="text-[8px] font-black text-white">คลิกโจมตี!</span>
                      <span
                        className={`mt-0.5 px-1 py-0.2 rounded text-[7px] font-extrabold ${
                          attackerPower > slotPower
                            ? 'bg-emerald-500 text-slate-950'
                            : attackerPower === slotPower
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-rose-600 text-white'
                        }`}
                      >
                        {attackerPower > slotPower
                          ? 'ชนะ!'
                          : attackerPower === slotPower
                          ? 'เสมอ (คู่)'
                          : 'แพ้'}
                      </span>
                    </div>
                  )}

                  {/* Modification Target Overlay */}
                  {canHighlightOccupiedAvatarForMod && (
                    <div className="absolute inset-0 bg-amber-950/60 flex flex-col items-center justify-center p-1 text-center z-20">
                      <span className="text-[8px] font-black text-amber-200">
                        🗡️ คลิกสวมใส่!
                      </span>
                    </div>
                  )}

                  {/* Hover Quick Action Strip */}
                  {!isEnemyOfActiveAttacker && !canHighlightOccupiedAvatarForMod && (
                    <div className="opacity-0 group-hover:opacity-100 absolute inset-x-0 bottom-3 bg-slate-950/90 border-y border-slate-700/80 py-0.5 px-0.5 flex items-center justify-around gap-0.5 z-10 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartAttackWithAvatar(idx, slot);
                        }}
                        title="เลือกเป้าหมายโจมตีบนกระดาน"
                        className="px-1 py-0.2 rounded bg-rose-600 hover:bg-rose-500 text-white text-[7px] font-extrabold flex items-center gap-0.5 cursor-pointer"
                      >
                        <Swords className="w-2 h-2" /> ตี
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickToggleAvatarRest(idx);
                        }}
                        title="สลับตั้งตรง (Stand) / ตะแคง (Rest)"
                        className="p-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 cursor-pointer"
                      >
                        <RotateCw className="w-2 h-2" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickDestroyAvatar(idx);
                        }}
                        title="ทำลายลงโซนนรก"
                        className="p-0.5 rounded bg-rose-950 hover:bg-rose-800 text-rose-300 cursor-pointer"
                      >
                        <Skull className="w-2 h-2" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClickAvatarSlot(idx, slot);
                        }}
                        title="เมนูจัดการ Avatar แบบละเอียด"
                        className="p-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                      >
                        <MoreHorizontal className="w-2 h-2" />
                      </button>
                    </div>
                  )}

                  <div className="absolute bottom-0 inset-x-0 bg-black/85 px-0.5 py-0.2 text-[7px] font-bold text-white truncate text-center">
                    {slot.card.name}
                  </div>
                </div>
              ) : (
                <div className="text-center px-0.5">
                  {canHighlightEmptyAvatarSlot ? (
                    <span className="text-[8px] font-extrabold text-emerald-300 flex flex-col items-center">
                      <Sparkles className="w-2.5 h-2.5" />
                      วาง #{idx + 1}
                    </span>
                  ) : (
                    <>
                      <span className="text-[8px] font-bold block leading-tight">
                        Avatar #{idx + 1}
                      </span>
                      {idx >= 4 && (
                        <span className="text-[7px] text-rose-300/75 block leading-tight">
                          (เสริม)
                        </span>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // Front Row: Construct Box + Avatar Box (Mirrored left/right per Rulebook diagram!)
  const renderFrontRow = () => (
    <div className="flex items-stretch justify-center gap-2 w-full">
      {isTopOpponentView ? (
        <>
          {renderAvatarBox()}
          {renderConstructBox()}
        </>
      ) : (
        <>
          {renderConstructBox()}
          {renderAvatarBox()}
        </>
      )}
    </div>
  );

  // ============================================================================
  // 4. BACK ROW: MAGIC ZONE (Blue Box per Rulebook diagram) + 💎 GEM ZONE (Drag & Drop Gem Slot!)
  // ============================================================================
  const renderBackRow = () => (
    <div className="flex items-stretch justify-center gap-2 w-full">
      {/* MAGIC ZONE (Blue Box per Rulebook diagram) */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => onDropCardToTarget(e, 'MAGIC')}
        onClick={() => {
          if (selectedHandCardForThisSide) {
            onDirectCastToMagicZone();
          }
        }}
        className={`flex-1 flex items-center justify-between gap-2 rounded-xl border-2 px-2.5 py-1 transition-all min-w-0 ${
          canHighlightMagicZone
            ? 'bg-sky-950/60 border-sky-300 ring-2 ring-sky-400/80 animate-pulse cursor-pointer'
            : 'bg-sky-950/35 border-sky-500/60'
        }`}
      >
        <div className="flex flex-col items-start shrink-0">
          <span className="text-[9px] font-black text-sky-300 flex items-center gap-1 tracking-wide uppercase">
            <Wand2 className="w-3 h-3 text-sky-400" /> MAGIC ZONE ({board.magicZone.length})
          </span>
          <span className="text-[8px] text-sky-200/70">
            {canHighlightMagicZone ? '✨ คลิกหรือลากมาร่ายเวทย์!' : 'โซนเวทมนตร์ (วางได้ไม่จำกัด)'}
          </span>
        </div>

        {board.magicZone.length === 0 ? (
          <div className="botc-magic-card rounded-lg border border-dashed border-sky-400/35 flex items-center justify-center text-[8px] text-sky-200/45 px-2">
            Magic
          </div>
        ) : (
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {board.magicZone.map((mCard) => (
              <div
                key={mCard.instanceId}
                data-testid={`magic-card-${mCard.instanceId}`}
                className="botc-magic-card relative rounded-lg overflow-hidden border border-sky-300/70 shrink-0 group"
              >
                <img
                  src={resolveCardImageUrl(mCard)}
                  onError={(e) => handleCardImageError(e, mCard.imageUrl, mCard)}
                  alt={mCard.name}
                  onClick={(e) => {
                    e.stopPropagation();
                    onInspectCard?.(mCard);
                  }}
                  className="w-full h-full object-cover cursor-pointer"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onResolveMagicToHell(mCard.instanceId);
                  }}
                  className="absolute inset-x-0 bottom-0 bg-rose-700/95 hover:bg-rose-600 text-white text-[7px] font-extrabold py-0.2 text-center cursor-pointer"
                >
                  ใช้เสร็จ → นรก
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 💎 GEM ZONE (ช่องวาง Gem — ลากการ์ดจากมือมาวางเป็น Gem ได้ทันที!) */}
      <div
        data-testid={`gem-zone-${board.id}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => onDropCardToTarget(e, 'GEM')}
        onClick={() => {
          if (selectedHandCardForThisSide) {
            onDirectPlaceToGemZone();
          }
        }}
        className={`flex items-center justify-between gap-2 rounded-xl border-2 px-2.5 py-1 transition-all shrink-0 ${
          canHighlightGemZone
            ? 'bg-cyan-950/75 border-cyan-300 ring-2 ring-cyan-400/80 animate-pulse cursor-pointer shadow-lg shadow-cyan-500/20'
            : 'bg-cyan-950/35 border-cyan-400/60 hover:border-cyan-300'
        }`}
      >
        <div className="flex flex-col items-start justify-between gap-0.5">
          <div className="flex items-center gap-1">
            <Gem className="w-3 h-3 text-cyan-300" />
            <span className="text-[9px] font-black text-cyan-200 tracking-wide uppercase">
              ช่อง GEM ({board.gemZone?.length || 0} ใบ)
            </span>
            <span
              data-testid={`gem-total-${board.id}`}
              className="px-1.5 py-0.2 rounded bg-cyan-500/25 border border-cyan-400/50 text-cyan-200 font-mono font-black text-[9px]"
            >
              💎 รวม: {totalGemInZone}
            </span>
          </div>

          <span className="text-[8px] text-cyan-200/75">
            {canHighlightGemZone
              ? '✨ ลากการ์ดมาปล่อย หรือคลิกที่นี่เพื่อวางเป็น Gem!'
              : 'ลากการ์ดจากมือมาวางเป็น Gem เพื่อจ่าย Cost'}
          </span>

          {(board.gemZone?.length || 0) > 0 && (
            <div className="flex items-center gap-1 pt-0.5">
              <button
                type="button"
                data-testid={`btn-flush-gem-${board.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onFlushGemZoneToHell();
                }}
                title="ส่งการ์ดในช่อง Gem ทั้งหมดลงโซนนรก (เมื่อใช้จ่าย Cost เสร็จ)"
                className="px-1.5 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[8px] font-extrabold flex items-center gap-0.5 cursor-pointer shadow"
              >
                <Flame className="w-2.5 h-2.5" /> ใช้ Gem ส่งลงนรก
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenZoneBrowser(
                    'GEM',
                    `${board.name} — การ์ดในช่อง Gem (${board.gemZone.length} ใบ • รวม 💎${totalGemInZone})`
                  );
                }}
                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-200 text-[8px] font-bold cursor-pointer"
              >
                จัดการ
              </button>
            </div>
          )}
        </div>

        {/* Cards currently placed in Gem Zone */}
        {(board.gemZone?.length || 0) === 0 ? (
          <div className="botc-magic-card rounded-lg border border-dashed border-cyan-400/45 bg-slate-950/50 flex flex-col items-center justify-center p-1 text-center">
            <Gem className="w-3.5 h-3.5 text-cyan-400/70 mb-0.5" />
            <span className="text-[7px] font-bold text-cyan-200/70 leading-tight">
              ลากวาง Gem
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1 overflow-x-auto max-w-[180px] no-scrollbar">
            {board.gemZone.map((gCard) => (
              <div
                key={gCard.instanceId}
                data-testid={`gem-card-${gCard.instanceId}`}
                className="botc-magic-card relative rounded-lg overflow-hidden border border-cyan-300 shadow group shrink-0"
              >
                <img
                  src={resolveCardImageUrl(gCard)}
                  onError={(e) => handleCardImageError(e, gCard.imageUrl, gCard)}
                  alt={gCard.name}
                  onClick={(e) => {
                    e.stopPropagation();
                    onInspectCard?.(gCard);
                  }}
                  className="w-full h-full object-cover cursor-pointer"
                />
                <div className="absolute top-0.5 right-0.5 px-1 py-0.2 rounded bg-slate-950/90 text-cyan-300 border border-cyan-400/60 font-mono font-black text-[8px]">
                  💎{gCard.gems ?? 1}
                </div>
                <div
                  className="opacity-0 group-hover:opacity-100 absolute inset-x-0 bottom-0 bg-slate-950/95 flex items-center justify-around py-0.5 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => onReturnGemCardToHand(gCard.instanceId)}
                    title="นำกลับขึ้นมือ"
                    className="text-[7px] font-bold text-emerald-300 hover:underline flex items-center cursor-pointer"
                  >
                    <Undo2 className="w-2 h-2" /> มือ
                  </button>
                  <button
                    type="button"
                    onClick={() => onSendGemCardToHell(gCard.instanceId)}
                    title="ส่งลงนรก"
                    className="text-[7px] font-bold text-rose-300 hover:underline cursor-pointer"
                  >
                    นรก
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div
      data-testid={`player-board-${board.id}`}
      className={`flex-1 min-h-0 w-full px-2.5 py-1 flex items-center justify-between gap-2 transition-colors ${
        isActiveTurn
          ? board.id === 'player1'
            ? 'bg-blue-950/15'
            : 'bg-rose-950/15'
          : ''
      }`}
    >
      {/* ======================================================================
          MIRRORED 3-COLUMN OFFICIAL RULEBOOK BOARD LAYOUT (Rectangle_47.png)
          - Bottom Player ("คุณ"):
              Left: LIFE CARD (5 horizontal cards stacked vertically)
              Center: Top = [CONSTRUCT + AVATAR ZONE] | Bottom = [MAGIC ZONE + GEM ZONE]
              Right: [นรก + DECK]
          - Top Opponent ("อีกฝ่าย", 180° rotated):
              Left: [DECK + นรก]
              Center: Top = [MAGIC ZONE + GEM ZONE] | Bottom = [AVATAR ZONE + CONSTRUCT]
              Right: LIFE CARD (5 horizontal cards stacked vertically)
          ====================================================================== */}
      {isTopOpponentView ? (
        <>
          {renderDeckAndHellColumn()}
          <div className="flex-1 flex flex-col items-center justify-center gap-1 min-w-0">
            {renderBackRow()}
            {renderFrontRow()}
          </div>
          {renderLifeCardColumn()}
        </>
      ) : (
        <>
          {renderLifeCardColumn()}
          <div className="flex-1 flex flex-col items-center justify-center gap-1 min-w-0">
            {renderFrontRow()}
            {renderBackRow()}
          </div>
          {renderDeckAndHellColumn()}
        </>
      )}
    </div>
  );
}
