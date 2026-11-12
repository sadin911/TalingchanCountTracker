import {
  MCP_TOOLS_LIST,
  executeMcpToolCall,
  sha256Hex,
} from './utils/mcpCatalogEngine.ts';
import type { JsonRpcRequest, JsonRpcResponse, McpTokenRecord } from './types/mcp.ts';

interface R2ObjectBody {
  text: () => Promise<string>;
}

interface R2BucketBinding {
  get: (key: string) => Promise<R2ObjectBody | null>;
  put: (
    key: string,
    value: string,
    options?: { httpMetadata?: { contentType?: string } }
  ) => Promise<unknown>;
  delete: (key: string) => Promise<unknown>;
}

interface WorkerEnv {
  ASSETS?: {
    fetch: (req: Request) => Promise<Response>;
  };
  MCP_BUCKET?: R2BucketBinding;
}

const FIRESTORE_PROJECT_ID = 'botcounttracker';
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/(default)/documents`;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-MCP-Token, Mcp-Session-Id',
};

function r2VaultKey(tokenHash: string): string {
  return `_mcp_vaults/${tokenHash}.json`;
}

/**
 * Converts a Firestore REST API Value object into a plain JavaScript value.
 */
function fromFirestoreValue(val: Record<string, unknown> | undefined): unknown {
  if (!val || typeof val !== 'object') return null;
  if ('nullValue' in val) return null;
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('stringValue' in val) return String(val.stringValue);
  if ('arrayValue' in val) {
    const arr = (val.arrayValue as { values?: Array<Record<string, unknown>> })?.values || [];
    return arr.map((item) => fromFirestoreValue(item));
  }
  if ('mapValue' in val) {
    const fields =
      (val.mapValue as { fields?: Record<string, Record<string, unknown>> })?.fields || {};
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = fromFirestoreValue(v);
    }
    return out;
  }
  return null;
}

/**
 * Converts a plain JavaScript value into a Firestore REST API Value object.
 */
function toFirestoreValue(val: unknown): Record<string, unknown> {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map((item) => toFirestoreValue(item)),
      },
    };
  }
  if (typeof val === 'object') {
    const fields: Record<string, Record<string, unknown>> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function extractRawBearerToken(request: Request): string {
  const authHeader = request.headers.get('Authorization') || '';
  const customHeader = request.headers.get('X-MCP-Token') || '';
  const urlToken = new URL(request.url).searchParams.get('token') || '';

  if (authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  if (customHeader) {
    return customHeader.trim();
  }
  if (urlToken) {
    return urlToken.trim();
  }
  return '';
}

/**
 * Fetches and validates an `McpTokenRecord` from R2 (`_mcp_vaults/{tokenHash}.json`)
 * or fallback Firestore REST API by raw Bearer token.
 */
async function resolveMcpVaultFromRequest(
  request: Request,
  env: WorkerEnv
): Promise<McpTokenRecord | null> {
  const rawToken = extractRawBearerToken(request);

  if (!rawToken || !rawToken.startsWith('tct_mcp_')) {
    return null;
  }

  const tokenHash = await sha256Hex(rawToken);
  let parsed: McpTokenRecord | null = null;

  // 1. Primary lookup from Cloudflare R2 edge storage
  if (env.MCP_BUCKET) {
    const r2Obj = await env.MCP_BUCKET.get(r2VaultKey(tokenHash));
    if (r2Obj) {
      try {
        parsed = JSON.parse(await r2Obj.text()) as McpTokenRecord;
      } catch {
        parsed = null;
      }
    }
  }

  // 2. Fallback lookup from Firestore REST API
  if (!parsed) {
    const docUrl = `${FIRESTORE_BASE_URL}/mcp_tokens/${tokenHash}`;
    const resp = await fetch(docUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (resp.ok) {
      const json = (await resp.json()) as { fields?: Record<string, Record<string, unknown>> };
      parsed = fromFirestoreValue({ mapValue: { fields: json.fields || {} } }) as McpTokenRecord;
    }
  }

  if (!parsed || !parsed.tokenHash) {
    throw new Error('Invalid MCP Token: ไม่พบ Token นี้ในระบบ หรือ Token ไม่ถูกต้อง');
  }

  if (parsed.revoked) {
    throw new Error('Revoked MCP Token: Token นี้ถูกยกเลิกสิทธิ์การใช้งานแล้ว');
  }

  if (parsed.expiresAt && Number(parsed.expiresAt) < Date.now()) {
    throw new Error('Expired MCP Token: Token นี้หมดอายุการใช้งานแล้ว กรุณาสร้าง Token ใหม่บนหน้าเว็บ');
  }

  return parsed;
}

/**
 * Persists mutated `cards` or `decks` back to R2 and (if available) Firestore REST API.
 */
async function persistMcpVaultRecord(env: WorkerEnv, nextRecord: McpTokenRecord): Promise<void> {
  const { rawToken: _unusedRaw, ...safeRecord } = nextRecord;

  if (env.MCP_BUCKET) {
    await env.MCP_BUCKET.put(r2VaultKey(safeRecord.tokenHash), JSON.stringify(safeRecord), {
      httpMetadata: { contentType: 'application/json' },
    });
    return;
  }

  const fields: Record<string, Record<string, unknown>> = {};
  for (const [k, v] of Object.entries(safeRecord)) {
    fields[k] = toFirestoreValue(v);
  }

  const docUrl = `${FIRESTORE_BASE_URL}/mcp_tokens/${safeRecord.tokenHash}`;
  const resp = await fetch(docUrl, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`ไม่สามารถบันทึกข้อมูลลง Cloud Vault ได้ (${resp.status}): ${errText}`);
  }
}

export async function handleMcpJsonRpc(
  rpc: JsonRpcRequest,
  request: Request,
  env: WorkerEnv
): Promise<JsonRpcResponse | null> {
  const id = rpc.id ?? null;

  try {
    if (rpc.method === 'notifications/initialized' || rpc.method.startsWith('notifications/')) {
      return null;
    }

    if (rpc.method === 'initialize') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: 'talingchan-count-tracker-mcp',
            version: '1.8.1',
          },
          instructions:
            'MCP Server สำหรับสมุดสะสมการ์ดและจัดเด็ค Battle of Talingchan (แบทเทิล ออฟ ตลิ่งชัน) ครบทั้ง 2,014 ใบ 39 ชุด รองรับการค้นหาการ์ด กฎการเล่น ที่มามีม และจัดการเด็ค/คลังการ์ดอย่างปลอดภัย',
        },
      };
    }

    if (rpc.method === 'ping') {
      return {
        jsonrpc: '2.0',
        id,
        result: {},
      };
    }

    if (rpc.method === 'tools/list') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          tools: MCP_TOOLS_LIST,
        },
      };
    }

    if (rpc.method === 'tools/call') {
      const params = (rpc.params || {}) as {
        name?: string;
        arguments?: Record<string, unknown>;
      };
      const toolName = params.name || '';
      const toolArgs = params.arguments || {};

      const needsAuth = [
        'get_my_collection',
        'get_my_decks',
        'save_ai_deck',
        'add_cards_to_collection',
      ].includes(toolName);

      const vault = needsAuth ? await resolveMcpVaultFromRequest(request, env) : null;
      const { output, mutatedVault } = await executeMcpToolCall(toolName, toolArgs, vault);

      if (vault && mutatedVault) {
        await persistMcpVaultRecord(env, {
          ...vault,
          cards: mutatedVault.cards ?? vault.cards,
          decks: mutatedVault.decks ?? vault.decks,
          updatedAt: Date.now(),
        });
      }

      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(output, null, 2),
            },
          ],
          isError: false,
        },
      };
    }

    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32601,
        message: `Method not found: ${rpc.method}`,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      jsonrpc: '2.0',
      id,
      result: {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: message }, null, 2),
          },
        ],
        isError: true,
      },
    };
  }
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);

    // Vault Sync Endpoint for Web UI (/mcp/vault)
    if (url.pathname === '/mcp/vault' || url.pathname === '/mcp/vault/') {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
      }

      if (request.method === 'GET') {
        const tokenHashParam = url.searchParams.get('tokenHash') || '';
        const rawBearer = extractRawBearerToken(request);
        const tokenHash =
          tokenHashParam || (rawBearer.startsWith('tct_mcp_') ? await sha256Hex(rawBearer) : '');

        if (!tokenHash || !/^[a-f0-9]{64}$/.test(tokenHash)) {
          return new Response(JSON.stringify({ error: 'Invalid tokenHash' }), {
            status: 400,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
          });
        }

        if (env.MCP_BUCKET) {
          const obj = await env.MCP_BUCKET.get(r2VaultKey(tokenHash));
          if (!obj) {
            return new Response(JSON.stringify({ error: 'Vault not found' }), {
              status: 404,
              headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
            });
          }
          return new Response(await obj.text(), {
            status: 200,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
          });
        }

        return new Response(JSON.stringify({ error: 'R2 bucket unavailable' }), {
          status: 503,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
        });
      }

      if (request.method === 'POST') {
        try {
          const body = (await request.json()) as {
            rawToken?: string;
            record?: McpTokenRecord;
          };
          const record = body.record;
          if (!record || !record.tokenHash || !/^[a-f0-9]{64}$/.test(record.tokenHash)) {
            return new Response(JSON.stringify({ error: 'Invalid record.tokenHash' }), {
              status: 400,
              headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
            });
          }

          if (body.rawToken) {
            const computed = await sha256Hex(body.rawToken);
            if (computed !== record.tokenHash) {
              return new Response(JSON.stringify({ error: 'tokenHash mismatch' }), {
                status: 403,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
              });
            }
          }

          await persistMcpVaultRecord(env, record);
          return new Response(JSON.stringify({ ok: true, tokenHash: record.tokenHash }), {
            status: 200,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Vault sync failed';
          return new Response(JSON.stringify({ error: msg }), {
            status: 400,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
          });
        }
      }

      if (request.method === 'DELETE') {
        const tokenHash = url.searchParams.get('tokenHash') || '';
        if (!tokenHash || !/^[a-f0-9]{64}$/.test(tokenHash)) {
          return new Response(JSON.stringify({ error: 'Invalid tokenHash' }), {
            status: 400,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
          });
        }
        if (env.MCP_BUCKET) {
          await env.MCP_BUCKET.delete(r2VaultKey(tokenHash));
        }
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
        });
      }
    }

    if (url.pathname === '/mcp' || url.pathname === '/mcp/') {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
      }

      if (request.method === 'GET') {
        return new Response(
          JSON.stringify(
            {
              name: 'talingchan-count-tracker-mcp',
              version: '1.8.1',
              transport: 'Streamable HTTP (JSON-RPC 2.0 POST /mcp)',
              endpoint: `${url.origin}/mcp`,
              toolsCount: MCP_TOOLS_LIST.length,
              tools: MCP_TOOLS_LIST.map((t) => ({ name: t.name, description: t.description })),
              security: {
                publicTools: ['search_cards', 'get_card_details', 'list_sets', 'validate_deck_list'],
                scopedUserTools: [
                  'get_my_collection (read)',
                  'get_my_decks (read)',
                  'save_ai_deck (read_write, non-destructive)',
                  'add_cards_to_collection (read_write, additive-only)',
                ],
              },
            },
            null,
            2
          ),
          {
            status: 200,
            headers: {
              ...CORS_HEADERS,
              'Content-Type': 'application/json; charset=utf-8',
            },
          }
        );
      }

      if (request.method === 'POST') {
        try {
          const body = await request.json();
          if (Array.isArray(body)) {
            const responses: JsonRpcResponse[] = [];
            for (const item of body) {
              const res = await handleMcpJsonRpc(item as JsonRpcRequest, request, env);
              if (res) responses.push(res);
            }
            return new Response(JSON.stringify(responses), {
              status: 200,
              headers: {
                ...CORS_HEADERS,
                'Content-Type': 'application/json; charset=utf-8',
              },
            });
          }

          const singleRes = await handleMcpJsonRpc(body as JsonRpcRequest, request, env);
          if (!singleRes) {
            return new Response(null, { status: 202, headers: CORS_HEADERS });
          }

          return new Response(JSON.stringify(singleRes), {
            status: 200,
            headers: {
              ...CORS_HEADERS,
              'Content-Type': 'application/json; charset=utf-8',
            },
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Invalid JSON-RPC payload';
          return new Response(
            JSON.stringify({
              jsonrpc: '2.0',
              id: null,
              error: { code: -32700, message: msg },
            }),
            {
              status: 400,
              headers: {
                ...CORS_HEADERS,
                'Content-Type': 'application/json; charset=utf-8',
              },
            }
          );
        }
      }
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not Found', { status: 404 });
  },
};
