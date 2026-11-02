import { describe, it, expect, beforeEach } from 'vitest';
import {
  useCollectionStore,
  sanitizeForFirestore,
  pruneCards,
  reconcileCards,
} from './collectionStore.ts';
import { useDeckStore, reconcileDecks } from './deckStore.ts';
import { firebaseConfig } from '../utils/firebase.ts';
import { getLocalWebUsers, setLocalWebUsers } from '../services/userService.ts';
import type { Deck } from '../types/deck.ts';

describe('Firebase Config, Collection Backup & Playmat Deck Selection', () => {
  beforeEach(() => {
    useCollectionStore.getState().clearCollection();
    useDeckStore.setState({ decks: [], activeDeckId: null, pendingPlaymatDeckId: null });
  });

  it('configures botcounttracker Firebase project ID and measurementId', () => {
    expect(firebaseConfig.projectId).toBe('botcounttracker');
    expect(firebaseConfig.authDomain).toBe('botcounttracker.firebaseapp.com');
    expect(firebaseConfig.measurementId).toBe('G-XR3PTEV5C1');
  });

  it('exports and imports collection JSON backup accurately', () => {
    const store = useCollectionStore.getState();
    store.setCardCount('BT01-001', 'normal', 3);
    store.setCardCount('BT01-002', 'foil', 1);

    const exported = useCollectionStore.getState().exportCollectionJSON();
    expect(exported).toContain('BT01-001');

    useCollectionStore.getState().clearCollection();
    expect(useCollectionStore.getState().getCardTotal('BT01-001')).toBe(0);

    const result = useCollectionStore.getState().importCollectionJSON(exported);
    expect(result.success).toBe(true);
    expect(useCollectionStore.getState().getCardTotal('BT01-001')).toBe(3);
    expect(useCollectionStore.getState().getCardTotal('BT01-002')).toBe(1);
  });

  it('rejects invalid JSON when importing collection backup', () => {
    const result = useCollectionStore.getState().importCollectionJSON('{invalid json');
    expect(result.success).toBe(false);
  });

  it('tracks pendingPlaymatDeckId in deckStore for launching Solo Playmat from Deck Builder', () => {
    const deckId = useDeckStore.getState().createDeck('เด็คซ้อมตลิ่งชัน');
    useDeckStore.getState().setPendingPlaymatDeck(deckId);
    expect(useDeckStore.getState().pendingPlaymatDeckId).toBe(deckId);

    useDeckStore.getState().setPendingPlaymatDeck(null);
    expect(useDeckStore.getState().pendingPlaymatDeckId).toBeNull();
  });

  it('strips undefined fields via sanitizeForFirestore and prunes zeroed cards via pruneCards', () => {
    const dirty = { a: 1, b: undefined, nested: { c: 'ok', d: undefined } };
    const clean = sanitizeForFirestore(dirty);
    expect('b' in clean).toBe(false);
    expect('d' in clean.nested).toBe(false);

    const pruned = pruneCards({
      'BT01-001': { normal: 0, foil: 0, secret: 0 },
      'BT01-002': { normal: 2, foil: 1, secret: 0 },
    });
    expect(pruned['BT01-001']).toBeUndefined();
    expect(pruned['BT01-002']).toEqual({ normal: 2, foil: 1, secret: 0 });
  });

  it('performs two-way reconciliation of local and cloud card counts without data loss', () => {
    const local = {
      'BT01-001': { normal: 3, foil: 0, secret: 0 },
      'BT01-002': { normal: 1, foil: 2, secret: 0 },
    };
    const cloud = {
      'BT01-001': { normal: 1, foil: 1, secret: 0 },
      'BT01-003': { normal: 0, foil: 0, secret: 1 },
    };

    const { merged, changedFromCloud } = reconcileCards(local, cloud);
    expect(changedFromCloud).toBe(true);
    expect(merged['BT01-001']).toEqual({ normal: 3, foil: 1, secret: 0 });
    expect(merged['BT01-002']).toEqual({ normal: 1, foil: 2, secret: 0 });
    expect(merged['BT01-003']).toEqual({ normal: 0, foil: 0, secret: 1 });
  });

  it('reconciles local and cloud decks by updatedAt and filters out tombstoned deleted decks', () => {
    const olderDeck: Deck = {
      id: 'd1',
      name: 'Old Name',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      mainDeck: [],
      lifeDeck: [],
    };
    const newerDeck: Deck = {
      ...olderDeck,
      name: 'Updated Name',
      updatedAt: '2026-02-01T00:00:00.000Z',
    };
    const deletedDeck: Deck = {
      id: 'd_deleted',
      name: 'Should Not Resurrect',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
      mainDeck: [],
      lifeDeck: [],
    };

    const { mergedDecks, decksToUpload } = reconcileDecks(
      [newerDeck],
      [olderDeck, deletedDeck],
      new Set(['d_deleted'])
    );

    expect(mergedDecks).toHaveLength(1);
    expect(mergedDecks[0].name).toBe('Updated Name');
    expect(decksToUpload).toHaveLength(1);
    expect(decksToUpload[0].id).toBe('d1');
  });

  it('stores and retrieves local web user cache via userService', () => {
    setLocalWebUsers([
      {
        uid: 'u1',
        email: 'player@talingchan.com',
        displayName: 'Talingchan Player',
        lastLoginAt: 1000,
      },
    ]);
    const list = getLocalWebUsers();
    expect(list).toHaveLength(1);
    expect(list[0].uid).toBe('u1');
  });
});
