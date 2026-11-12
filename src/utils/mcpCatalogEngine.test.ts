import { describe, it, expect } from 'vitest';
import {
  generateMcpRawToken,
  sha256Hex,
  searchCardsMcp,
  getCardDetailsMcp,
  listSetsMcp,
  validateDeckListMcp,
  getMyCollectionMcp,
  getMyDecksMcp,
  saveAiDeckMcp,
  addCardsToCollectionMcp,
  executeMcpToolCall,
} from './mcpCatalogEngine.ts';
import type { McpTokenRecord } from '../types/mcp.ts';

function createMockVault(scope: 'read' | 'read_write' = 'read_write'): McpTokenRecord {
  return {
    tokenHash: 'mock_hash_123',
    tokenPrefix: 'tct_mcp_1234',
    uid: 'user_abc',
    label: 'Test AI Client',
    scope,
    createdAt: Date.now() - 10000,
    expiresAt: null,
    revoked: false,
    cards: {
      'BT01-001': { normal: 2, foil: 1, secret: 0 },
      'BT12-001': { normal: 1, foil: 0, secret: 0 },
    },
    decks: [
      {
        id: 'deck_existing_1',
        name: 'เด็คยักษ์ตลิ่งชัน',
        createdAt: '2026-11-01T00:00:00.000Z',
        updatedAt: '2026-11-01T00:00:00.000Z',
        mainDeck: [
          {
            id: 'BT01-001',
            name: 'นนทก นิ้วเพชร',
            setCode: 'BT01',
            collectorNumber: '001',
            cardType: 'Avatar',
            color: 'RED',
            cost: 3,
            isOnlyOne: false,
            isBiased: false,
            count: 4,
          },
        ],
        lifeDeck: [],
      },
    ],
    updatedAt: Date.now(),
  };
}

describe('MCP Catalog & Scoped Security Engine', () => {
  it('generates high-entropy tct_mcp_ tokens and deterministic SHA-256 hashes', async () => {
    const raw1 = generateMcpRawToken();
    const raw2 = generateMcpRawToken();
    expect(raw1).toMatch(/^tct_mcp_[0-9a-f]{32}$/);
    expect(raw1).not.toBe(raw2);

    const h1 = await sha256Hex(raw1);
    const h1Again = await sha256Hex(raw1);
    expect(h1).toHaveLength(64);
    expect(h1).toBe(h1Again);
  });

  it('searches cards by query, setCode, color, and caps limit at 50', () => {
    const res = searchCardsMcp({ query: 'นนทก', setCode: 'BT01', limit: 100 });
    expect(res.totalMatches).toBeGreaterThan(0);
    expect(res.cards.length).toBeLessThanOrEqual(50);
    expect(res.cards[0].name).toContain('นนทก');
  });

  it('retrieves full card details including memeLore and High-Res R2 image URL', () => {
    const detail = getCardDetailsMcp({ cardId: 'BT12-001' });
    expect(detail.found).toBe(true);
    expect(detail.card?.id).toBe('BT12-001');
    expect(detail.card?.memeLore).toContain('🎯 ต้นแบบ/ล้อเลียน');
    expect(detail.imageUrl).toContain('r2.dev/card-images/BT12/001.webp');
  });

  it('lists all 39 official card sets', () => {
    const res = listSetsMcp();
    expect(res.totalSets).toBe(39);
    expect(res.sets.some((s) => s.code === 'BT12' && s.cardCount === 98)).toBe(true);
  });

  it('validates a deck list using official Battle of Talingchan rules', () => {
    const res = validateDeckListMcp({
      mainDeck: [{ cardId: 'BT01-001', count: 4 }],
      lifeDeck: [{ cardId: 'BT01-066', count: 1 }],
    });
    expect(res.validation.isValid).toBe(false);
    expect(res.validation.mainCount).toBe(4);
    expect(res.validation.errors.some((e) => e.includes('Main Deck ต้องมี 50 ใบพอดี'))).toBe(true);
  });

  it('reads user collection and computes missing cards for user decks', () => {
    const vault = createMockVault('read');
    const col = getMyCollectionMcp(vault, { setCode: 'BT01' });
    expect(col.totalUniqueOwned).toBe(2);
    expect(col.items[0].cardId).toBe('BT01-001');
    expect(col.items[0].totalCount).toBe(3);

    const decksRes = getMyDecksMcp(vault);
    expect(decksRes.decks).toHaveLength(1);
    expect(decksRes.decks[0].missingCards).toEqual([
      { cardId: 'BT01-001', name: 'นนทก นิ้วเพชร', required: 4, owned: 3, missing: 1 },
    ]);
  });

  it('enforces read_write scope and non-destructive rules on save_ai_deck & add_cards_to_collection', async () => {
    const readOnlyVault = createMockVault('read');

    await expect(
      executeMcpToolCall('save_ai_deck', { name: 'Hacked Deck', mainDeck: [], lifeDeck: [] }, readOnlyVault)
    ).rejects.toThrow(/read-only/i);

    await expect(
      executeMcpToolCall(
        'add_cards_to_collection',
        { items: [{ cardId: 'BT01-001', addCount: 1 }] },
        readOnlyVault
      )
    ).rejects.toThrow(/read-only/i);

    const rwVault = createMockVault('read_write');

    // Reject negative or zero counts (Non-Destructive Policy)
    expect(() =>
      addCardsToCollectionMcp(rwVault, { items: [{ cardId: 'BT01-001', addCount: -2 }] })
    ).toThrow(/บวกเพิ่ม/);

    // Positive increment works cleanly without deleting existing cards
    const addRes = addCardsToCollectionMcp(rwVault, {
      items: [{ cardId: 'BT01-001', finish: 'normal', addCount: 2 }],
    });
    expect(addRes.updatedCards['BT01-001'].normal).toBe(4);
    expect(addRes.updatedCards['BT12-001'].normal).toBe(1);

    // Save AI deck creates a new deck while preserving existing decks
    const saveRes = saveAiDeckMcp(rwVault, {
      name: 'เด็ค AI ทดสอบ',
      mainDeck: [{ cardId: 'BT12-001', count: 4 }],
      lifeDeck: [],
    });
    expect(saveRes.updatedDecks).toHaveLength(2);
    expect(saveRes.savedDeck.name).toContain('เด็ค AI ทดสอบ');
  });
});
