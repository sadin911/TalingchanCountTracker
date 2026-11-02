import type { TalingchanCard } from '../types/card.ts';
import type { Deck } from '../types/deck.ts';
import type {
  AvatarSlotState,
  ConstructSlotState,
  PlayerBoardState,
  PlayerSide,
  PlaymatCardInstance,
  PlaymatState,
  PlaymatZoneName,
  TurnPhase,
} from '../types/playmat.ts';
import rawCards from '../data/talingchanCards.json';

const allCards = rawCards as TalingchanCard[];
const cardCatalogMap = new Map<string, TalingchanCard>(allCards.map((c) => [c.id, c]));

export function shuffleCards<T>(items: T[]): T[] {
  const copy = [...items];
  for (let pass = 0; pass < 3; pass++) {
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
  }
  return copy;
}

export function clonePlaymatState(state: PlaymatState): PlaymatState {
  return JSON.parse(JSON.stringify(state)) as PlaymatState;
}

function expandDeckToInstances(deck: Deck, owner: PlayerSide): {
  mainInstances: PlaymatCardInstance[];
  lifeInstances: PlaymatCardInstance[];
} {
  let seq = 1;
  const mainInstances: PlaymatCardInstance[] = [];
  for (const entry of deck.mainDeck) {
    const fullCard = cardCatalogMap.get(entry.id) || {
      ...entry,
      setName: entry.setCode,
      symbol: 'ไม่ระบุ',
      soi: 1,
      gems: 1,
      power: entry.cardType === 'Avatar' ? 3 : null,
      rarity: 'Common' as const,
      isCollab: false,
      illustrator: '',
      effect: '',
      rarityVariants: [],
      finishes: ['normal' as const],
    };
    for (let i = 0; i < entry.count; i++) {
      mainInstances.push({
        ...fullCard,
        instanceId: `${owner}-main-${entry.id}-${seq++}`,
        owner,
        isFaceDown: false,
      });
    }
  }

  const lifeInstances: PlaymatCardInstance[] = [];
  for (const entry of deck.lifeDeck) {
    const fullCard = cardCatalogMap.get(entry.id) || {
      ...entry,
      setName: entry.setCode,
      symbol: 'ไม่ระบุ',
      soi: 1,
      gems: 1,
      power: 3,
      rarity: 'Common' as const,
      isCollab: false,
      illustrator: '',
      effect: '',
      rarityVariants: [],
      finishes: ['normal' as const],
    };
    for (let i = 0; i < entry.count; i++) {
      lifeInstances.push({
        ...fullCard,
        instanceId: `${owner}-life-${entry.id}-${seq++}`,
        owner,
        isFaceDown: true,
      });
    }
  }

  return { mainInstances, lifeInstances };
}

export function createPlayerBoard(
  side: PlayerSide,
  playerName: string,
  deck: Deck
): PlayerBoardState {
  const { mainInstances, lifeInstances } = expandDeckToInstances(deck, side);
  return {
    id: side,
    name: playerName,
    deckName: deck.name,
    deck: mainInstances,
    hand: [],
    lifeZone: lifeInstances,
    avatarZoneLimit: 4,
    avatarZone: [null, null, null, null],
    constructZone: [null, null, null],
    magicZone: [],
    gemZone: [],
    hellZone: [],
    darkZone: [],
  };
}

export function createInitialPlaymatState(
  p1Deck: Deck,
  p2Deck: Deck = p1Deck
): PlaymatState {
  return {
    player1: createPlayerBoard('player1', 'Player 1 (ฝั่งคุณ)', p1Deck),
    player2: createPlayerBoard('player2', 'Player 2 (คู่ซ้อม)', p2Deck),
    landMagicZone: null,
    currentTurn: 'player1',
    firstPlayer: 'player1',
    turnNumber: 1,
    phase: 'DRAW',
    perspective: 'player1',
    soloRevealAllHands: false,
    isGameStarted: false,
    lastCoinFlip: null,
    actionLog: [`เตรียมกระดานซ้อม: ${p1Deck.name} ปะทะ ${p2Deck.name}`],
    winner: null,
  };
}

function appendLog(state: PlaymatState, msg: string): void {
  state.actionLog = [msg, ...state.actionLog].slice(0, 60);
}

/**
 * Sets up a fresh game:
 * - Shuffles Main Deck
 * - Ensures 5 Life Cards face-down (or takes from top of Main Deck if lifeDeck was empty)
 * - Draws 5 opening hand cards for both P1 and P2
 */
export function setupNewGame(
  state: PlaymatState,
  p1Deck?: Deck,
  p2Deck?: Deck
): PlaymatState {
  const next = clonePlaymatState(state);

  const resetSide = (board: PlayerBoardState, newDeck?: Deck) => {
    if (newDeck) {
      const fresh = createPlayerBoard(board.id, board.name, newDeck);
      board.deckName = fresh.deckName;
      board.deck = fresh.deck;
      board.lifeZone = fresh.lifeZone;
    } else {
      // Collect all cards back to their origin
      const allOwned: PlaymatCardInstance[] = [
        ...board.deck,
        ...board.hand,
        ...board.magicZone,
        ...(board.gemZone || []),
        ...board.hellZone,
        ...board.darkZone,
      ];
      for (const slot of board.avatarZone) {
        if (slot) {
          allOwned.push(slot.card, ...slot.attachedModifications);
        }
      }
      for (const slot of board.constructZone) {
        if (slot) {
          allOwned.push(slot.card);
        }
      }
      const lifeOwned = [...board.lifeZone];
      const mainPool = allOwned.filter(
        (c) => !c.instanceId.includes('-life-') && c.cardType !== 'Life Card'
      );
      const lifePool = [
        ...lifeOwned,
        ...allOwned.filter(
          (c) => c.instanceId.includes('-life-') || c.cardType === 'Life Card'
        ),
      ];
      board.deck = mainPool;
      board.lifeZone = lifePool;
    }

    const shuffledMain = shuffleCards(board.deck).map((c) => ({
      ...c,
      isFaceDown: false,
    }));

    let lifeCards = board.lifeZone.map((c) => ({ ...c, isFaceDown: true }));
    if (lifeCards.length < 5) {
      const catalogLifeCards = allCards.filter((c) => c.cardType === 'Life Card');
      let fallbackSeq = 900;
      for (const lc of catalogLifeCards) {
        if (lifeCards.length >= 5) break;
        if (!lifeCards.some((existing) => existing.name === lc.name)) {
          lifeCards.push({
            ...lc,
            instanceId: `${board.id}-life-${lc.id}-${fallbackSeq++}`,
            owner: board.id,
            isFaceDown: true,
          });
        }
      }
    }
    lifeCards = shuffleCards(lifeCards);

    const openingHand = shuffledMain.slice(0, 5);
    const remainingDeck = shuffledMain.slice(5);

    board.hand = openingHand;
    board.deck = remainingDeck;
    board.lifeZone = lifeCards;
    board.avatarZoneLimit = 4;
    board.avatarZone = [null, null, null, null];
    board.constructZone = [null, null, null];
    board.magicZone = [];
    board.gemZone = [];
    board.hellZone = [];
    board.darkZone = [];
  };

  resetSide(next.player1, p1Deck);
  resetSide(next.player2, p2Deck);
  next.landMagicZone = null;
  next.currentTurn = 'player1';
  next.firstPlayer = 'player1';
  next.turnNumber = 1;
  next.phase = 'DRAW';
  next.isGameStarted = true;
  next.winner = null;
  appendLog(next, 'เริ่มเกมใหม่! สับเด็ค วาง Life Card 5 ใบ และจั่วการ์ดเริ่มต้นฝั่งละ 5 ใบ');
  return next;
}

/**
 * Expand or shrink Avatar Zone between 4 and 8 slots (for card effects that expand Avatar Zone).
 */
export function setAvatarZoneLimit(
  state: PlaymatState,
  side: PlayerSide,
  newLimit: number
): PlaymatState {
  const clamped = Math.max(4, Math.min(8, newLimit));
  const next = clonePlaymatState(state);
  const board = next[side];

  if (clamped > board.avatarZone.length) {
    while (board.avatarZone.length < clamped) {
      board.avatarZone.push(null);
    }
  } else if (clamped < board.avatarZone.length) {
    // Move any overflow occupied slots to Hell Zone if shrinking
    for (let i = clamped; i < board.avatarZone.length; i++) {
      const slot = board.avatarZone[i];
      if (slot) {
        board.hellZone.unshift(slot.card, ...slot.attachedModifications);
      }
    }
    board.avatarZone = board.avatarZone.slice(0, clamped);
  }

  board.avatarZoneLimit = clamped;
  appendLog(next, `${board.name}: ปรับขนาด Avatar Zone เป็น ${clamped} ช่อง`);
  return next;
}

export function drawCards(
  state: PlaymatState,
  side: PlayerSide,
  count = 1
): PlaymatState {
  const next = clonePlaymatState(state);
  const board = next[side];
  const actualCount = Math.min(count, board.deck.length);
  if (actualCount <= 0) {
    appendLog(next, `${board.name}: ไม่มีการ์ดเหลือในกองให้จั่ว!`);
    return next;
  }

  const drawn = board.deck.slice(0, actualCount).map((c) => ({ ...c, isFaceDown: false }));
  board.deck = board.deck.slice(actualCount);
  board.hand.push(...drawn);
  appendLog(next, `${board.name}: จั่วการ์ด ${actualCount} ใบ`);
  return next;
}

/**
 * Official Battle of Talingchan Draw Phase helper:
 * - If hand has fewer than 3 cards, draw until hand has 3 cards.
 * - Otherwise draw 1 card.
 */
export function drawToThree(state: PlaymatState, side: PlayerSide): PlaymatState {
  const handCount = state[side].hand.length;
  const needed = handCount < 3 ? 3 - handCount : 1;
  const next = drawCards(state, side, needed);
  if (next.currentTurn === side && next.phase === 'DRAW') {
    next.phase = 'MAIN';
  }
  return next;
}

export function shufflePlayerDeck(state: PlaymatState, side: PlayerSide): PlaymatState {
  const next = clonePlaymatState(state);
  next[side].deck = shuffleCards(next[side].deck);
  appendLog(next, `${next[side].name}: สับกองการ์ดเรียบร้อย`);
  return next;
}

/**
 * Summons an Avatar from Hand into the first available (or specified) Avatar Zone slot,
 * discarding selected Cost cards from Hand to Hell Zone.
 */
export function summonAvatarWithCost(
  state: PlaymatState,
  side: PlayerSide,
  avatarInstanceId: string,
  costCardInstanceIds: string[] = [],
  preferredSlotIndex?: number
): PlaymatState {
  const next = clonePlaymatState(state);
  const board = next[side];

  const cardIdx = board.hand.findIndex((c) => c.instanceId === avatarInstanceId);
  if (cardIdx === -1) return state;

  const targetSlot =
    preferredSlotIndex !== undefined && board.avatarZone[preferredSlotIndex] === null
      ? preferredSlotIndex
      : board.avatarZone.findIndex((s) => s === null);

  if (targetSlot === -1) {
    appendLog(next, `${board.name}: Avatar Zone เต็มแล้ว! (ขยายช่องเพิ่มได้หากมีเอฟเฟกต์การ์ด)`);
    return next;
  }

  const [avatarCard] = board.hand.splice(cardIdx, 1);

  // Pay cost by discarding selected hand cards to Hell Zone
  const costSet = new Set(costCardInstanceIds);
  const paidCards: PlaymatCardInstance[] = [];
  board.hand = board.hand.filter((c) => {
    if (costSet.has(c.instanceId)) {
      paidCards.push({ ...c, isFaceDown: false });
      return false;
    }
    return true;
  });

  if (paidCards.length > 0) {
    board.hellZone.unshift(...paidCards);
  }

  const slotState: AvatarSlotState = {
    id: `avatar-slot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    card: { ...avatarCard, isFaceDown: false },
    powerModifier: 0,
    isRested: false,
    attachedModifications: [],
  };

  board.avatarZone[targetSlot] = slotState;
  appendLog(
    next,
    `${board.name}: อัญเชิญ "${avatarCard.name}" ลงช่อง Avatar #${targetSlot + 1}` +
      (paidCards.length > 0 ? ` (จ่าย Cost ทิ้งลงนรก ${paidCards.length} ใบ)` : '')
  );
  return next;
}

/**
 * Builds a Construct from Hand into one of the 3 Construct Zone slots,
 * discarding selected Cost cards from Hand to Hell Zone.
 */
export function buildConstructWithCost(
  state: PlaymatState,
  side: PlayerSide,
  constructInstanceId: string,
  costCardInstanceIds: string[] = [],
  preferredSlotIndex?: number
): PlaymatState {
  const next = clonePlaymatState(state);
  const board = next[side];

  const cardIdx = board.hand.findIndex((c) => c.instanceId === constructInstanceId);
  if (cardIdx === -1) return state;

  const targetSlot =
    preferredSlotIndex !== undefined && board.constructZone[preferredSlotIndex] === null
      ? preferredSlotIndex
      : board.constructZone.findIndex((s) => s === null);
  if (targetSlot === -1) {
    appendLog(next, `${board.name}: Construct Zone เต็ม 3 ช่องแล้ว!`);
    return next;
  }

  const [constructCard] = board.hand.splice(cardIdx, 1);
  const costSet = new Set(costCardInstanceIds);
  const paidCards: PlaymatCardInstance[] = [];
  board.hand = board.hand.filter((c) => {
    if (costSet.has(c.instanceId)) {
      paidCards.push({ ...c, isFaceDown: false });
      return false;
    }
    return true;
  });

  if (paidCards.length > 0) {
    board.hellZone.unshift(...paidCards);
  }

  const slotState: ConstructSlotState = {
    id: `construct-slot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    card: { ...constructCard, isFaceDown: false },
    isRested: false,
  };

  board.constructZone[targetSlot] = slotState;
  appendLog(
    next,
    `${board.name}: ก่อสร้าง "${constructCard.name}" ลง Construct Zone #${targetSlot + 1}`
  );
  return next;
}

export function castMagicCard(
  state: PlaymatState,
  side: PlayerSide,
  magicInstanceId: string
): PlaymatState {
  const next = clonePlaymatState(state);
  const board = next[side];
  const idx = board.hand.findIndex((c) => c.instanceId === magicInstanceId);
  if (idx === -1) return state;

  const [card] = board.hand.splice(idx, 1);
  board.magicZone.push({ ...card, isFaceDown: false });
  appendLog(next, `${board.name}: ร่ายเวทมนตร์ "${card.name}" ลง Magic Zone`);
  return next;
}

export function playLandMagicCard(
  state: PlaymatState,
  side: PlayerSide,
  cardInstanceId: string
): PlaymatState {
  const next = clonePlaymatState(state);
  const board = next[side];
  const idx = board.hand.findIndex((c) => c.instanceId === cardInstanceId);
  if (idx === -1) return state;

  const [card] = board.hand.splice(idx, 1);
  if (next.landMagicZone) {
    const prevOwner = next.landMagicZone.owner;
    next[prevOwner].hellZone.unshift(next.landMagicZone.card);
  }
  next.landMagicZone = {
    card: { ...card, isFaceDown: false },
    owner: side,
  };
  appendLog(next, `${board.name}: เปิดใช้ Land Magic "${card.name}" บนสนามกลาง`);
  return next;
}

export function attachModificationToAvatar(
  state: PlaymatState,
  side: PlayerSide,
  modCardInstanceId: string,
  avatarSlotIndex: number
): PlaymatState {
  const next = clonePlaymatState(state);
  const board = next[side];
  const slot = board.avatarZone[avatarSlotIndex];
  if (!slot) return state;

  const idx = board.hand.findIndex((c) => c.instanceId === modCardInstanceId);
  if (idx === -1) return state;

  const [modCard] = board.hand.splice(idx, 1);
  slot.attachedModifications.push({ ...modCard, isFaceDown: false });
  appendLog(next, `${board.name}: ติดตั้ง "${modCard.name}" ให้กับ "${slot.card.name}"`);
  return next;
}

export function toggleAvatarRest(
  state: PlaymatState,
  side: PlayerSide,
  slotIndex: number
): PlaymatState {
  const next = clonePlaymatState(state);
  const slot = next[side].avatarZone[slotIndex];
  if (!slot) return state;
  slot.isRested = !slot.isRested;
  return next;
}

export function adjustAvatarPower(
  state: PlaymatState,
  side: PlayerSide,
  slotIndex: number,
  delta: number
): PlaymatState {
  const next = clonePlaymatState(state);
  const slot = next[side].avatarZone[slotIndex];
  if (!slot) return state;
  slot.powerModifier += delta;
  return next;
}

export function getEffectiveAvatarPower(slot: AvatarSlotState): number {
  return (slot.card.power ?? 0) + slot.powerModifier;
}

/**
 * Resolves combat between Attacker Avatar and Defender Avatar per BOTC Rule Book:
 * - Attacker rests.
 * - Attacker POWER > Defender POWER: Defender is destroyed to Hell Zone.
 * - Attacker POWER === Defender POWER: Both Avatars are destroyed to Hell Zone.
 * - Attacker POWER < Defender POWER: Attacker is destroyed to Hell Zone.
 */
export function resolveAvatarCombat(
  state: PlaymatState,
  attackerSide: PlayerSide,
  attackerSlotIndex: number,
  defenderSlotIndex: number
): PlaymatState {
  const defenderSide: PlayerSide = attackerSide === 'player1' ? 'player2' : 'player1';
  const next = clonePlaymatState(state);
  const attackerBoard = next[attackerSide];
  const defenderBoard = next[defenderSide];

  const attackerSlot = attackerBoard.avatarZone[attackerSlotIndex];
  const defenderSlot = defenderBoard.avatarZone[defenderSlotIndex];
  if (!attackerSlot || !defenderSlot) return state;

  const atkPower = getEffectiveAvatarPower(attackerSlot);
  const defPower = getEffectiveAvatarPower(defenderSlot);

  attackerSlot.isRested = true;
  next.phase = 'ATTACK';

  if (atkPower > defPower) {
    defenderBoard.hellZone.unshift(
      defenderSlot.card,
      ...defenderSlot.attachedModifications
    );
    defenderBoard.avatarZone[defenderSlotIndex] = null;
    appendLog(
      next,
      `⚔️ "${attackerSlot.card.name}" (POWER ${atkPower}) โจมตีชนะ "${defenderSlot.card.name}" (POWER ${defPower}) ส่งลงนรก!`
    );
  } else if (atkPower === defPower) {
    attackerBoard.hellZone.unshift(
      attackerSlot.card,
      ...attackerSlot.attachedModifications
    );
    defenderBoard.hellZone.unshift(
      defenderSlot.card,
      ...defenderSlot.attachedModifications
    );
    attackerBoard.avatarZone[attackerSlotIndex] = null;
    defenderBoard.avatarZone[defenderSlotIndex] = null;
    appendLog(
      next,
      `💥 "${attackerSlot.card.name}" ปะทะ "${defenderSlot.card.name}" ด้วย POWER ${atkPower} เท่ากัน! ตกนรกทั้งคู่`
    );
  } else {
    attackerBoard.hellZone.unshift(
      attackerSlot.card,
      ...attackerSlot.attachedModifications
    );
    attackerBoard.avatarZone[attackerSlotIndex] = null;
    appendLog(
      next,
      `🛡️ "${attackerSlot.card.name}" (POWER ${atkPower}) โจมตีแพ้ "${defenderSlot.card.name}" (POWER ${defPower}) ตกนรก!`
    );
  }

  return next;
}

/**
 * Attacks an opponent's Life Card (either flips it face-up or destroys it to Hell Zone).
 */
export function attackLifeCard(
  state: PlaymatState,
  attackerSide: PlayerSide,
  attackerSlotIndex: number,
  lifeIndex: number,
  effect: 'FLIP' | 'DESTROY' = 'DESTROY'
): PlaymatState {
  const defenderSide: PlayerSide = attackerSide === 'player1' ? 'player2' : 'player1';
  const next = clonePlaymatState(state);
  const attackerBoard = next[attackerSide];
  const defenderBoard = next[defenderSide];

  const attackerSlot = attackerBoard.avatarZone[attackerSlotIndex];
  const targetLife = defenderBoard.lifeZone[lifeIndex];
  if (!attackerSlot || !targetLife) return state;

  attackerSlot.isRested = true;
  next.phase = 'ATTACK';

  if (effect === 'FLIP') {
    targetLife.isFaceDown = false;
    appendLog(
      next,
      `💔 "${attackerSlot.card.name}" โจมตีหงาย Life Card ใบที่ #${lifeIndex + 1} ของ ${defenderBoard.name}: "${targetLife.name}"`
    );
  } else {
    const [destroyed] = defenderBoard.lifeZone.splice(lifeIndex, 1);
    destroyed.isFaceDown = false;
    defenderBoard.hellZone.unshift(destroyed);
    appendLog(
      next,
      `🔥 "${attackerSlot.card.name}" โจมตีทำลาย Life Card "${destroyed.name}" ของ ${defenderBoard.name} ลงนรก! (เหลือ Life ${defenderBoard.lifeZone.length} ใบ)`
    );
    if (defenderBoard.lifeZone.length === 0) {
      next.winner = {
        side: attackerSide,
        reason: `${attackerBoard.name} ทำลาย Life Card ของฝ่ายตรงข้ามหมดทั้ง 5 ใบ!`,
      };
    }
  }

  return next;
}

export function flipLifeCard(
  state: PlaymatState,
  side: PlayerSide,
  lifeIndex: number
): PlaymatState {
  const next = clonePlaymatState(state);
  const card = next[side].lifeZone[lifeIndex];
  if (!card) return state;
  card.isFaceDown = !card.isFaceDown;
  appendLog(
    next,
    `${next[side].name}: ${card.isFaceDown ? 'คว่ำ' : 'หงาย'} Life Card #${lifeIndex + 1} (${card.name})`
  );
  return next;
}

export function destroyFieldSlotToZone(
  state: PlaymatState,
  side: PlayerSide,
  zoneType: 'AVATAR' | 'CONSTRUCT',
  slotIndex: number,
  destination: 'HELL' | 'DARK' | 'HAND' | 'DECK_TOP' | 'DECK_BOTTOM'
): PlaymatState {
  const next = clonePlaymatState(state);
  const board = next[side];

  let mainCard: PlaymatCardInstance | null = null;
  let attachments: PlaymatCardInstance[] = [];

  if (zoneType === 'AVATAR') {
    const slot = board.avatarZone[slotIndex];
    if (!slot) return state;
    mainCard = slot.card;
    attachments = slot.attachedModifications;
    board.avatarZone[slotIndex] = null;
  } else {
    const slot = board.constructZone[slotIndex];
    if (!slot) return state;
    mainCard = slot.card;
    board.constructZone[slotIndex] = null;
  }

  if (attachments.length > 0) {
    board.hellZone.unshift(...attachments);
  }

  if (destination === 'HELL') {
    board.hellZone.unshift(mainCard);
  } else if (destination === 'DARK') {
    board.darkZone.unshift(mainCard);
  } else if (destination === 'HAND') {
    board.hand.push(mainCard);
  } else if (destination === 'DECK_TOP') {
    board.deck.unshift(mainCard);
  } else if (destination === 'DECK_BOTTOM') {
    board.deck.push(mainCard);
  }

  appendLog(next, `${board.name}: ย้าย "${mainCard.name}" ไปยัง ${destination}`);
  return next;
}

export function getGemZoneTotal(board: PlayerBoardState): number {
  return (board.gemZone || []).reduce((sum, c) => sum + (c.gems ?? 1), 0);
}

export function placeCardIntoGemZone(
  state: PlaymatState,
  side: PlayerSide,
  cardInstanceId: string
): PlaymatState {
  const next = clonePlaymatState(state);
  const board = next[side];
  const idx = board.hand.findIndex((c) => c.instanceId === cardInstanceId);
  if (idx === -1) return state;

  const [card] = board.hand.splice(idx, 1);
  board.gemZone.push({ ...card, isFaceDown: false });
  appendLog(
    next,
    `${board.name}: วาง "${card.name}" (💎${card.gems ?? 1}) ลงในช่อง Gem (รวม 💎${getGemZoneTotal(board)})`
  );
  return next;
}

export function flushGemZoneToHell(
  state: PlaymatState,
  side: PlayerSide
): PlaymatState {
  const next = clonePlaymatState(state);
  const board = next[side];
  if (!board.gemZone || board.gemZone.length === 0) return state;

  const totalGems = getGemZoneTotal(board);
  const count = board.gemZone.length;
  board.hellZone.unshift(...board.gemZone);
  board.gemZone = [];
  appendLog(
    next,
    `${board.name}: ส่งการ์ดจากช่อง Gem ${count} ใบ (รวม 💎${totalGems}) ลงโซนนรก!`
  );
  return next;
}

/**
 * Generic card movement between list-based zones (DECK, HAND, MAGIC, GEM, LIFE, HELL, DARK).
 */
export function moveCardFromZone(
  state: PlaymatState,
  side: PlayerSide,
  fromZone: PlaymatZoneName,
  toZone: PlaymatZoneName | 'DECK_TOP' | 'DECK_BOTTOM',
  instanceId: string
): PlaymatState {
  const next = clonePlaymatState(state);
  const board = next[side];

  const extractFromList = (list: PlaymatCardInstance[]): PlaymatCardInstance | null => {
    const idx = list.findIndex((c) => c.instanceId === instanceId);
    if (idx === -1) return null;
    return list.splice(idx, 1)[0];
  };

  let moved: PlaymatCardInstance | null = null;
  if (fromZone === 'HAND') moved = extractFromList(board.hand);
  else if (fromZone === 'DECK') moved = extractFromList(board.deck);
  else if (fromZone === 'MAGIC') moved = extractFromList(board.magicZone);
  else if (fromZone === 'GEM') moved = extractFromList(board.gemZone);
  else if (fromZone === 'LIFE') moved = extractFromList(board.lifeZone);
  else if (fromZone === 'HELL') moved = extractFromList(board.hellZone);
  else if (fromZone === 'DARK') moved = extractFromList(board.darkZone);
  else if (fromZone === 'LAND' && next.landMagicZone?.card.instanceId === instanceId) {
    moved = next.landMagicZone.card;
    next.landMagicZone = null;
  }

  if (!moved) return state;
  moved.isFaceDown = toZone === 'LIFE';

  if (toZone === 'HAND') board.hand.push(moved);
  else if (toZone === 'HELL') board.hellZone.unshift(moved);
  else if (toZone === 'DARK') board.darkZone.unshift(moved);
  else if (toZone === 'MAGIC') board.magicZone.push(moved);
  else if (toZone === 'GEM') board.gemZone.push(moved);
  else if (toZone === 'LIFE') board.lifeZone.push(moved);
  else if (toZone === 'DECK' || toZone === 'DECK_TOP') board.deck.unshift(moved);
  else if (toZone === 'DECK_BOTTOM') board.deck.push(moved);
  else if (toZone === 'AVATAR') {
    const emptyIdx = board.avatarZone.findIndex((s) => s === null);
    if (emptyIdx !== -1) {
      board.avatarZone[emptyIdx] = {
        id: `avatar-slot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        card: { ...moved, isFaceDown: false },
        powerModifier: 0,
        isRested: false,
        attachedModifications: [],
      };
    } else {
      board.hand.push(moved);
    }
  } else if (toZone === 'CONSTRUCT') {
    const emptyIdx = board.constructZone.findIndex((s) => s === null);
    if (emptyIdx !== -1) {
      board.constructZone[emptyIdx] = {
        id: `construct-slot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        card: { ...moved, isFaceDown: false },
        isRested: false,
      };
    } else {
      board.hand.push(moved);
    }
  }

  appendLog(next, `${board.name}: ย้าย "${moved.name}" จาก ${fromZone} → ${toZone}`);
  return next;
}

export function setPhase(state: PlaymatState, phase: TurnPhase): PlaymatState {
  const next = clonePlaymatState(state);
  next.phase = phase;
  return next;
}

export function passTurn(state: PlaymatState, autoSwapPerspective = false): PlaymatState {
  const next = clonePlaymatState(state);
  const nextSide: PlayerSide = next.currentTurn === 'player1' ? 'player2' : 'player1';

  if (nextSide === next.firstPlayer) {
    next.turnNumber += 1;
  }

  next.currentTurn = nextSide;
  next.phase = 'DRAW';

  // Untap (Stand) all Avatars and Constructs of the new active turn player
  for (const slot of next[nextSide].avatarZone) {
    if (slot) slot.isRested = false;
  }
  for (const slot of next[nextSide].constructZone) {
    if (slot) slot.isRested = false;
  }

  if (autoSwapPerspective) {
    next.perspective = nextSide;
  }

  appendLog(next, `⏭️ จบเทิร์น → เข้าสู่เทิร์นของ ${next[nextSide].name} (Turn ${next.turnNumber})`);
  return next;
}

export function swapPerspective(state: PlaymatState, target?: PlayerSide): PlaymatState {
  const next = clonePlaymatState(state);
  next.perspective = target || (next.perspective === 'player1' ? 'player2' : 'player1');
  return next;
}

export function toggleRevealAllHands(state: PlaymatState): PlaymatState {
  const next = clonePlaymatState(state);
  next.soloRevealAllHands = !next.soloRevealAllHands;
  appendLog(
    next,
    next.soloRevealAllHands
      ? '👁️ เปิดโหมดซ้อมดูมือทั้ง 2 ฝั่ง'
      : '🔒 ปิดโหมดดูมือคู่ซ้อม'
  );
  return next;
}

export function flipCoin(state: PlaymatState): PlaymatState {
  const next = clonePlaymatState(state);
  const res: 'HEADS' | 'TAILS' = Math.random() < 0.5 ? 'HEADS' : 'TAILS';
  next.lastCoinFlip = res;
  appendLog(next, `🪙 ทอยเหรียญได้: ${res === 'HEADS' ? 'หัว (HEADS)' : 'ก้อย (TAILS)'}`);
  return next;
}

