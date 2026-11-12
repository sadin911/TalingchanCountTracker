import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  updateDoc,
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

function getMcpVaultApiUrl(): string {
  if (
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    return `${window.location.origin}/mcp/vault`;
  }
  return 'https://talingchan.tcgcount.com/mcp/vault';
}

async function pushVaultToEdgeR2(record: McpTokenRecord, rawToken?: string): Promise<void> {
  try {
    if (typeof fetch === 'undefined') return;
    await fetch(getMcpVaultApiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rawToken,
        record: stripRawTokenForCloud(record),
      }),
    });
  } catch {
    // Non-fatal in offline/test environments
  }
}

async function fetchVaultFromEdgeR2(tokenHash: string): Promise<McpTokenRecord | null> {
  try {
    if (typeof fetch === 'undefined') return null;
    const resp = await fetch(`${getMcpVaultApiUrl()}?tokenHash=${encodeURIComponent(tokenHash)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as McpTokenRecord;
    return data && data.tokenHash ? data : null;
  } catch {
    return null;
  }
}

async function deleteVaultFromEdgeR2(tokenHash: string): Promise<void> {
  try {
    if (typeof fetch === 'undefined') return;
    await fetch(`${getMcpVaultApiUrl()}?tokenHash=${encodeURIComponent(tokenHash)}`, {
      method: 'DELETE',
    });
  } catch {
    // Non-fatal
  }
}

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

function stripRawTokenForCloud(record: McpTokenRecord): Omit<McpTokenRecord, 'rawToken'> {
  const { rawToken: _unusedRawToken, ...cloudSafeRecord } = record;
  return cloudSafeRecord;
}

/**
 * Creates a new Personal Access Token (`tct_mcp_...`), stores its vault in Cloudflare R2
 * (`/mcp/vault`) and Firestore (`users/{uid}/mcp_tokens/{tokenHash}`), and keeps `rawToken`
 * in the user's local browser cache so they can copy it anytime on this device.
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
    rawToken,
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

  // 1. Persist to local cache immediately (including rawToken so user can copy anytime on this browser)
  const cached = readLocalTokensCache(uid).filter((t) => t.tokenHash !== tokenHash);
  writeLocalTokensCache(uid, [record, ...cached]);

  // 2. Push capability vault to Cloudflare R2 Edge so the /mcp Worker can authenticate & read/write immediately
  await pushVaultToEdgeR2(record, rawToken);

  // 3. Persist under users/{uid}/mcp_tokens/{tokenHash} in Firestore (allowed by existing user wildcard rule)
  if (db && auth?.currentUser) {
    const cloudPayload = sanitizeForFirestore(stripRawTokenForCloud(record));
    try {
      await setDoc(doc(db, 'users', uid, 'mcp_tokens', tokenHash), cloudPayload);
    } catch (err) {
      console.warn('createMcpToken users subcollection sync warning:', err);
    }
    try {
      await setDoc(doc(db, 'mcp_tokens', tokenHash), cloudPayload);
    } catch {
      // Ignore permission error if top-level mcp_tokens rules haven't been deployed yet
    }
  }

  return { rawToken, record };
}

/**
 * Lists all MCP tokens belonging to the current user (sorted newest first),
 * preserving locally cached `rawToken` so the user can always re-copy their token.
 */
export async function listUserMcpTokens(uid?: string): Promise<McpTokenRecord[]> {
  const targetUid = uid || auth?.currentUser?.uid || 'guest_local';
  const localTokens = readLocalTokensCache(targetUid);
  const localRawMap = new Map<string, string>();
  for (const lt of localTokens) {
    if (lt.rawToken) {
      localRawMap.set(lt.tokenHash, lt.rawToken);
    }
  }

  if (!db || !auth?.currentUser || targetUid === 'guest_local') {
    return localTokens.sort((a, b) => b.createdAt - a.createdAt);
  }

  try {
    const subSnap = await getDocs(collection(db, 'users', targetUid, 'mcp_tokens'));
    const byHash = new Map<string, McpTokenRecord>();

    for (const lt of localTokens) {
      byHash.set(lt.tokenHash, lt);
    }

    subSnap.forEach((d) => {
      const data = d.data() as McpTokenRecord;
      if (data && data.tokenHash) {
        const existingRaw = localRawMap.get(data.tokenHash) || data.rawToken;
        byHash.set(data.tokenHash, existingRaw ? { ...data, rawToken: existingRaw } : data);
      }
    });

    const merged = Array.from(byHash.values()).sort((a, b) => b.createdAt - a.createdAt);
    writeLocalTokensCache(targetUid, merged);
    return merged;
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
  const now = Date.now();
  let revokedTarget: McpTokenRecord | null = null;

  const updatedLocal = readLocalTokensCache(uid).map((t) => {
    if (t.tokenHash === tokenHash) {
      revokedTarget = { ...t, revoked: true, updatedAt: now };
      return revokedTarget;
    }
    return t;
  });
  writeLocalTokensCache(uid, updatedLocal);

  if (revokedTarget) {
    await pushVaultToEdgeR2(revokedTarget);
  }

  if (db && auth?.currentUser) {
    try {
      await updateDoc(doc(db, 'users', uid, 'mcp_tokens', tokenHash), {
        revoked: true,
        updatedAt: now,
      });
    } catch (err) {
      console.warn('revokeMcpToken user subcollection warning:', err);
    }
    try {
      await updateDoc(doc(db, 'mcp_tokens', tokenHash), {
        revoked: true,
        updatedAt: now,
      });
    } catch {
      // Ignore if top-level not deployed
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

  await deleteVaultFromEdgeR2(tokenHash);

  if (db && auth?.currentUser) {
    try {
      await deleteDoc(doc(db, 'users', uid, 'mcp_tokens', tokenHash));
    } catch (err) {
      console.warn('deleteMcpToken user subcollection warning:', err);
    }
    try {
      await deleteDoc(doc(db, 'mcp_tokens', tokenHash));
    } catch {
      // Ignore if top-level not deployed
    }
  }
}

/**
 * Bidirectional sync between the user's active MCP token vaults and their main collection/decks:
 * 1. Pulls any AI-added cards or AI-created/edited decks from active `read_write` tokens in Edge R2 into the app.
 * 2. Pushes the reconciled collection and decks back to Edge R2 and Firestore so AI always sees fresh data.
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
      const edgeVault = await fetchVaultFromEdgeR2(token.tokenHash);
      const sourceVault = edgeVault || token;

      if (sourceVault.scope === 'read_write') {
        const cardRec = reconcileCards(mergedCards, pruneCards(sourceVault.cards || {}));
        if (JSON.stringify(cardRec.merged) !== JSON.stringify(mergedCards)) {
          mergedCards = cardRec.merged;
          localCollectionChanged = true;
        }

        const deckRec = reconcileDecks(mergedDecks, sourceVault.decks || [], new Set());
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

    // Push latest reconciled snapshot to all active tokens (Edge R2 + user subcollection)
    const now = Date.now();
    for (const token of activeTokens) {
      const updatedRecord: McpTokenRecord = {
        ...token,
        cards: mergedCards,
        decks: mergedDecks,
        updatedAt: now,
      };
      await pushVaultToEdgeR2(updatedRecord);

      const cloudPayload = sanitizeForFirestore(stripRawTokenForCloud(updatedRecord));
      try {
        await setDoc(doc(db, 'users', targetUid, 'mcp_tokens', token.tokenHash), cloudPayload);
      } catch {
        // Ignore subcollection error
      }
    }
  } catch (err) {
    console.warn('reconcileUserMcpTokens skipped:', err);
  }
}
