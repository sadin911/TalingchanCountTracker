import rawCardsData from '../data/talingchanCards.json';
import rawSetsData from '../data/talingchanSets.json';
import type { TalingchanCard, TalingchanSet, FinishKey } from '../types/card.ts';
import type { Deck, DeckCard, ValidationResult } from '../types/deck.ts';
import type { CardFinishesCount } from '../types/collection.ts';
import type { McpTokenRecord, McpToolDefinition } from '../types/mcp.ts';
import { validateDeck } from './deckValidator.ts';
import { resolveCardImageUrl } from './cardImage.ts';

const CATALOG_CARDS = rawCardsData as unknown as TalingchanCard[];
const CATALOG_SETS = rawSetsData as unknown as TalingchanSet[];
const CARD_MAP = new Map<string, TalingchanCard>(CATALOG_CARDS.map((c) => [c.id, c]));

export const MAX_DECKS_PER_USER = 50;
export const MAX_COLLECTION_ADD_PER_ITEM = 20;

/**
 * Generates a high-entropy 128-bit Personal Access Token prefixed with `tct_mcp_`.
 */
export function generateMcpRawToken(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `tct_mcp_${hex}`;
}

/**
 * Computes the SHA-256 hex digest of an input string using standard Web Crypto API.
 */
export async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface SearchCardsParams {
  query?: string;
  setCode?: string;
  color?: string;
  cardType?: string;
  symbol?: string;
  soi?: number;
  cost?: number;
  rarity?: string;
  limit?: number;
}

export function searchCardsMcp(params: SearchCardsParams = {}) {
  const q = (params.query || '').trim().toLowerCase();
  const setCode = (params.setCode || '').trim().toUpperCase();
  const color = (params.color || '').trim().toUpperCase();
  const cardType = (params.cardType || '').trim().toLowerCase();
  const symbol = (params.symbol || '').trim().toLowerCase();
  const rarity = (params.rarity || '').trim().toLowerCase();
  const maxLimit = Math.min(50, Math.max(1, Number(params.limit) || 20));

  const matched = CATALOG_CARDS.filter((c) => {
    if (setCode && c.setCode.toUpperCase() !== setCode) return false;
    if (color && c.color.toUpperCase() !== color) return false;
    if (cardType && c.cardType.toLowerCase() !== cardType) return false;
    if (symbol && !(c.symbol || '').toLowerCase().includes(symbol)) return false;
    if (rarity && c.rarity.toLowerCase() !== rarity) return false;
    if (params.soi !== undefined && params.soi !== null && c.soi !== Number(params.soi)) return false;
    if (params.cost !== undefined && params.cost !== null && c.cost !== Number(params.cost)) return false;

    if (q) {
      const haystack = `${c.id} ${c.name} ${c.effect || ''} ${c.memeLore || ''} ${c.symbol || ''}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  return {
    totalMatches: matched.length,
    returnedCount: Math.min(matched.length, maxLimit),
    cards: matched.slice(0, maxLimit).map((c) => ({
      id: c.id,
      name: c.name,
      setCode: c.setCode,
      setName: c.setName,
      cardType: c.cardType,
      color: c.color,
      symbol: c.symbol,
      soi: c.soi,
      cost: c.cost,
      gems: c.gems,
      power: c.power,
      rarity: c.rarity,
      isOnlyOne: c.isOnlyOne,
      isBiased: c.isBiased,
      effect: c.effect,
      memeLore: c.memeLore,
      imageUrl: resolveCardImageUrl(c),
    })),
  };
}

export function getCardDetailsMcp(params: { cardId: string }) {
  const cleanId = (params?.cardId || '').trim().toUpperCase();
  const card = CARD_MAP.get(cleanId);
  if (!card) {
    return {
      found: false,
      error: `ไม่พบการ์ดรหัส "${cleanId}" ในระบบ (ตรวจสอบรหัสเช่น BT01-001 หรือ BT12-001)`,
      card: null,
      imageUrl: null,
    };
  }
  return {
    found: true,
    card,
    imageUrl: resolveCardImageUrl(card),
  };
}

export function listSetsMcp() {
  return {
    totalSets: CATALOG_SETS.length,
    totalCardsInGame: CATALOG_CARDS.length,
    sets: CATALOG_SETS,
  };
}

function hydrateDeckCards(entries: Array<{ cardId: string; count: number }> = []): {
  deckCards: DeckCard[];
  unknownIds: string[];
} {
  const deckCards: DeckCard[] = [];
  const unknownIds: string[] = [];

  for (const item of entries) {
    const cleanId = (item?.cardId || '').trim().toUpperCase();
    const count = Math.max(1, Math.floor(Number(item?.count) || 1));
    const card = CARD_MAP.get(cleanId);
    if (!card) {
      unknownIds.push(cleanId);
      continue;
    }
    const existing = deckCards.find((d) => d.id === card.id);
    if (existing) {
      existing.count += count;
    } else {
      deckCards.push({
        id: card.id,
        name: card.name,
        setCode: card.setCode,
        collectorNumber: card.collectorNumber,
        cardType: card.cardType,
        color: card.color,
        cost: card.cost,
        isOnlyOne: card.isOnlyOne,
        isBiased: card.isBiased,
        count,
      });
    }
  }

  return { deckCards, unknownIds };
}

export function validateDeckListMcp(params: {
  mainDeck?: Array<{ cardId: string; count: number }>;
  lifeDeck?: Array<{ cardId: string; count: number }>;
}): { validation: ValidationResult; unknownCardIds: string[] } {
  const mainHydrated = hydrateDeckCards(params?.mainDeck || []);
  const lifeHydrated = hydrateDeckCards(params?.lifeDeck || []);
  const validation = validateDeck(mainHydrated.deckCards, lifeHydrated.deckCards);
  const unknownCardIds = [...mainHydrated.unknownIds, ...lifeHydrated.unknownIds];
  if (unknownCardIds.length > 0) {
    validation.isValid = false;
    validation.errors.unshift(`พบรหัสการ์ดที่ไม่มีในระบบ: ${unknownCardIds.join(', ')}`);
  }
  return { validation, unknownCardIds };
}

export function getMyCollectionMcp(
  vault: McpTokenRecord,
  params: { setCode?: string; color?: string; query?: string } = {}
) {
  const setFilter = (params.setCode || '').trim().toUpperCase();
  const colorFilter = (params.color || '').trim().toUpperCase();
  const queryFilter = (params.query || '').trim().toLowerCase();

  const allEntries = Object.entries(vault.cards || {});
  let totalUniqueOwned = 0;
  let totalCopiesOwned = 0;

  const items: Array<{
    cardId: string;
    name: string;
    setCode: string;
    color: string;
    cardType: string;
    normal: number;
    foil: number;
    secret: number;
    totalCount: number;
  }> = [];

  for (const [cardId, counts] of allEntries) {
    const n = Number(counts?.normal) || 0;
    const f = Number(counts?.foil) || 0;
    const s = Number(counts?.secret) || 0;
    const sum = n + f + s;
    if (sum <= 0) continue;

    totalUniqueOwned += 1;
    totalCopiesOwned += sum;

    const card = CARD_MAP.get(cardId);
    if (!card) continue;

    if (setFilter && card.setCode.toUpperCase() !== setFilter) continue;
    if (colorFilter && card.color.toUpperCase() !== colorFilter) continue;
    if (queryFilter) {
      const hay = `${card.id} ${card.name} ${card.symbol || ''}`.toLowerCase();
      if (!hay.includes(queryFilter)) continue;
    }

    items.push({
      cardId: card.id,
      name: card.name,
      setCode: card.setCode,
      color: card.color,
      cardType: card.cardType,
      normal: n,
      foil: f,
      secret: s,
      totalCount: sum,
    });
  }

  return {
    totalUniqueOwned,
    totalCopiesOwned,
    filteredCount: items.length,
    items: items.slice(0, 200),
  };
}

export function getMyDecksMcp(vault: McpTokenRecord) {
  const decks = (vault.decks || []).map((deck) => {
    const validation = validateDeck(deck.mainDeck || [], deck.lifeDeck || []);
    const missingCards: Array<{
      cardId: string;
      name: string;
      required: number;
      owned: number;
      missing: number;
    }> = [];

    const allRequired = [...(deck.mainDeck || []), ...(deck.lifeDeck || [])];
    for (const reqCard of allRequired) {
      const entry = vault.cards?.[reqCard.id];
      const owned = entry
        ? (Number(entry.normal) || 0) + (Number(entry.foil) || 0) + (Number(entry.secret) || 0)
        : 0;
      if (owned < reqCard.count) {
        missingCards.push({
          cardId: reqCard.id,
          name: reqCard.name,
          required: reqCard.count,
          owned,
          missing: reqCard.count - owned,
        });
      }
    }

    return {
      ...deck,
      validation,
      missingCards,
    };
  });

  return {
    totalDecks: decks.length,
    decks,
  };
}

export function saveAiDeckMcp(
  vault: McpTokenRecord,
  params: {
    deckId?: string;
    name: string;
    mainDeck: Array<{ cardId: string; count: number }>;
    lifeDeck: Array<{ cardId: string; count: number }>;
  }
) {
  if (vault.scope !== 'read_write') {
    throw new Error('Permission denied: Token นี้เป็นแบบอ่านอย่างเดียว (read-only) ไม่สามารถสร้างหรือแก้ไขเด็คได้');
  }

  const cleanName = (params?.name || '').trim() || 'เด็คจัดโดย AI';
  const mainHydrated = hydrateDeckCards(params?.mainDeck || []);
  const lifeHydrated = hydrateDeckCards(params?.lifeDeck || []);
  const unknownIds = [...mainHydrated.unknownIds, ...lifeHydrated.unknownIds];
  if (unknownIds.length > 0) {
    throw new Error(`พบรหัสการ์ดที่ไม่มีในระบบ: ${unknownIds.join(', ')}`);
  }

  const nowIso = new Date().toISOString();
  const currentDecks = [...(vault.decks || [])];
  const existingIdx = params.deckId ? currentDecks.findIndex((d) => d.id === params.deckId) : -1;

  let savedDeck: Deck;
  if (existingIdx >= 0) {
    savedDeck = {
      ...currentDecks[existingIdx],
      name: cleanName,
      updatedAt: nowIso,
      mainDeck: mainHydrated.deckCards,
      lifeDeck: lifeHydrated.deckCards,
    };
    currentDecks[existingIdx] = savedDeck;
  } else {
    if (currentDecks.length >= MAX_DECKS_PER_USER) {
      throw new Error(`ไม่สามารถสร้างเด็คเพิ่มได้ (เกินขีดจำกัดสูงสุด ${MAX_DECKS_PER_USER} เด็คต่อบัญชี)`);
    }
    savedDeck = {
      id: `deck_ai_${Date.now()}`,
      name: cleanName,
      createdAt: nowIso,
      updatedAt: nowIso,
      mainDeck: mainHydrated.deckCards,
      lifeDeck: lifeHydrated.deckCards,
    };
    currentDecks.unshift(savedDeck);
  }

  const validation = validateDeck(savedDeck.mainDeck, savedDeck.lifeDeck);

  return {
    savedDeck,
    validation,
    updatedDecks: currentDecks,
  };
}

export function addCardsToCollectionMcp(
  vault: McpTokenRecord,
  params: {
    items: Array<{ cardId: string; finish?: FinishKey; addCount: number }>;
  }
) {
  if (vault.scope !== 'read_write') {
    throw new Error('Permission denied: Token นี้เป็นแบบอ่านอย่างเดียว (read-only) ไม่สามารถเพิ่มการ์ดในคลังได้');
  }

  const items = params?.items || [];
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('กรุณาระบุรายการการ์ดที่ต้องการเพิ่ม (items)');
  }
  if (items.length > 25) {
    throw new Error('เพิ่มการ์ดได้สูงสุดครั้งละไม่เกิน 25 รายการต่อคำสั่ง');
  }

  const updatedCards: Record<string, CardFinishesCount> = { ...vault.cards };
  const addedSummary: Array<{ cardId: string; name: string; finish: FinishKey; added: number; newTotal: number }> = [];

  for (const item of items) {
    const cleanId = (item?.cardId || '').trim().toUpperCase();
    const card = CARD_MAP.get(cleanId);
    if (!card) {
      throw new Error(`ไม่พบรหัสการ์ด "${cleanId}" ในระบบ`);
    }
    const addCount = Math.floor(Number(item?.addCount));
    if (!Number.isFinite(addCount) || addCount <= 0) {
      throw new Error(
        `ไม่อนุญาตให้ลดหรือล้างจำนวนการ์ดผ่าน MCP (ต้องระบุ addCount เป็นจำนวนเต็มบวกเพิ่ม >= 1 เท่านั้น สำหรับ ${cleanId})`
      );
    }
    if (addCount > MAX_COLLECTION_ADD_PER_ITEM) {
      throw new Error(`เพิ่มการ์ดต่อใบได้ไม่เกินครั้งละ ${MAX_COLLECTION_ADD_PER_ITEM} ใบ (${cleanId})`);
    }

    const finish: FinishKey =
      item.finish === 'foil' || item.finish === 'secret' ? item.finish : 'normal';
    const current = updatedCards[cleanId] || { normal: 0, foil: 0, secret: 0 };
    const nextEntry: CardFinishesCount = {
      normal: Number(current.normal) || 0,
      foil: Number(current.foil) || 0,
      secret: Number(current.secret) || 0,
    };
    nextEntry[finish] += addCount;
    updatedCards[cleanId] = nextEntry;

    addedSummary.push({
      cardId: cleanId,
      name: card.name,
      finish,
      added: addCount,
      newTotal: nextEntry.normal + nextEntry.foil + nextEntry.secret,
    });
  }

  return {
    addedSummary,
    updatedCards,
  };
}

export const MCP_TOOLS_LIST: McpToolDefinition[] = [
  {
    name: 'search_cards',
    description:
      'ค้นหาการ์ด Battle of Talingchan (แบทเทิล ออฟ ตลิ่งชัน) จากชื่อการ์ด, ความสามารถ (Effect), ที่มามีม/ล้อเลียน (memeLore), รหัสชุด (เช่น BT12), สี, ประเภทการ์ด, เผ่า (symbol), ซอย, หรือค่าร่าย',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'คำค้นหาชื่อการ์ด ความสามารถ หรือมุกมีม' },
        setCode: { type: 'string', description: 'รหัสชุด เช่น BT01 ถึง BT12, SD01 ถึง SD09, B2SA, B2SB' },
        color: { type: 'string', description: 'สีของการ์ด: RED, BLUE, GREEN, BLACK, COLORLESS' },
        cardType: {
          type: 'string',
          description: 'ประเภทการ์ด: Avatar, Magic, Construct, Modification, React Magic, Land Magic, Life Card',
        },
        symbol: { type: 'string', description: 'เผ่าหรือสัญลักษณ์ เช่น ยักษ์, เทพ, ผี, คน' },
        soi: { type: 'number', description: 'ระดับซอย (1, 2, 3)' },
        cost: { type: 'number', description: 'ค่าร่ายของการ์ด' },
        limit: { type: 'number', description: 'จำนวนผลลัพธ์สูงสุด (ค่าเริ่มต้น 20, สูงสุด 50)' },
      },
    },
  },
  {
    name: 'get_card_details',
    description: 'ดูข้อมูลการ์ดรายใบแบบละเอียด รวมถึงความสามารถภาษาไทย ต้นแบบล้อเลียน เจาะลึกมุกมีม และลิงก์รูปการ์ด HD',
    inputSchema: {
      type: 'object',
      properties: {
        cardId: { type: 'string', description: 'รหัสการ์ด เช่น BT01-001 หรือ BT12-001' },
      },
      required: ['cardId'],
    },
  },
  {
    name: 'list_sets',
    description: 'แสดงรายชื่อชุดการ์ดทั้งหมด 39 ชุดของ Battle of Talingchan พร้อมจำนวนการ์ดและวันวางจำหน่าย',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'validate_deck_list',
    description:
      'ตรวจสอบความถูกต้องของเด็คตามกฎทางการของ Battle of Talingchan (Main Deck 50 ใบ, Life 5 ใบไม่ซ้ำชื่อ, กฎ Only 1, ห้ามเกิน 4 ใบต่อชื่อ)',
    inputSchema: {
      type: 'object',
      properties: {
        mainDeck: {
          type: 'array',
          description: 'รายการการ์ดใน Main Deck [{ cardId, count }]',
          items: {
            type: 'object',
            properties: {
              cardId: { type: 'string' },
              count: { type: 'number' },
            },
            required: ['cardId', 'count'],
          },
        },
        lifeDeck: {
          type: 'array',
          description: 'รายการการ์ดใน Life Deck [{ cardId, count: 1 }]',
          items: {
            type: 'object',
            properties: {
              cardId: { type: 'string' },
              count: { type: 'number' },
            },
            required: ['cardId', 'count'],
          },
        },
      },
      required: ['mainDeck', 'lifeDeck'],
    },
  },
  {
    name: 'get_my_collection',
    description: 'ดูคลังการ์ดสะสมของผู้ใช้ที่เชื่อมต่อผ่าน MCP Token (ต้องใช้ Token สิทธิ์ read หรือ read_write)',
    inputSchema: {
      type: 'object',
      properties: {
        setCode: { type: 'string', description: 'กรองตามรหัสชุด เช่น BT12' },
        color: { type: 'string', description: 'กรองตามสี เช่น RED, BLUE, GREEN, BLACK' },
        query: { type: 'string', description: 'กรองตามชื่อการ์ดหรือเผ่า' },
      },
    },
  },
  {
    name: 'get_my_decks',
    description: 'ดูเด็คทั้งหมดของผู้ใช้ พร้อมสถานะการตรวจกฎและรายการการ์ดที่ยังขาดในคลัง (ต้องใช้ Token สิทธิ์ read หรือ read_write)',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'save_ai_deck',
    description:
      'สร้างเด็คใหม่หรืออัปเดตเด็คเดิมของผู้ใช้ พร้อมตรวจกฎอัตโนมัติ (ต้องใช้ Token สิทธิ์ read_write เท่านั้น และไม่สามารถลบเด็คเดิมได้)',
    inputSchema: {
      type: 'object',
      properties: {
        deckId: { type: 'string', description: 'ระบุเมื่อต้องการอัปเดตเด็คเดิม (หากเว้นว่างจะสร้างเด็คใหม่)' },
        name: { type: 'string', description: 'ชื่อเด็ค' },
        mainDeck: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              cardId: { type: 'string' },
              count: { type: 'number' },
            },
            required: ['cardId', 'count'],
          },
        },
        lifeDeck: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              cardId: { type: 'string' },
              count: { type: 'number' },
            },
            required: ['cardId', 'count'],
          },
        },
      },
      required: ['name', 'mainDeck', 'lifeDeck'],
    },
  },
  {
    name: 'add_cards_to_collection',
    description:
      'เพิ่มจำนวนการ์ดเข้าคลังสะสมของผู้ใช้ (ต้องใช้ Token สิทธิ์ read_write เท่านั้น อนุญาตเฉพาะการบวกเพิ่ม ห้ามลบหรือล้างคลัง)',
    inputSchema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              cardId: { type: 'string', description: 'รหัสการ์ด เช่น BT12-001' },
              finish: { type: 'string', description: 'normal, foil, หรือ secret (ค่าเริ่มต้น normal)' },
              addCount: { type: 'number', description: 'จำนวนที่ต้องการบวกเพิ่ม (1 ถึง 20)' },
            },
            required: ['cardId', 'addCount'],
          },
        },
      },
      required: ['items'],
    },
  },
];

export async function executeMcpToolCall(
  toolName: string,
  args: Record<string, unknown> = {},
  vault: McpTokenRecord | null = null
): Promise<{
  output: unknown;
  mutatedVault?: { cards?: Record<string, CardFinishesCount>; decks?: Deck[] };
}> {
  switch (toolName) {
    case 'search_cards':
      return { output: searchCardsMcp(args as SearchCardsParams) };
    case 'get_card_details':
      return { output: getCardDetailsMcp(args as { cardId: string }) };
    case 'list_sets':
      return { output: listSetsMcp() };
    case 'validate_deck_list':
      return {
        output: validateDeckListMcp(
          args as {
            mainDeck?: Array<{ cardId: string; count: number }>;
            lifeDeck?: Array<{ cardId: string; count: number }>;
          }
        ),
      };
    case 'get_my_collection':
      if (!vault) {
        throw new Error('Unauthorized: กรุณาแนบ MCP Bearer Token เพื่อดูคลังการ์ดของคุณ');
      }
      return {
        output: getMyCollectionMcp(vault, args as { setCode?: string; color?: string; query?: string }),
      };
    case 'get_my_decks':
      if (!vault) {
        throw new Error('Unauthorized: กรุณาแนบ MCP Bearer Token เพื่อดูเด็คของคุณ');
      }
      return { output: getMyDecksMcp(vault) };
    case 'save_ai_deck': {
      if (!vault) {
        throw new Error('Unauthorized: กรุณาแนบ MCP Bearer Token (สิทธิ์ read_write) เพื่อบันทึกเด็ค');
      }
      const res = saveAiDeckMcp(
        vault,
        args as {
          deckId?: string;
          name: string;
          mainDeck: Array<{ cardId: string; count: number }>;
          lifeDeck: Array<{ cardId: string; count: number }>;
        }
      );
      return {
        output: {
          message: `บันทึกเด็ค "${res.savedDeck.name}" สำเร็จ`,
          deck: res.savedDeck,
          validation: res.validation,
        },
        mutatedVault: { decks: res.updatedDecks },
      };
    }
    case 'add_cards_to_collection': {
      if (!vault) {
        throw new Error('Unauthorized: กรุณาแนบ MCP Bearer Token (สิทธิ์ read_write) เพื่อเพิ่มการ์ดเข้าคลัง');
      }
      const res = addCardsToCollectionMcp(
        vault,
        args as { items: Array<{ cardId: string; finish?: FinishKey; addCount: number }> }
      );
      return {
        output: {
          message: `เพิ่มการ์ดเข้าคลังสำเร็จ ${res.addedSummary.length} รายการ`,
          added: res.addedSummary,
        },
        mutatedVault: { cards: res.updatedCards },
      };
    }
    default:
      throw new Error(`Unknown MCP tool: ${toolName}`);
  }
}
