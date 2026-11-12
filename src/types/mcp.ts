import type { Deck } from './deck.ts';
import type { CardFinishesCount } from './collection.ts';

export type McpTokenScope = 'read' | 'read_write';

export interface McpTokenRecord {
  tokenHash: string;
  tokenPrefix: string;
  rawToken?: string;
  uid: string;
  label: string;
  scope: McpTokenScope;
  createdAt: number;
  expiresAt: number | null;
  revoked: boolean;
  cards: Record<string, CardFinishesCount>;
  decks: Deck[];
  updatedAt: number;
}

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}
