import { describe, it, expect } from 'vitest';
import {
  createInitialPlaymatState,
  setupNewGame,
  drawCards,
  drawToThree,
  setAvatarZoneLimit,
  summonAvatarWithCost,
  buildConstructWithCost,
  castMagicCard,
  playLandMagicCard,
  attachModificationToAvatar,
  placeCardIntoGemZone,
  flushGemZoneToHell,
  getGemZoneTotal,
  toggleAvatarRest,
  adjustAvatarPower,
  resolveAvatarCombat,
  attackLifeCard,
  flipLifeCard,
  moveCardFromZone,
  passTurn,
  swapPerspective,
  toggleRevealAllHands,
  flipCoin,
} from './talingchanTabletopHelper.ts';
import { STARTER_DECK_PRESETS } from '../constants/starterDecks.ts';

describe('talingchanTabletopHelper - Battle of Talingchan Solo Playmat Engine', () => {
  const sd01 = STARTER_DECK_PRESETS[0];
  const sd02 = STARTER_DECK_PRESETS[1];

  it('builds valid 50 main + 5 life starter deck presets from card database', () => {
    expect(STARTER_DECK_PRESETS.length).toBeGreaterThanOrEqual(4);
    for (const preset of STARTER_DECK_PRESETS) {
      const mainTotal = preset.mainDeck.reduce((sum, c) => sum + c.count, 0);
      const lifeTotal = preset.lifeDeck.reduce((sum, c) => sum + c.count, 0);
      expect(mainTotal).toBe(50);
      expect(lifeTotal).toBe(5);
      expect(preset.lifeDeck.every((c) => c.cardType === 'Life Card')).toBe(true);
      expect(preset.mainDeck.every((c) => c.cardType !== 'Life Card')).toBe(true);
    }
  });

  it('initializes and sets up game with 5 Life cards face-down, 5 hand cards, and 45 main deck cards', () => {
    const initial = createInitialPlaymatState(sd01, sd02);
    const started = setupNewGame(initial);

    expect(started.isGameStarted).toBe(true);
    expect(started.turnNumber).toBe(1);
    expect(started.phase).toBe('DRAW');

    expect(started.player1.hand).toHaveLength(5);
    expect(started.player1.deck).toHaveLength(45);
    expect(started.player1.lifeZone).toHaveLength(5);
    expect(started.player1.lifeZone.every((c) => c.isFaceDown)).toBe(true);
    expect(started.player1.avatarZoneLimit).toBe(4);
    expect(started.player1.avatarZone).toHaveLength(4);

    expect(started.player2.hand).toHaveLength(5);
    expect(started.player2.deck).toHaveLength(45);
    expect(started.player2.lifeZone).toHaveLength(5);
  });

  it('supports dynamically expanding and shrinking Avatar Zone between 4 and 8 slots', () => {
    let state = setupNewGame(createInitialPlaymatState(sd01, sd02));
    expect(state.player1.avatarZoneLimit).toBe(4);
    expect(state.player1.avatarZone).toHaveLength(4);

    state = setAvatarZoneLimit(state, 'player1', 6);
    expect(state.player1.avatarZoneLimit).toBe(6);
    expect(state.player1.avatarZone).toHaveLength(6);

    // Clamp to max 8 and min 4
    state = setAvatarZoneLimit(state, 'player1', 12);
    expect(state.player1.avatarZoneLimit).toBe(8);
    expect(state.player1.avatarZone).toHaveLength(8);

    state = setAvatarZoneLimit(state, 'player1', 2);
    expect(state.player1.avatarZoneLimit).toBe(4);
    expect(state.player1.avatarZone).toHaveLength(4);
  });

  it('draws 1 card and supports BOTC Draw-to-3 rule when hand has fewer than 3 cards', () => {
    let state = setupNewGame(createInitialPlaymatState(sd01, sd02));
    // Keep only 1 card in P1 hand
    state = {
      ...state,
      player1: {
        ...state.player1,
        hand: state.player1.hand.slice(0, 1),
      },
    };

    const afterDrawTo3 = drawToThree(state, 'player1');
    expect(afterDrawTo3.player1.hand).toHaveLength(3);
    expect(afterDrawTo3.player1.deck).toHaveLength(43);

    // If already >= 3 cards, drawToThree draws 1 normal turn card
    const afterNormalDraw = drawToThree(afterDrawTo3, 'player1');
    expect(afterNormalDraw.player1.hand).toHaveLength(4);

    const afterDrawTwo = drawCards(afterNormalDraw, 'player1', 2);
    expect(afterDrawTwo.player1.hand).toHaveLength(6);
  });

  it('summons an Avatar and sends selected Cost cards from hand to Hell Zone', () => {
    let state = setupNewGame(createInitialPlaymatState(sd01, sd02));
    const handCards = state.player1.hand;
    const summonTarget = handCards[0];
    const costCard1 = handCards[1];
    const costCard2 = handCards[2];

    state = summonAvatarWithCost(state, 'player1', summonTarget.instanceId, [
      costCard1.instanceId,
      costCard2.instanceId,
    ]);

    expect(state.player1.avatarZone[0]).not.toBeNull();
    expect(state.player1.avatarZone[0]?.card.instanceId).toBe(summonTarget.instanceId);
    expect(state.player1.hand).toHaveLength(2);
    expect(state.player1.hellZone).toHaveLength(2);
    expect(state.player1.hellZone.map((c) => c.instanceId)).toEqual([
      costCard1.instanceId,
      costCard2.instanceId,
    ]);
  });

  it('resolves Avatar vs Avatar combat: higher POWER wins, equal POWER destroys both to Hell Zone', () => {
    let state = setupNewGame(createInitialPlaymatState(sd01, sd02));
    const p1Card = { ...state.player1.hand[0], power: 5 };
    const p2Card = { ...state.player2.hand[0], power: 3 };

    state.player1.hand[0] = p1Card;
    state.player2.hand[0] = p2Card;

    state = summonAvatarWithCost(state, 'player1', p1Card.instanceId, []);
    state = summonAvatarWithCost(state, 'player2', p2Card.instanceId, []);

    // P1 (Power 5) attacks P2 slot 0 (Power 3) -> P2 destroyed to Hell Zone, P1 becomes rested
    const winState = resolveAvatarCombat(state, 'player1', 0, 0);
    expect(winState.player1.avatarZone[0]?.isRested).toBe(true);
    expect(winState.player2.avatarZone[0]).toBeNull();
    expect(winState.player2.hellZone).toHaveLength(1);

    // Equal Power tie (5 vs 5) -> Both destroyed to Hell Zone
    let tieSetup = summonAvatarWithCost(winState, 'player2', winState.player2.hand[0].instanceId, []);
    tieSetup = adjustAvatarPower(tieSetup, 'player2', 0, 5 - (tieSetup.player2.avatarZone[0]?.card.power || 0));
    tieSetup = toggleAvatarRest(tieSetup, 'player1', 0); // Stand P1 avatar

    const tieResult = resolveAvatarCombat(tieSetup, 'player1', 0, 0);
    expect(tieResult.player1.avatarZone[0]).toBeNull();
    expect(tieResult.player2.avatarZone[0]).toBeNull();
    expect(tieResult.player1.hellZone).toHaveLength(1);
    expect(tieResult.player2.hellZone).toHaveLength(2);
  });

  it('attacks and flips or destroys opponent Life Card', () => {
    let state = setupNewGame(createInitialPlaymatState(sd01, sd02));
    const p1Card = state.player1.hand[0];
    state = summonAvatarWithCost(state, 'player1', p1Card.instanceId, []);

    // Attack opponent life index 0 (flip face up)
    state = attackLifeCard(state, 'player1', 0, 0, 'FLIP');
    expect(state.player1.avatarZone[0]?.isRested).toBe(true);
    expect(state.player2.lifeZone[0].isFaceDown).toBe(false);

    // Attack opponent life index 0 (destroy to Hell Zone)
    state = toggleAvatarRest(state, 'player1', 0);
    state = attackLifeCard(state, 'player1', 0, 0, 'DESTROY');
    expect(state.player2.lifeZone).toHaveLength(4);
    expect(state.player2.hellZone).toHaveLength(1);

    // Manual flipLifeCard helper
    state = flipLifeCard(state, 'player2', 0);
    expect(state.player2.lifeZone[0].isFaceDown).toBe(false);
  });

  it('supports Construct building, Magic casting, Land Magic shared zone, and Modification attachment', () => {
    let state = setupNewGame(createInitialPlaymatState(sd01, sd02));
    const [c0, c1, c2, c3, c4] = state.player1.hand;

    state = summonAvatarWithCost(state, 'player1', c0.instanceId, []);
    state = buildConstructWithCost(state, 'player1', c1.instanceId, []);
    expect(state.player1.constructZone[0]?.card.instanceId).toBe(c1.instanceId);

    state = castMagicCard(state, 'player1', c2.instanceId);
    expect(state.player1.magicZone).toHaveLength(1);

    state = playLandMagicCard(state, 'player1', c3.instanceId);
    expect(state.landMagicZone?.card.instanceId).toBe(c3.instanceId);
    expect(state.landMagicZone?.owner).toBe('player1');

    state = attachModificationToAvatar(state, 'player1', c4.instanceId, 0);
    expect(state.player1.avatarZone[0]?.attachedModifications).toHaveLength(1);
  });

  it('passes turn, untaps active player Avatars, and swaps perspective when autoSwap is enabled', () => {
    let state = setupNewGame(createInitialPlaymatState(sd01, sd02));
    const c0 = state.player1.hand[0];
    state = summonAvatarWithCost(state, 'player1', c0.instanceId, []);
    state = toggleAvatarRest(state, 'player1', 0);
    expect(state.player1.avatarZone[0]?.isRested).toBe(true);

    // Pass from P1 to P2 with autoSwap = true
    state = passTurn(state, true);
    expect(state.currentTurn).toBe('player2');
    expect(state.perspective).toBe('player2');

    // Pass back from P2 to P1 -> P1 Avatar untaps (isRested = false) and turnNumber increments
    state = passTurn(state, true);
    expect(state.currentTurn).toBe('player1');
    expect(state.turnNumber).toBe(2);
    expect(state.player1.avatarZone[0]?.isRested).toBe(false);
  });

  it('moves cards between Hell Zone, Dark Dimension, Hand, and Deck, and toggles Solo controls', () => {
    let state = setupNewGame(createInitialPlaymatState(sd01, sd02));
    const cardToMove = state.player1.hand[0];

    // Move Hand -> Hell Zone
    state = moveCardFromZone(state, 'player1', 'HAND', 'HELL', cardToMove.instanceId);
    expect(state.player1.hellZone).toHaveLength(1);

    // Move Hell Zone -> Dark Dimension (เนรเทศ)
    state = moveCardFromZone(state, 'player1', 'HELL', 'DARK', cardToMove.instanceId);
    expect(state.player1.hellZone).toHaveLength(0);
    expect(state.player1.darkZone).toHaveLength(1);

    // Move Dark Dimension -> Hand
    state = moveCardFromZone(state, 'player1', 'DARK', 'HAND', cardToMove.instanceId);
    expect(state.player1.darkZone).toHaveLength(0);
    expect(state.player1.hand.some((c) => c.instanceId === cardToMove.instanceId)).toBe(true);

    state = swapPerspective(state);
    expect(state.perspective).toBe('player2');

    state = toggleRevealAllHands(state);
    expect(state.soloRevealAllHands).toBe(true);

    state = flipCoin(state);
    expect(['HEADS', 'TAILS']).toContain(state.lastCoinFlip);
  });

  it('places cards from hand into Gem Zone, calculates total Gems, and flushes Gem Zone to Hell Zone', () => {
    let state = setupNewGame(createInitialPlaymatState(sd01, sd02));
    const cardA = state.player1.hand[0];
    const cardB = state.player1.hand[1];

    state = placeCardIntoGemZone(state, 'player1', cardA.instanceId);
    state = placeCardIntoGemZone(state, 'player1', cardB.instanceId);

    expect(state.player1.gemZone).toHaveLength(2);
    expect(getGemZoneTotal(state.player1)).toBe((cardA.gems ?? 1) + (cardB.gems ?? 1));

    state = flushGemZoneToHell(state, 'player1');
    expect(state.player1.gemZone).toHaveLength(0);
    expect(state.player1.hellZone).toHaveLength(2);
  });
});

