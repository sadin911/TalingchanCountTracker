import { useState, useEffect, useCallback } from 'react';
import {
  Trophy,
  History,
  Hand,
  Eye,
  Sparkles,
  Flame,
  Swords,
  ChevronDown,
  ChevronUp,
  X,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { useDeckStore } from '../../store/deckStore.ts';
import type { Deck } from '../../types/deck.ts';
import type {
  AvatarSlotState,
  PlayerSide,
  PlaymatCardInstance,
  PlaymatState,
  PlaymatZoneName,
} from '../../types/playmat.ts';
import { STARTER_DECK_PRESETS } from '../../constants/starterDecks.ts';
import {
  createInitialPlaymatState,
  setupNewGame,
  drawCards,
  drawToThree,
  shufflePlayerDeck,
  setAvatarZoneLimit,
  summonAvatarWithCost,
  buildConstructWithCost,
  castMagicCard,
  playLandMagicCard,
  attachModificationToAvatar,
  placeCardIntoGemZone,
  flushGemZoneToHell,
  toggleAvatarRest,
  adjustAvatarPower,
  resolveAvatarCombat,
  attackLifeCard,
  flipLifeCard,
  destroyFieldSlotToZone,
  moveCardFromZone,
  setPhase,
  passTurn,
  swapPerspective,
  toggleRevealAllHands,
  flipCoin,
  getEffectiveAvatarPower,
} from '../../utils/talingchanTabletopHelper.ts';
import { resolveCardImageUrl, handleCardImageError } from '../../utils/cardImage.ts';
import { CenterSharedZone } from './CenterSharedZone.tsx';
import { PlayerBoardZone } from './PlayerBoardZone.tsx';
import { CostPaymentModal } from './CostPaymentModal.tsx';
import { CombatTargetModal } from './CombatTargetModal.tsx';
import { ZoneBrowserModal } from './ZoneBrowserModal.tsx';
import { PlaymatDeckSelectorModal } from './PlaymatDeckSelectorModal.tsx';
import { CardDetailModal } from '../collection/CardDetailModal.tsx';

export function PlaymatPage() {
  const customDecks = useDeckStore((s) => s.decks);
  const activeDeckId = useDeckStore((s) => s.activeDeckId);
  const pendingPlaymatDeckId = useDeckStore((s) => s.pendingPlaymatDeckId);
  const setPendingPlaymatDeck = useDeckStore((s) => s.setPendingPlaymatDeck);

  const initialP1Deck: Deck =
    customDecks.find((d) => d.id === (pendingPlaymatDeckId || activeDeckId)) ||
    customDecks[0] ||
    STARTER_DECK_PRESETS[0];
  const initialP2Deck: Deck = STARTER_DECK_PRESETS[1] || STARTER_DECK_PRESETS[0];

  const [p1Deck, setP1Deck] = useState<Deck>(initialP1Deck);
  const [p2Deck, setP2Deck] = useState<Deck>(initialP2Deck);

  const [state, setState] = useState<PlaymatState>(() =>
    setupNewGame(createInitialPlaymatState(initialP1Deck, initialP2Deck))
  );
  const [past, setPast] = useState<PlaymatState[]>([]);
  const [future, setFuture] = useState<PlaymatState[]>([]);
  const [autoSwapOnPass, setAutoSwapOnPass] = useState<boolean>(true);
  const [isHandMinimized, setIsHandMinimized] = useState<boolean>(false);

  // Tabletop Direct Selection State (Balatro-style Hand Fan + Board Target Highlight)
  const [activeHandSelection, setActiveHandSelection] = useState<{
    side: PlayerSide;
    card: PlaymatCardInstance;
  } | null>(null);
  const [selectedCostCardIds, setSelectedCostCardIds] = useState<string[]>([]);
  const [draggedHandCard, setDraggedHandCard] = useState<{
    side: PlayerSide;
    card: PlaymatCardInstance;
  } | null>(null);

  // Direct Board Attack Targeting State
  const [activeAttacker, setActiveAttacker] = useState<{
    side: PlayerSide;
    slotIndex: number;
    slot: AvatarSlotState;
  } | null>(null);

  // Detailed Modals (when player clicks "เมนูเต็ม" or clicks an Avatar for full options)
  const [modalHandCard, setModalHandCard] = useState<{
    side: PlayerSide;
    card: PlaymatCardInstance;
  } | null>(null);
  const [selectedAvatarSlot, setSelectedAvatarSlot] = useState<{
    side: PlayerSide;
    slotIndex: number;
    slot: AvatarSlotState;
  } | null>(null);
  const [zoneBrowser, setZoneBrowser] = useState<{
    side: PlayerSide;
    zone: PlaymatZoneName;
    title: string;
    topLimit?: number;
  } | null>(null);
  const [showDeckSelector, setShowDeckSelector] = useState(false);
  const [inspectCard, setInspectCard] = useState<PlaymatCardInstance | null>(null);

  useEffect(() => {
    if (pendingPlaymatDeckId) {
      const target = customDecks.find((d) => d.id === pendingPlaymatDeckId);
      if (target) {
        setP1Deck(target);
        setState((prev) => setupNewGame(prev, target, p2Deck));
        setPast([]);
        setFuture([]);
      }
      setPendingPlaymatDeck(null);
    }
  }, [pendingPlaymatDeckId, customDecks, p2Deck, setPendingPlaymatDeck]);

  const clearSelections = useCallback(() => {
    setActiveHandSelection(null);
    setSelectedCostCardIds([]);
    setActiveAttacker(null);
    setDraggedHandCard(null);
  }, []);

  const commitState = useCallback(
    (next: PlaymatState) => {
      setState((current) => {
        setPast((p) => [...p.slice(-29), current]);
        setFuture([]);
        return next;
      });
      clearSelections();
    },
    [clearSelections]
  );

  const handleUndo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p;
      const previous = p[p.length - 1];
      setState((current) => {
        setFuture((f) => [current, ...f]);
        return previous;
      });
      return p.slice(0, -1);
    });
    clearSelections();
  }, [clearSelections]);

  const handleRedo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[0];
      setState((current) => {
        setPast((p) => [...p, current]);
        return next;
      });
      return f.slice(1);
    });
    clearSelections();
  }, [clearSelections]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'Escape') {
        clearSelections();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }
      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        commitState(swapPerspective(state));
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        commitState(drawCards(state, state.perspective, 1));
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        const activeBoard = state[state.perspective];
        setZoneBrowser({
          side: state.perspective,
          zone: 'DECK',
          title: `${activeBoard.name} — ค้นหากองการ์ดหลัก (${activeBoard.deck.length} ใบ)`,
        });
      } else if (e.key === ' ') {
        e.preventDefault();
        commitState(passTurn(state, autoSwapOnPass));
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state, autoSwapOnPass, commitState, handleUndo, handleRedo, clearSelections]);

  const bottomSide: PlayerSide = state.perspective;
  const topSide: PlayerSide = bottomSide === 'player1' ? 'player2' : 'player1';
  const bottomBoard = state[bottomSide];
  const topBoard = state[topSide];

  // Active card being placed (either clicked in hand or dragged from hand)
  const effectivePendingHandCard = activeHandSelection || draggedHandCard;

  const toggleCostCard = (instanceId: string) => {
    setSelectedCostCardIds((prev) =>
      prev.includes(instanceId) ? prev.filter((id) => id !== instanceId) : [...prev, instanceId]
    );
  };

  // Calculate total Gems of selected cost cards
  const selectedHandBoard = effectivePendingHandCard
    ? state[effectivePendingHandCard.side]
    : bottomBoard;
  const totalSelectedGems = selectedHandBoard.hand
    .filter((c) => selectedCostCardIds.includes(c.instanceId))
    .reduce((sum, c) => sum + (c.gems ?? 1), 0);

  // Drop handler for board zones
  const handleDropCardToTarget = (
    side: PlayerSide,
    e: React.DragEvent,
    targetZone: 'AVATAR' | 'CONSTRUCT' | 'MAGIC' | 'GEM' | 'HELL' | 'DARK',
    slotIndex?: number
  ) => {
    e.preventDefault();
    const pending = draggedHandCard || activeHandSelection;
    if (!pending || pending.side !== side) return;

    if (targetZone === 'AVATAR') {
      const targetSlot = state[side].avatarZone[slotIndex ?? -1];
      if (targetSlot && pending.card.cardType === 'Modification' && slotIndex !== undefined) {
        commitState(attachModificationToAvatar(state, side, pending.card.instanceId, slotIndex));
      } else {
        commitState(
          summonAvatarWithCost(
            state,
            side,
            pending.card.instanceId,
            selectedCostCardIds,
            slotIndex
          )
        );
      }
    } else if (targetZone === 'CONSTRUCT') {
      commitState(
        buildConstructWithCost(
          state,
          side,
          pending.card.instanceId,
          selectedCostCardIds,
          slotIndex
        )
      );
    } else if (targetZone === 'MAGIC') {
      commitState(castMagicCard(state, side, pending.card.instanceId));
    } else if (targetZone === 'GEM') {
      commitState(placeCardIntoGemZone(state, side, pending.card.instanceId));
    } else if (targetZone === 'HELL') {
      commitState(moveCardFromZone(state, side, 'HAND', 'HELL', pending.card.instanceId));
    } else if (targetZone === 'DARK') {
      commitState(moveCardFromZone(state, side, 'HAND', 'DARK', pending.card.instanceId));
    }
  };

  return (
    <div
      className="relative h-full w-full flex flex-col justify-between overflow-hidden playmat-felt-surface select-none"
      data-testid="playmat-page"
    >
      {/* Victory Overlay Banner if someone's Life Cards reached 0 */}
      {state.winner && (
        <div
          data-testid="playmat-victory-banner"
          className="absolute top-12 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-amber-600/95 via-rose-600/95 to-amber-600/95 border-2 border-amber-300 rounded-2xl px-5 py-3 flex items-center gap-4 shadow-2xl"
        >
          <Trophy className="w-7 h-7 text-amber-200 shrink-0 animate-bounce" />
          <div>
            <h2 className="text-sm font-extrabold text-white">
              🎉 จบเกม!{' '}
              {state.winner.side === 'player1' ? state.player1.name : state.player2.name}{' '}
              เป็นฝ่ายชนะ!
            </h2>
            <p className="text-[11px] text-amber-100">{state.winner.reason}</p>
          </div>
          <button
            type="button"
            onClick={() => commitState(setupNewGame(state, p1Deck, p2Deck))}
            className="px-3.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-300 font-extrabold text-xs cursor-pointer"
          >
            เริ่มเกมใหม่อีกครั้ง
          </button>
        </div>
      )}

      {/* ====================================================================
          TOP OPPONENT HAND BAR (Face-Down Fan or Revealed Practice Hand)
          ==================================================================== */}
      {state.soloRevealAllHands ? (
        <div
          data-testid="revealed-opponent-hand"
          className="w-full bg-slate-950/85 border-b border-amber-500/30 px-3 py-1 flex items-center justify-between gap-2 shrink-0 z-20"
        >
          <span className="text-[10px] font-extrabold text-amber-300 flex items-center gap-1 shrink-0">
            <Eye className="w-3.5 h-3.5" />
            มือของ {topBoard.name} ({topBoard.hand.length} ใบ — คลิกเพื่อเลือกเล่น)
          </span>

          <div className="flex items-center justify-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {topBoard.hand.map((card) => {
              const isSelected = activeHandSelection?.card.instanceId === card.instanceId;
              return (
                <button
                  key={card.instanceId}
                  type="button"
                  draggable
                  onDragStart={() => setDraggedHandCard({ side: topSide, card })}
                  onDragEnd={() => setDraggedHandCard(null)}
                  onClick={() => {
                    if (isSelected) {
                      clearSelections();
                    } else {
                      setActiveHandSelection({ side: topSide, card });
                      setSelectedCostCardIds([]);
                    }
                  }}
                  className={`relative h-11 aspect-[2.5/3.5] rounded-md overflow-hidden border transition-all cursor-pointer shrink-0 ${
                    isSelected
                      ? 'border-amber-400 ring-2 ring-amber-400 -translate-y-0.5 scale-105'
                      : 'border-slate-700 hover:border-amber-400'
                  }`}
                  title={`${card.name} (Cost ${card.cost ?? 0} • 💎${card.gems ?? 1})`}
                >
                  <img
                    src={resolveCardImageUrl(card)}
                    onError={(e) => handleCardImageError(e, card.imageUrl, card)}
                    alt={card.name}
                    className="w-full h-full object-cover"
                  />
                </button>
              );
            })}
          </div>

          <span className="text-[9px] text-slate-400 hidden md:inline shrink-0">
            คลิกการ์ดแล้วคลิกช่องบนกระดาน {topBoard.name} เพื่อวางทันที
          </span>
        </div>
      ) : (
        <div className="w-full flex items-center justify-center gap-2 py-0.5 bg-slate-950/60 border-b border-slate-800/60 shrink-0 z-10">
          <span className="text-[9px] font-bold text-slate-400">
            {topBoard.id === 'player1' ? '🔵 P1' : '🔴 P2'} {topBoard.name} ({topBoard.deckName}) •
            ✋ มือ {topBoard.hand.length} ใบ
          </span>
          <div className="flex items-center justify-center">
            {topBoard.hand.slice(0, 10).map((c, idx) => (
              <div
                key={c.instanceId}
                style={{ marginLeft: idx === 0 ? 0 : '-6px' }}
                className="w-4 h-5 rounded-sm bg-gradient-to-br from-rose-900 to-slate-900 border border-rose-500/40 shadow-sm"
              />
            ))}
          </div>
        </div>
      )}

      {/* ====================================================================
          1. TOP PLAYER BOARD (Mirrored so Avatar Row faces Center Line)
          ==================================================================== */}
      <PlayerBoardZone
        board={topBoard}
        isTopOpponentView
        isActiveTurn={state.currentTurn === topSide}
        selectedHandCardForThisSide={
          effectivePendingHandCard?.side === topSide ? effectivePendingHandCard.card : null
        }
        activeAttacker={activeAttacker}
        onDrawOne={() => commitState(drawCards(state, topSide, 1))}
        onDrawToThree={() => commitState(drawToThree(state, topSide))}
        onShuffleDeck={() => commitState(shufflePlayerDeck(state, topSide))}
        onChangeAvatarZoneLimit={(limit) => commitState(setAvatarZoneLimit(state, topSide, limit))}
        onClickAvatarSlot={(slotIndex, slot) =>
          setSelectedAvatarSlot({ side: topSide, slotIndex, slot })
        }
        onQuickAdjustAvatarPower={(slotIndex, delta) =>
          commitState(adjustAvatarPower(state, topSide, slotIndex, delta))
        }
        onQuickToggleAvatarRest={(slotIndex) =>
          commitState(toggleAvatarRest(state, topSide, slotIndex))
        }
        onQuickDestroyAvatar={(slotIndex) =>
          commitState(destroyFieldSlotToZone(state, topSide, 'AVATAR', slotIndex, 'HELL'))
        }
        onStartAttackWithAvatar={(slotIndex, slot) => {
          setActiveAttacker((prev) =>
            prev?.side === topSide && prev?.slotIndex === slotIndex
              ? null
              : { side: topSide, slotIndex, slot }
          );
          setActiveHandSelection(null);
        }}
        onSelectAttackTargetAvatar={(defenderSlotIndex) => {
          if (!activeAttacker) return;
          commitState(
            resolveAvatarCombat(
              state,
              activeAttacker.side,
              activeAttacker.slotIndex,
              defenderSlotIndex
            )
          );
        }}
        onSelectAttackTargetLife={(lifeIndex) => {
          if (!activeAttacker) return;
          commitState(
            attackLifeCard(
              state,
              activeAttacker.side,
              activeAttacker.slotIndex,
              lifeIndex,
              'DESTROY'
            )
          );
        }}
        onDirectPlaceOnAvatarSlot={(slotIndex) => {
          if (!effectivePendingHandCard || effectivePendingHandCard.side !== topSide) return;
          commitState(
            summonAvatarWithCost(
              state,
              topSide,
              effectivePendingHandCard.card.instanceId,
              selectedCostCardIds,
              slotIndex
            )
          );
        }}
        onDirectAttachToAvatarSlot={(slotIndex) => {
          if (!effectivePendingHandCard || effectivePendingHandCard.side !== topSide) return;
          commitState(
            attachModificationToAvatar(
              state,
              topSide,
              effectivePendingHandCard.card.instanceId,
              slotIndex
            )
          );
        }}
        onDirectPlaceOnConstructSlot={(slotIndex) => {
          if (!effectivePendingHandCard || effectivePendingHandCard.side !== topSide) return;
          commitState(
            buildConstructWithCost(
              state,
              topSide,
              effectivePendingHandCard.card.instanceId,
              selectedCostCardIds,
              slotIndex
            )
          );
        }}
        onDirectCastToMagicZone={() => {
          if (!effectivePendingHandCard || effectivePendingHandCard.side !== topSide) return;
          commitState(castMagicCard(state, topSide, effectivePendingHandCard.card.instanceId));
        }}
        onDirectPlaceToGemZone={() => {
          if (!effectivePendingHandCard || effectivePendingHandCard.side !== topSide) return;
          commitState(
            placeCardIntoGemZone(state, topSide, effectivePendingHandCard.card.instanceId)
          );
        }}
        onFlushGemZoneToHell={() => commitState(flushGemZoneToHell(state, topSide))}
        onReturnGemCardToHand={(instanceId) =>
          commitState(moveCardFromZone(state, topSide, 'GEM', 'HAND', instanceId))
        }
        onSendGemCardToHell={(instanceId) =>
          commitState(moveCardFromZone(state, topSide, 'GEM', 'HELL', instanceId))
        }
        onDirectDiscardToHellZone={() => {
          if (!effectivePendingHandCard || effectivePendingHandCard.side !== topSide) return;
          commitState(
            moveCardFromZone(
              state,
              topSide,
              'HAND',
              'HELL',
              effectivePendingHandCard.card.instanceId
            )
          );
        }}
        onDropCardToTarget={(e, zone, slotIndex) =>
          handleDropCardToTarget(topSide, e, zone, slotIndex)
        }
        onRemoveConstructSlot={(slotIndex) =>
          commitState(destroyFieldSlotToZone(state, topSide, 'CONSTRUCT', slotIndex, 'HELL'))
        }
        onResolveMagicToHell={(instanceId) =>
          commitState(moveCardFromZone(state, topSide, 'MAGIC', 'HELL', instanceId))
        }
        onFlipLifeCard={(idx) => commitState(flipLifeCard(state, topSide, idx))}
        onDestroyLifeCardToHell={(idx) => {
          const target = topBoard.lifeZone[idx];
          if (target) {
            commitState(moveCardFromZone(state, topSide, 'LIFE', 'HELL', target.instanceId));
          }
        }}
        onAddLifeCardToHand={(idx) => {
          const target = topBoard.lifeZone[idx];
          if (target) {
            commitState(moveCardFromZone(state, topSide, 'LIFE', 'HAND', target.instanceId));
          }
        }}
        onOpenZoneBrowser={(zone, title, topLimit) =>
          setZoneBrowser({ side: topSide, zone, title, topLimit })
        }
        onInspectCard={(card) => setInspectCard(card)}
      />

      {/* ====================================================================
          2. CENTER SHARED DIVIDER (Land Magic, Phase Stepper, Turn & Solo Controls)
          ==================================================================== */}
      <CenterSharedZone
        currentTurn={state.currentTurn}
        turnNumber={state.turnNumber}
        phase={state.phase}
        perspective={state.perspective}
        soloRevealAllHands={state.soloRevealAllHands}
        autoSwapOnPass={autoSwapOnPass}
        landMagicZone={state.landMagicZone}
        lastCoinFlip={state.lastCoinFlip}
        canUndo={past.length > 0}
        canRedo={future.length > 0}
        p1HandCount={state.player1.hand.length}
        p2HandCount={state.player2.hand.length}
        isLandHighlight={Boolean(
          effectivePendingHandCard &&
            ['Land Magic', 'Magic', 'Normal Magic'].includes(
              effectivePendingHandCard.card.cardType
            )
        )}
        onSetPhase={(p) => commitState(setPhase(state, p))}
        onPassTurn={() => commitState(passTurn(state, autoSwapOnPass))}
        onSwapPerspective={(target) => commitState(swapPerspective(state, target))}
        onToggleRevealAllHands={() => commitState(toggleRevealAllHands(state))}
        onToggleAutoSwap={() => setAutoSwapOnPass((v) => !v)}
        onFlipCoin={() => commitState(flipCoin(state))}
        onClearLandMagic={() => {
          if (state.landMagicZone) {
            commitState(
              moveCardFromZone(
                state,
                state.landMagicZone.owner,
                'LAND',
                'HELL',
                state.landMagicZone.card.instanceId
              )
            );
          }
        }}
        onClickLandMagicSlot={() => {
          if (effectivePendingHandCard) {
            commitState(
              playLandMagicCard(
                state,
                effectivePendingHandCard.side,
                effectivePendingHandCard.card.instanceId
              )
            );
          } else if (state.landMagicZone) {
            setInspectCard(state.landMagicZone.card);
          }
        }}
        onDropOnLandMagicSlot={(e) => {
          e.preventDefault();
          const pending = draggedHandCard || activeHandSelection;
          if (pending) {
            commitState(playLandMagicCard(state, pending.side, pending.card.instanceId));
          }
        }}
        onInspectCard={(card) => setInspectCard(card)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onResetGame={() => commitState(setupNewGame(state, p1Deck, p2Deck))}
        onOpenDeckSelector={() => setShowDeckSelector(true)}
      />

      {/* ====================================================================
          3. BOTTOM PLAYER BOARD (Active Perspective Player)
          ==================================================================== */}
      <PlayerBoardZone
        board={bottomBoard}
        isActiveTurn={state.currentTurn === bottomSide}
        selectedHandCardForThisSide={
          effectivePendingHandCard?.side === bottomSide ? effectivePendingHandCard.card : null
        }
        activeAttacker={activeAttacker}
        onDrawOne={() => commitState(drawCards(state, bottomSide, 1))}
        onDrawToThree={() => commitState(drawToThree(state, bottomSide))}
        onShuffleDeck={() => commitState(shufflePlayerDeck(state, bottomSide))}
        onChangeAvatarZoneLimit={(limit) =>
          commitState(setAvatarZoneLimit(state, bottomSide, limit))
        }
        onClickAvatarSlot={(slotIndex, slot) =>
          setSelectedAvatarSlot({ side: bottomSide, slotIndex, slot })
        }
        onQuickAdjustAvatarPower={(slotIndex, delta) =>
          commitState(adjustAvatarPower(state, bottomSide, slotIndex, delta))
        }
        onQuickToggleAvatarRest={(slotIndex) =>
          commitState(toggleAvatarRest(state, bottomSide, slotIndex))
        }
        onQuickDestroyAvatar={(slotIndex) =>
          commitState(destroyFieldSlotToZone(state, bottomSide, 'AVATAR', slotIndex, 'HELL'))
        }
        onStartAttackWithAvatar={(slotIndex, slot) => {
          setActiveAttacker((prev) =>
            prev?.side === bottomSide && prev?.slotIndex === slotIndex
              ? null
              : { side: bottomSide, slotIndex, slot }
          );
          setActiveHandSelection(null);
        }}
        onSelectAttackTargetAvatar={(defenderSlotIndex) => {
          if (!activeAttacker) return;
          commitState(
            resolveAvatarCombat(
              state,
              activeAttacker.side,
              activeAttacker.slotIndex,
              defenderSlotIndex
            )
          );
        }}
        onSelectAttackTargetLife={(lifeIndex) => {
          if (!activeAttacker) return;
          commitState(
            attackLifeCard(
              state,
              activeAttacker.side,
              activeAttacker.slotIndex,
              lifeIndex,
              'DESTROY'
            )
          );
        }}
        onDirectPlaceOnAvatarSlot={(slotIndex) => {
          if (!effectivePendingHandCard || effectivePendingHandCard.side !== bottomSide) return;
          commitState(
            summonAvatarWithCost(
              state,
              bottomSide,
              effectivePendingHandCard.card.instanceId,
              selectedCostCardIds,
              slotIndex
            )
          );
        }}
        onDirectAttachToAvatarSlot={(slotIndex) => {
          if (!effectivePendingHandCard || effectivePendingHandCard.side !== bottomSide) return;
          commitState(
            attachModificationToAvatar(
              state,
              bottomSide,
              effectivePendingHandCard.card.instanceId,
              slotIndex
            )
          );
        }}
        onDirectPlaceOnConstructSlot={(slotIndex) => {
          if (!effectivePendingHandCard || effectivePendingHandCard.side !== bottomSide) return;
          commitState(
            buildConstructWithCost(
              state,
              bottomSide,
              effectivePendingHandCard.card.instanceId,
              selectedCostCardIds,
              slotIndex
            )
          );
        }}
        onDirectCastToMagicZone={() => {
          if (!effectivePendingHandCard || effectivePendingHandCard.side !== bottomSide) return;
          commitState(castMagicCard(state, bottomSide, effectivePendingHandCard.card.instanceId));
        }}
        onDirectPlaceToGemZone={() => {
          if (!effectivePendingHandCard || effectivePendingHandCard.side !== bottomSide) return;
          commitState(
            placeCardIntoGemZone(state, bottomSide, effectivePendingHandCard.card.instanceId)
          );
        }}
        onFlushGemZoneToHell={() => commitState(flushGemZoneToHell(state, bottomSide))}
        onReturnGemCardToHand={(instanceId) =>
          commitState(moveCardFromZone(state, bottomSide, 'GEM', 'HAND', instanceId))
        }
        onSendGemCardToHell={(instanceId) =>
          commitState(moveCardFromZone(state, bottomSide, 'GEM', 'HELL', instanceId))
        }
        onDirectDiscardToHellZone={() => {
          if (!effectivePendingHandCard || effectivePendingHandCard.side !== bottomSide) return;
          commitState(
            moveCardFromZone(
              state,
              bottomSide,
              'HAND',
              'HELL',
              effectivePendingHandCard.card.instanceId
            )
          );
        }}
        onDropCardToTarget={(e, zone, slotIndex) =>
          handleDropCardToTarget(bottomSide, e, zone, slotIndex)
        }
        onRemoveConstructSlot={(slotIndex) =>
          commitState(destroyFieldSlotToZone(state, bottomSide, 'CONSTRUCT', slotIndex, 'HELL'))
        }
        onResolveMagicToHell={(instanceId) =>
          commitState(moveCardFromZone(state, bottomSide, 'MAGIC', 'HELL', instanceId))
        }
        onFlipLifeCard={(idx) => commitState(flipLifeCard(state, bottomSide, idx))}
        onDestroyLifeCardToHell={(idx) => {
          const target = bottomBoard.lifeZone[idx];
          if (target) {
            commitState(moveCardFromZone(state, bottomSide, 'LIFE', 'HELL', target.instanceId));
          }
        }}
        onAddLifeCardToHand={(idx) => {
          const target = bottomBoard.lifeZone[idx];
          if (target) {
            commitState(moveCardFromZone(state, bottomSide, 'LIFE', 'HAND', target.instanceId));
          }
        }}
        onOpenZoneBrowser={(zone, title, topLimit) =>
          setZoneBrowser({ side: bottomSide, zone, title, topLimit })
        }
        onInspectCard={(card) => setInspectCard(card)}
      />

      {/* ====================================================================
          4. BALATRO-STYLE BOTTOM HAND CONSOLE & FLOATING ACTION PILL
          ==================================================================== */}
      <div
        data-testid="active-hand-tray"
        className="relative w-full bg-slate-950/95 border-t border-slate-800/90 shadow-2xl z-30 shrink-0"
      >
        {/* Floating Action Pill when an Avatar on the Board is in Direct Attack Target Mode */}
        {activeAttacker && (
          <div className="w-full flex items-center justify-center px-3 py-1 bg-rose-950/95 border-b border-rose-500/50 gap-2 flex-wrap">
            <span className="text-xs font-extrabold text-rose-200 flex items-center gap-1.5">
              <Swords className="w-4 h-4 text-rose-400 animate-bounce" />
              โหมดสั่งโจมตีด้วย &ldquo;{activeAttacker.slot.card.name}&rdquo; (POWER{' '}
              {getEffectiveAvatarPower(activeAttacker.slot)}) — คลิกที่ Avatar หรือ Life Card
              ของฝ่ายตรงข้ามบนกระดานเพื่อโจมตีทันที!
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedAvatarSlot(activeAttacker);
                setActiveAttacker(null);
              }}
              className="px-2.5 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold cursor-pointer"
            >
              เปิดหน้าต่างตัวเลือกโจมตี
            </button>
            <button
              type="button"
              onClick={() => setActiveAttacker(null)}
              className="px-2 py-0.5 rounded-lg bg-rose-800 hover:bg-rose-700 text-white text-[10px] font-bold cursor-pointer flex items-center gap-0.5"
            >
              <X className="w-3 h-3" /> ยกเลิก
            </button>
          </div>
        )}

        {/* Floating Action Pill when a Hand Card is Selected (Balatro-Style Action Bar + Inline Cost Picker) */}
        {activeHandSelection && (
          <div
            data-testid="cost-payment-modal"
            className="w-full bg-[#12172b] border-b border-emerald-500/40 px-3 py-1.5 flex flex-col gap-1.5 shadow-xl"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              {/* Selected Card Summary */}
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[10px] font-extrabold">
                  การ์ดที่เลือก: {activeHandSelection.card.name}
                </span>
                <span className="text-[10px] text-amber-300 font-mono font-bold">
                  Cost {activeHandSelection.card.cost ?? 0} • 💎{activeHandSelection.card.gems ?? 1}
                </span>
                <span className="text-[10px] text-slate-400 hidden lg:inline">
                  👉 คลิกช่องที่กระพริบบนกระดานเพื่อวางทันที หรือกดปุ่มทางขวา:
                </span>
              </div>

              {/* 1-Click Action Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  data-testid="btn-confirm-summon-avatar"
                  onClick={() =>
                    commitState(
                      summonAvatarWithCost(
                        state,
                        activeHandSelection.side,
                        activeHandSelection.card.instanceId,
                        selectedCostCardIds
                      )
                    )
                  }
                  className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-extrabold shadow cursor-pointer flex items-center gap-1"
                >
                  ⚡ ลง Avatar ทันที
                  {selectedCostCardIds.length > 0 && ` (จ่าย Cost ${selectedCostCardIds.length} ใบ)`}
                </button>

                <button
                  type="button"
                  data-testid="btn-confirm-build-construct"
                  onClick={() =>
                    commitState(
                      buildConstructWithCost(
                        state,
                        activeHandSelection.side,
                        activeHandSelection.card.instanceId,
                        selectedCostCardIds
                      )
                    )
                  }
                  className="px-2.5 py-1 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-[11px] font-extrabold shadow cursor-pointer"
                >
                  🏗️ ลง Construct
                </button>

                <button
                  type="button"
                  data-testid="btn-confirm-cast-magic"
                  onClick={() =>
                    commitState(
                      castMagicCard(
                        state,
                        activeHandSelection.side,
                        activeHandSelection.card.instanceId
                      )
                    )
                  }
                  className="px-2.5 py-1 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-extrabold shadow cursor-pointer"
                >
                  🪄 ร่าย Magic
                </button>

                <button
                  type="button"
                  data-testid="btn-confirm-play-land"
                  onClick={() =>
                    commitState(
                      playLandMagicCard(
                        state,
                        activeHandSelection.side,
                        activeHandSelection.card.instanceId
                      )
                    )
                  }
                  className="px-2.5 py-1 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-extrabold shadow cursor-pointer"
                >
                  🏞️ วาง Land Magic
                </button>

                <button
                  type="button"
                  data-testid="btn-place-as-gem"
                  onClick={() =>
                    commitState(
                      placeCardIntoGemZone(
                        state,
                        activeHandSelection.side,
                        activeHandSelection.card.instanceId
                      )
                    )
                  }
                  className="px-2.5 py-1 rounded-xl bg-cyan-700 hover:bg-cyan-600 border border-cyan-300/60 text-white text-[11px] font-extrabold shadow cursor-pointer"
                >
                  💎 วางเป็น Gem (+{activeHandSelection.card.gems ?? 1})
                </button>

                <button
                  type="button"
                  data-testid="btn-discard-to-hell"
                  onClick={() =>
                    commitState(
                      moveCardFromZone(
                        state,
                        activeHandSelection.side,
                        'HAND',
                        'HELL',
                        activeHandSelection.card.instanceId
                      )
                    )
                  }
                  className="px-2 py-1 rounded-xl bg-purple-900/90 hover:bg-purple-800 border border-purple-500/40 text-purple-200 text-[10px] font-bold cursor-pointer"
                >
                  🗑️ ทิ้งลงนรก
                </button>

                <button
                  type="button"
                  onClick={() => setInspectCard(activeHandSelection.card)}
                  className="px-2 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold cursor-pointer flex items-center gap-0.5"
                >
                  <Search className="w-3 h-3" /> ดูการ์ด
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setModalHandCard(activeHandSelection);
                    clearSelections();
                  }}
                  className="px-2 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-bold cursor-pointer flex items-center gap-0.5"
                >
                  <SlidersHorizontal className="w-3 h-3" /> เมนูเต็ม
                </button>

                <button
                  type="button"
                  onClick={clearSelections}
                  className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                  title="ยกเลิกการเลือก (Esc)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Inline Quick Cost Picker Strip (Click cards to discard as Cost to Hell Zone) */}
            {selectedHandBoard.hand.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-0.5 border-t border-slate-800/80">
                <span className="text-[10px] font-bold text-amber-300 flex items-center gap-1 shrink-0">
                  <Flame className="w-3 h-3 text-rose-400" />
                  เลือกการ์ดจ่าย Cost ลงนรก (💎 รวม {totalSelectedGems}/
                  {activeHandSelection.card.cost ?? 0}):
                </span>
                {selectedHandBoard.hand
                  .filter((c) => c.instanceId !== activeHandSelection.card.instanceId)
                  .map((c) => {
                    const isPicked = selectedCostCardIds.includes(c.instanceId);
                    return (
                      <button
                        key={c.instanceId}
                        type="button"
                        data-testid={`cost-card-${c.instanceId}`}
                        onClick={() => toggleCostCard(c.instanceId)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border flex items-center gap-1 shrink-0 cursor-pointer transition-all ${
                          isPicked
                            ? 'bg-rose-600 text-white border-rose-300 shadow'
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-amber-400'
                        }`}
                      >
                        <span>{c.name}</span>
                        <span className="text-cyan-300 font-mono">💎{c.gems ?? 1}</span>
                        {isPicked && <span className="text-[9px] font-black">✓ จ่าย</span>}
                      </button>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* Console Header Bar: Active Hand Identity + Quick Draw + Action Log Ticker + Minimize */}
        <div className="flex items-center justify-between gap-2 px-3 py-1 bg-slate-900/90 border-b border-slate-800/70">
          <div className="flex items-center gap-2 min-w-0">
            <Hand className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="text-xs font-extrabold text-white truncate">
              มือของ {bottomBoard.name} ({bottomBoard.hand.length} ใบ)
            </span>
            <button
              type="button"
              onClick={() => commitState(drawToThree(state, bottomSide))}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-teal-900/80 hover:bg-teal-800 border border-teal-500/40 text-teal-200 text-[10px] font-bold cursor-pointer shrink-0"
            >
              <Sparkles className="w-3 h-3" /> จั่วครบ 3
            </button>
            <button
              type="button"
              onClick={() => commitState(drawCards(state, bottomSide, 1))}
              className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold cursor-pointer shrink-0"
            >
              + จั่ว 1 (D)
            </button>
          </div>

          {/* Live Action Log Ticker */}
          <div className="hidden md:flex items-center gap-1.5 text-[10px] text-slate-400 truncate max-w-md">
            <History className="w-3 h-3 text-rose-400 shrink-0" />
            <span className="truncate">{state.actionLog[0] || 'พร้อมซ้อม'}</span>
          </div>

          <button
            type="button"
            onClick={() => setIsHandMinimized((v) => !v)}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold cursor-pointer shrink-0"
          >
            {isHandMinimized ? (
              <>
                <ChevronUp className="w-3 h-3" /> แสดงมือ ({bottomBoard.hand.length})
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" /> ย่อมือ
              </>
            )}
          </button>
        </div>

        {/* Balatro-Style Fanned Hand Cards Tray */}
        {!isHandMinimized && (
          <div className="px-4 py-1.5 flex items-center justify-center overflow-x-auto no-scrollbar min-h-[104px]">
            {bottomBoard.hand.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-500">
                ไม่มีการ์ดบนมือ — กดปุ่ม &ldquo;จั่วครบ 3&rdquo; หรือคลิกที่กองเด็คเพื่อจั่วการ์ด
              </div>
            ) : (
              <div className="flex items-center justify-center py-1">
                {bottomBoard.hand.map((card, idx) => {
                  const total = bottomBoard.hand.length;
                  const mid = (total - 1) / 2;
                  const offset = idx - mid;
                  const rotateDeg = total > 1 ? Math.max(-8, Math.min(8, offset * 1.8)) : 0;
                  const isSelected = activeHandSelection?.card.instanceId === card.instanceId;
                  const isMarkedAsCost = selectedCostCardIds.includes(card.instanceId);

                  return (
                    <div
                      key={card.instanceId}
                      data-testid={`hand-card-${card.instanceId}`}
                      draggable
                      onDragStart={() => {
                        setDraggedHandCard({ side: bottomSide, card });
                        setActiveHandSelection({ side: bottomSide, card });
                      }}
                      onDragEnd={() => setDraggedHandCard(null)}
                      onClick={() => {
                        if (isSelected) {
                          clearSelections();
                        } else {
                          setActiveHandSelection({ side: bottomSide, card });
                          setSelectedCostCardIds([]);
                          setActiveAttacker(null);
                        }
                      }}
                      style={{
                        marginLeft: idx === 0 ? '0px' : total > 7 ? '-14px' : '-6px',
                        transform: isSelected
                          ? 'translateY(-12px) scale(1.08)'
                          : `rotate(${rotateDeg}deg)`,
                      }}
                      className={`group relative h-24 sm:h-28 aspect-[2.5/3.5] rounded-xl overflow-hidden bg-[#181d35] border-2 transition-all duration-150 shadow-xl cursor-pointer shrink-0 hover:z-30 hover:-translate-y-3 hover:scale-105 ${
                        isSelected
                          ? 'border-emerald-400 ring-2 ring-emerald-400 z-30 shadow-emerald-500/30'
                          : isMarkedAsCost
                          ? 'border-rose-500 ring-2 ring-rose-500 z-20 opacity-85'
                          : 'border-slate-700 hover:border-rose-400'
                      }`}
                    >
                      <img
                        src={resolveCardImageUrl(card)}
                        onError={(e) => handleCardImageError(e, card.imageUrl, card)}
                        alt={card.name}
                        className="w-full h-full object-cover pointer-events-none"
                      />

                      {/* Cost & Gems Badges */}
                      <div className="absolute top-0.5 left-0.5 flex items-center gap-0.5">
                        {card.cost !== null && (
                          <span className="px-1 py-0.2 rounded bg-amber-500 text-slate-950 font-black text-[9px] shadow">
                            C:{card.cost}
                          </span>
                        )}
                      </div>
                      <div className="absolute top-0.5 right-0.5">
                        <span className="px-1 py-0.2 rounded bg-slate-950/90 text-cyan-300 border border-cyan-500/40 font-mono font-bold text-[9px]">
                          💎{card.gems ?? 1}
                        </span>
                      </div>

                      {card.power !== null && (
                        <div className="absolute bottom-3.5 right-0.5 px-1 py-0.2 rounded bg-red-600 text-white font-extrabold text-[9px]">
                          ⚔️{card.power}
                        </div>
                      )}

                      {isMarkedAsCost && (
                        <div className="absolute inset-0 bg-rose-950/70 flex items-center justify-center">
                          <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-black text-[9px]">
                            🔥 จ่าย Cost
                          </span>
                        </div>
                      )}

                      <div className="absolute bottom-0 inset-x-0 bg-black/85 px-1 py-0.5 text-[9px] font-bold text-white truncate text-center">
                        {card.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ====================================================================
          OPTIONAL DETAILED MODALS (Full Cost Modal / Combat Modal / Zone Browser)
          ==================================================================== */}
      {modalHandCard && (
        <CostPaymentModal
          card={modalHandCard.card}
          otherHandCards={state[modalHandCard.side].hand.filter(
            (c) => c.instanceId !== modalHandCard.card.instanceId
          )}
          occupiedAvatarSlots={state[modalHandCard.side].avatarZone
            .map((slot, index) => (slot ? { index, slot } : null))
            .filter((x): x is { index: number; slot: AvatarSlotState } => x !== null)}
          onClose={() => setModalHandCard(null)}
          onSummonAvatar={(costCardIds) => {
            commitState(
              summonAvatarWithCost(
                state,
                modalHandCard.side,
                modalHandCard.card.instanceId,
                costCardIds
              )
            );
            setModalHandCard(null);
          }}
          onBuildConstruct={(costCardIds) => {
            commitState(
              buildConstructWithCost(
                state,
                modalHandCard.side,
                modalHandCard.card.instanceId,
                costCardIds
              )
            );
            setModalHandCard(null);
          }}
          onCastMagic={() => {
            commitState(
              castMagicCard(state, modalHandCard.side, modalHandCard.card.instanceId)
            );
            setModalHandCard(null);
          }}
          onPlayLandMagic={() => {
            commitState(
              playLandMagicCard(state, modalHandCard.side, modalHandCard.card.instanceId)
            );
            setModalHandCard(null);
          }}
          onAttachModification={(avatarSlotIndex) => {
            commitState(
              attachModificationToAvatar(
                state,
                modalHandCard.side,
                modalHandCard.card.instanceId,
                avatarSlotIndex
              )
            );
            setModalHandCard(null);
          }}
          onMoveToZone={(targetZone) => {
            commitState(
              moveCardFromZone(
                state,
                modalHandCard.side,
                'HAND',
                targetZone,
                modalHandCard.card.instanceId
              )
            );
            setModalHandCard(null);
          }}
        />
      )}

      {selectedAvatarSlot && (
        <CombatTargetModal
          slotIndex={selectedAvatarSlot.slotIndex}
          slot={
            state[selectedAvatarSlot.side].avatarZone[selectedAvatarSlot.slotIndex] ||
            selectedAvatarSlot.slot
          }
          opponentAvatars={state[
            selectedAvatarSlot.side === 'player1' ? 'player2' : 'player1'
          ].avatarZone
            .map((slot, index) => (slot ? { index, slot } : null))
            .filter((x): x is { index: number; slot: AvatarSlotState } => x !== null)}
          opponentLifeCards={
            state[selectedAvatarSlot.side === 'player1' ? 'player2' : 'player1'].lifeZone
          }
          isFirstTurnFirstPlayer={
            state.turnNumber === 1 && state.currentTurn === state.firstPlayer
          }
          onClose={() => setSelectedAvatarSlot(null)}
          onAdjustPower={(delta) => {
            commitState(
              adjustAvatarPower(
                state,
                selectedAvatarSlot.side,
                selectedAvatarSlot.slotIndex,
                delta
              )
            );
          }}
          onToggleRest={() => {
            commitState(
              toggleAvatarRest(state, selectedAvatarSlot.side, selectedAvatarSlot.slotIndex)
            );
          }}
          onAttackAvatar={(defenderSlotIndex) => {
            commitState(
              resolveAvatarCombat(
                state,
                selectedAvatarSlot.side,
                selectedAvatarSlot.slotIndex,
                defenderSlotIndex
              )
            );
            setSelectedAvatarSlot(null);
          }}
          onAttackLife={(lifeIndex, effect) => {
            commitState(
              attackLifeCard(
                state,
                selectedAvatarSlot.side,
                selectedAvatarSlot.slotIndex,
                lifeIndex,
                effect
              )
            );
            setSelectedAvatarSlot(null);
          }}
          onMoveAvatar={(destination) => {
            commitState(
              destroyFieldSlotToZone(
                state,
                selectedAvatarSlot.side,
                'AVATAR',
                selectedAvatarSlot.slotIndex,
                destination
              )
            );
            setSelectedAvatarSlot(null);
          }}
        />
      )}

      {zoneBrowser && (
        <ZoneBrowserModal
          title={zoneBrowser.title}
          zoneName={zoneBrowser.zone}
          topLimit={zoneBrowser.topLimit}
          cards={
            zoneBrowser.zone === 'DECK'
              ? state[zoneBrowser.side].deck
              : zoneBrowser.zone === 'HELL'
              ? state[zoneBrowser.side].hellZone
              : zoneBrowser.zone === 'DARK'
              ? state[zoneBrowser.side].darkZone
              : zoneBrowser.zone === 'GEM'
              ? state[zoneBrowser.side].gemZone
              : zoneBrowser.zone === 'LIFE'
              ? state[zoneBrowser.side].lifeZone
              : state[zoneBrowser.side].hand
          }
          onClose={() => setZoneBrowser(null)}
          onMoveCard={(instanceId, targetZone) => {
            commitState(
              moveCardFromZone(
                state,
                zoneBrowser.side,
                zoneBrowser.zone,
                targetZone,
                instanceId
              )
            );
          }}
          onShuffleDeck={() => commitState(shufflePlayerDeck(state, zoneBrowser.side))}
        />
      )}

      {showDeckSelector && (
        <PlaymatDeckSelectorModal
          customDecks={customDecks}
          currentP1Deck={p1Deck}
          currentP2Deck={p2Deck}
          onClose={() => setShowDeckSelector(false)}
          onApplyDecks={(nextP1, nextP2) => {
            setP1Deck(nextP1);
            setP2Deck(nextP2);
            commitState(setupNewGame(state, nextP1, nextP2));
            setShowDeckSelector(false);
          }}
        />
      )}

      <CardDetailModal card={inspectCard} onClose={() => setInspectCard(null)} />
    </div>
  );
}
