import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '../utils/firebase.ts';
import {
  useCollectionStore,
  pruneCards,
  reconcileCards,
  sanitizeForFirestore,
} from '../store/collectionStore.ts';
import { useDeckStore, reconcileDecks } from '../store/deckStore.ts';
import { generateMcpRawToken, sha256Hex } from '../utils/mcpCatalogEngine.ts';
import type { McpTokenRecord, McpTokenScope } from '../types/mcp.ts';

const LOCAL_MCP_TOKENS_KEY = 'talingchan_mcp_tokens_cache_v1';

function readLocalTokensCache(uid: string): McpTokenRecord[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(`${LOCAL_MCP_TOKENS_KEY}_${uid}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalTokensCache(uid: string, tokens: McpTokenRecord[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(`${LOCAL_MCP_TOKENS_KEY}_${uid}`, JSON.stringify(tokens));
  } catch {
    // ignore storage errors
  }
}

/**
 * Creates a new Personal Access Token (`tct_mcp_...`), stores only its SHA-256 hash
 * in Firestore `mcp_tokens/{tokenHash}`, and returns the raw token ONCE for the user to copy.
 */
export async function createMcpToken(params: {
  label: string;
  scope: McpTokenScope;
  expiresInDays: number | null;
}): Promise<{ rawToken: string; record: McpTokenRecord }> {
  const uid = auth?.currentUser?.uid || 'guest_local';
  const rawToken = generateMcpRawToken();
  const tokenHash = await sha256Hex(rawToken);
  const now = Date.now();
  const expiresAt =
    params.expiresInDays && params.expiresInDays > 0
      ? now + params.expiresInDays * 24 * 60 * 60 * 1000
      : null;

  const currentCards = pruneCards(useCollectionStore.getState().cards);
  const currentDecks = useDeckStore.getState().decks;

  const record: McpTokenRecord = {
    tokenHash,
    tokenPrefix: `${rawToken.slice(0, 12)}...${rawToken.slice(-4)}`,
    uid,
    label: params.label.trim() || 'AI Assistant',
    scope: params.scope,
    createdAt: now,
    expiresAt,
    revoked: false,
    cards: currentCards,
    decks: currentDecks,
    updatedAt: now,
  };

  // Persist to local cache immediately
  const cached = readLocalTokensCache(uid).filter((t) => t.tokenHash !== tokenHash);
  writeLocalTokensCache(uid, [record, ...cached]);

  if (db && auth?.currentUser) {
    await setDoc(doc(db, 'mcp_tokens', tokenHash), sanitizeForFirestore(record));
  }

  return { rawToken, record };
}

/**
 * Lists all MCP tokens belonging to the current user (sorted newest first).
 */
export async function listUserMcpTokens(uid?: string): Promise<McpTokenRecord[]> {
  const targetUid = uid || auth?.currentUser?.uid || 'guest_local';
  const localTokens = readLocalTokensCache(targetUid);

  if (!db || !auth?.currentUser || targetUid === 'guest_local') {
    return localTokens.sort((a, b) => b.createdAt - a.createdAt);
  }

  try {
    const q = query(collection(db, 'mcp_tokens'), where('uid', '==', targetUid));
    const snap = await getDocs(q);
    const cloudTokens: McpTokenRecord[] = [];
    snap.forEach((d) => {
      const data = d.data() as McpTokenRecord;
      if (data && data.tokenHash) {
        cloudTokens.push(data);
      }
    });
    cloudTokens.sort((a, b) => b.createdAt - a.createdAt);
    writeLocalTokensCache(targetUid, cloudTokens);
    return cloudTokens;
  } catch (err) {
    console.warn('listUserMcpTokens fallback to local cache:', err);
    return localTokens.sort((a, b) => b.createdAt - a.createdAt);
  }
}

/**
 * Immediately revokes an MCP token so any AI client using it is blocked on the next request.
 */
export async function revokeMcpToken(tokenHash: string): Promise<void> {
  const uid = auth?.currentUser?.uid || 'guest_local';
  const updatedLocal = readLocalTokensCache(uid).map((t) =>
    t.tokenHash === tokenHash ? { ...t, revoked: true, updatedAt: Date.now() } : t
  );
  writeLocalTokensCache(uid, updatedLocal);

  if (db && auth?.currentUser) {
    try {
      await updateDoc(doc(db, 'mcp_tokens', tokenHash), {
        revoked: true,
        updatedAt: Date.now(),
      });
    } catch (err) {
      console.warn('revokeMcpToken Firestore warning:', err);
    }
  }
}

/**
 * Permanently deletes a revoked or unwanted MCP token document.
 */
export async function deleteMcpToken(tokenHash: string): Promise<void> {
  const uid = auth?.currentUser?.uid || 'guest_local';
  const remaining = readLocalTokensCache(uid).filter((t) => t.tokenHash !== tokenHash);
  writeLocalTokensCache(uid, remaining);

  if (db && auth?.currentUser) {
    try {
      await deleteDoc(doc(db, 'mcp_tokens', tokenHash));
    } catch (err) {
      console.warn('deleteMcpToken Firestore warning:', err);
    }
  }
}

/**
 * Bidirectional sync between the user's active MCP token vaults and their main collection/decks:
 * 1. Pulls any AI-added cards or AI-created/edited decks from active `read_write` tokens into the app.
 * 2. Pushes the reconciled collection and decks back to all active tokens so AI always sees fresh data.
 */
export async function reconcileUserMcpTokens(uid?: string): Promise<void> {
  const targetUid = uid || auth?.currentUser?.uid;
  if (!targetUid || !db || !auth?.currentUser) return;

  try {
    const tokens = await listUserMcpTokens(targetUid);
    const activeTokens = tokens.filter(
      (t) => !t.revoked && (!t.expiresAt || t.expiresAt > Date.now())
    );
    if (activeTokens.length === 0) return;

    let mergedCards = pruneCards(useCollectionStore.getState().cards);
    let mergedDecks = [...useDeckStore.getState().decks];
    let localCollectionChanged = false;
    let localDecksChanged = false;

    for (const token of activeTokens) {
      if (token.scope === 'read_write') {
        const cardRec = reconcileCards(mergedCards, pruneCards(token.cards || {}));
        if (JSON.stringify(cardRec.merged) !== JSON.stringify(mergedCards)) {
          mergedCards = cardRec.merged;
          localCollectionChanged = true;
        }

        const deckRec = reconcileDecks(mergedDecks, token.decks || [], new Set());
        if (JSON.stringify(deckRec.mergedDecks) !== JSON.stringify(mergedDecks)) {
          mergedDecks = deckRec.mergedDecks;
          localDecksChanged = true;
        }
      }
    }

    if (localCollectionChanged) {
      useCollectionStore.setState({ cards: mergedCards });
      await useCollectionStore.getState().forceSyncCloud(targetUid);
    }

    if (localDecksChanged) {
      useDeckStore.setState({
        decks: mergedDecks,
        activeDeckId:
          useDeckStore.getState().activeDeckId || mergedDecks[0]?.id || null,
      });
      await useDeckStore.getState().forceSyncDecksCloud(targetUid);
    }

    // Push latest reconciled snapshot to all active tokens
    const now = Date.now();
    for (const token of activeTokens) {
      await setDoc(
        doc(db, 'mcp_tokens', token.tokenHash),
        sanitizeForFirestore({
          ...token,
          cards: mergedCards,
          decks: mergedDecks,
          updatedAt: now,
        })
      );
    }
  } catch (err) {
    console.warn('reconcileUserMcpTokens skipped:', err);
  }
}
