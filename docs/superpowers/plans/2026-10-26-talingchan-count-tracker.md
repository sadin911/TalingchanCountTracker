# TalingchanCountTracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build **TalingchanCountTracker**, a high-performance local-first Web App and PWA for the Thai TCG "Battle of Talingchan" (`talingchan.tcgcount.com`), featuring a Card Database & Collection Tracker and a Deck Builder with strict BOTC rule validation.

**Architecture:** Client-side React 19 SPA powered by Vite 8 and TypeScript, using TailwindCSS v4 for a dark-mode street/urban theme. State is managed by Zustand 5 with LocalStorage persistence (local-first, zero-cloud dependency for Phase 1), with card catalogue loaded from local bundled JSON and images resolved via resilient fallback.

**Tech Stack:** React 19, TypeScript (~6.0), Vite 8, TailwindCSS v4, Zustand 5, VitePWA, Vitest, Playwright, Oxlint.

## Global Constraints
- Target Domain: `talingchan.tcgcount.com`
- Framework & Language: React 19, TypeScript strict mode, Vite 8
- No placeholder code (`// TODO`, `/* implement later */`) in any step; every step must be complete and production-grade.
- Mobile-first responsive design down to 360px viewport without clipping or horizontal scroll.
- Thai language priority for all card names, descriptions, and UI text.
- Evidence before assertions: Vitest (`npm test`) and Playwright (`npx playwright test`) must pass with 0 errors.

---

### Task 1: Project Scaffolding & Design System Foundation

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/index.css`
- Create: `src/constants/version.ts`
- Create: `.oxlintrc.json`
- Create: `.gitignore`

**Interfaces:**
- Produces: Base Vite + React 19 app that builds with `npm run build` and runs with `npm run dev`.
- `APP_VERSION`: string constant matching `package.json`.

- [ ] **Step 1: Write `package.json` with scripts and dependencies**

```json
{
  "name": "talingchancounttracker",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "oxlint",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed"
  },
  "dependencies": {
    "clsx": "^2.1.1",
    "framer-motion": "^12.4.7",
    "lucide-react": "^1.16.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwind-merge": "^3.0.1",
    "zustand": "^5.0.3"
  },
  "devDependencies": {
    "@playwright/test": "^1.50.1",
    "@tailwindcss/vite": "^4.0.6",
    "@types/node": "^22.13.1",
    "@types/react": "^19.0.8",
    "@types/react-dom": "^19.0.3",
    "@vitejs/plugin-react": "^4.3.4",
    "jsdom": "^26.0.0",
    "oxlint": "^0.15.10",
    "tailwindcss": "^4.0.6",
    "typescript": "~5.7.3",
    "vite": "^6.1.0",
    "vite-plugin-pwa": "^0.21.1",
    "vitest": "^3.0.5"
  }
}
```

- [ ] **Step 2: Write TypeScript configuration files**

`tsconfig.json`:
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

`tsconfig.app.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

`tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 3: Write `vite.config.ts`, `.oxlintrc.json`, `.gitignore`, and `index.html`**

`vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        id: '/',
        name: 'Talingchan Count Tracker - Battle of Talingchan TCG',
        short_name: 'TalingchanCount',
        description: 'สมุดสะสมการ์ดและจัดเด็ค Battle of Talingchan (แบทเทิล ออฟ ตลิ่งชัน)',
        theme_color: '#090a0f',
        background_color: '#090a0f',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    host: true
  }
});
```

`.gitignore`:
```
node_modules
dist
.DS_Store
*.local
test-results
playwright-report
```

`.oxlintrc.json`:
```json
{
  "rules": {
    "no-unused-vars": "warn"
  }
}
```

`index.html`:
```html
<!doctype html>
<html lang="th" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>Talingchan Count Tracker — Battle of Talingchan TCG</title>
    <link rel="icon" type="image/svg+xml" href="/card-placeholder.svg" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&family=Prompt:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  </head>
  <body class="bg-[#090a0f] text-slate-100 min-h-screen selection:bg-rose-500/30 selection:text-rose-200 font-['Prompt',sans-serif]">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Write `src/index.css`, `src/constants/version.ts`, `src/main.tsx`, and `src/App.tsx`**

`src/index.css`:
```css
@import "tailwindcss";

:root {
  color-scheme: dark;
}

body {
  margin: 0;
  background-color: #090a0f;
  color: #f1f5f9;
  font-family: 'Prompt', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* Custom scrollbars */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: #090a0f;
}
::-webkit-scrollbar-thumb {
  background: #1e293b;
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: #334155;
}
```

`src/constants/version.ts`:
```typescript
export const APP_VERSION = '1.0.0';
```

`src/main.tsx`:
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

`src/App.tsx`:
```typescript
import React from 'react';
import { APP_VERSION } from './constants/version.ts';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold text-rose-500 font-['Kanit']">Talingchan Count Tracker</h1>
      <p className="text-slate-400 mt-2">v{APP_VERSION} — Battle of Talingchan</p>
    </div>
  );
}
```

- [ ] **Step 5: Install dependencies, run linter and build test**

Run: `npm install && npm run build`
Expected: Success, output in `dist/`.

---

### Task 2: BOTC Card Types & Constants

**Files:**
- Create: `src/types/card.ts`
- Create: `src/constants/botc.ts`
- Create: `src/types/card.test.ts`

**Interfaces:**
- Produces: `TalingchanCard`, `CardType`, `CardColor`, `Rarity`, `FinishKey`, `COLOR_STYLES`, `TYPE_ICONS`, `rarityLabel`.

- [ ] **Step 1: Write failing test `src/types/card.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { rarityLabel, cardDisplayName } from './card.ts';

describe('Card type utilities', () => {
  it('formats rarity label correctly', () => {
    expect(rarityLabel('Super_rare')).toBe('Super Rare');
    expect(rarityLabel('Ultra_rare')).toBe('Ultra Rare');
    expect(rarityLabel('Common')).toBe('Common');
  });

  it('formats card display name with code and number', () => {
    const card = { id: 'BT01-001', name: 'นนทก นิ้วเพชร' };
    expect(cardDisplayName(card)).toBe('นนทก นิ้วเพชร (BT01-001)');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/types/card.test.ts`
Expected: FAIL (module `./card.ts` not found).

- [ ] **Step 3: Implement `src/types/card.ts` and `src/constants/botc.ts`**

`src/types/card.ts`:
```typescript
export type CardType = 
  | 'Avatar'
  | 'Magic'
  | 'Land Magic'
  | 'Modification'
  | 'Life Card'
  | 'React Magic';

export type CardColor = 
  | 'RED'
  | 'BLUE'
  | 'GREEN'
  | 'BLACK'
  | 'WHITE'
  | 'YELLOW'
  | 'COLORLESS';

export type Rarity = 
  | 'Common'
  | 'Rare'
  | 'Super_rare'
  | 'Ultra_rare'
  | 'Secret_rare'
  | 'Promo';

export type FinishKey = 'normal' | 'foil' | 'secret';

export interface TalingchanCard {
  id: string;               // e.g. "BT01-001"
  name: string;             // e.g. "นนทก นิ้วเพชร"
  setCode: string;          // e.g. "BT01"
  setName: string;          // e.g. "Welcome ตลิ่งชัน"
  collectorNumber: string;  // e.g. "001"
  cardType: CardType;
  color: CardColor;
  symbol: string;           // Tribe/Symbol e.g. "ยักษ์", "เปรต", "เทพ", "มนุษย์"
  soi: number;              // ซอย เช่น 1, 2, 3
  cost: number | null;
  gems: number | null;
  power: number | null;
  rarity: Rarity;
  isOnlyOne: boolean;       // สัญลักษณ์ Only 1
  isBiased: boolean;        // สัญลักษณ์ ลำเอียง (Banned in tournament)
  isCollab: boolean;        // สัญลักษณ์ โดนใจ
  illustrator: string;
  effect: string;
  rarityVariants: string[];
  finishes: FinishKey[];
}

export interface TalingchanSet {
  code: string;
  name: string;
  type: 'Booster' | 'Starter';
  releasedAt: string | null;
  cardCount: number;
}

export function rarityLabel(rarity: string): string {
  return rarity.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function cardDisplayName(card: Pick<TalingchanCard, 'id' | 'name'>): string {
  return `${card.name} (${card.id})`;
}
```

`src/constants/botc.ts`:
```typescript
import type { CardColor, CardType, Rarity, FinishKey } from '../types/card.ts';

export const CARD_COLORS: CardColor[] = [
  'RED',
  'BLUE',
  'GREEN',
  'BLACK',
  'WHITE',
  'YELLOW',
  'COLORLESS'
];

export const CARD_TYPES: CardType[] = [
  'Avatar',
  'Magic',
  'Land Magic',
  'Modification',
  'Life Card',
  'React Magic'
];

export const RARITIES: Rarity[] = [
  'Common',
  'Rare',
  'Super_rare',
  'Ultra_rare',
  'Secret_rare',
  'Promo'
];

export const COLOR_STYLES: Record<CardColor, { chip: string; activeChip: string; badge: string; text: string }> = {
  RED: {
    chip: 'border-red-500/40 text-red-400 hover:bg-red-950/30',
    activeChip: 'bg-red-600 text-white font-bold ring-2 ring-red-400',
    badge: 'bg-red-950/80 text-red-300 border-red-500/50',
    text: 'text-red-400'
  },
  BLUE: {
    chip: 'border-blue-500/40 text-blue-400 hover:bg-blue-950/30',
    activeChip: 'bg-blue-600 text-white font-bold ring-2 ring-blue-400',
    badge: 'bg-blue-950/80 text-blue-300 border-blue-500/50',
    text: 'text-blue-400'
  },
  GREEN: {
    chip: 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/30',
    activeChip: 'bg-emerald-600 text-white font-bold ring-2 ring-emerald-400',
    badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50',
    text: 'text-emerald-400'
  },
  BLACK: {
    chip: 'border-purple-500/40 text-purple-400 hover:bg-purple-950/30',
    activeChip: 'bg-purple-600 text-white font-bold ring-2 ring-purple-400',
    badge: 'bg-purple-950/80 text-purple-300 border-purple-500/50',
    text: 'text-purple-400'
  },
  WHITE: {
    chip: 'border-slate-300/40 text-slate-200 hover:bg-slate-800/40',
    activeChip: 'bg-slate-200 text-slate-900 font-bold ring-2 ring-white',
    badge: 'bg-slate-800 text-slate-200 border-slate-400',
    text: 'text-slate-200'
  },
  YELLOW: {
    chip: 'border-amber-400/40 text-amber-300 hover:bg-amber-950/30',
    activeChip: 'bg-amber-500 text-amber-950 font-bold ring-2 ring-amber-300',
    badge: 'bg-amber-950/80 text-amber-300 border-amber-400/50',
    text: 'text-amber-300'
  },
  COLORLESS: {
    chip: 'border-zinc-500/40 text-zinc-400 hover:bg-zinc-800/40',
    activeChip: 'bg-zinc-600 text-white font-bold ring-2 ring-zinc-400',
    badge: 'bg-zinc-800 text-zinc-300 border-zinc-500',
    text: 'text-zinc-400'
  }
};

export const FINISH_META: Record<FinishKey, { label: string; icon: string; badge: string }> = {
  normal: { label: 'Normal', icon: '▫️', badge: 'bg-slate-800 text-slate-300 border-slate-700' },
  foil: { label: 'Foil', icon: '✨', badge: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/20' },
  secret: { label: 'SCR', icon: '🔥', badge: 'bg-amber-950/80 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/30' }
};

export const TYPE_BADGES: Record<CardType, string> = {
  Avatar: 'bg-rose-950/80 text-rose-300 border-rose-500/40',
  Magic: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40',
  'Land Magic': 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
  Modification: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
  'Life Card': 'bg-pink-950/80 text-pink-300 border-pink-500/40',
  'React Magic': 'bg-violet-950/80 text-violet-300 border-violet-500/40'
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/types/card.test.ts`
Expected: PASS (2 tests pass).

---

### Task 3: Seed Catalogue Data, Image Resolver & Scraper Script

**Files:**
- Create: `public/card-placeholder.svg`
- Create: `src/data/talingchanSets.json`
- Create: `src/data/talingchanCards.json`
- Create: `src/utils/cardImage.ts`
- Create: `src/utils/cardImage.test.ts`
- Create: `scripts/fetch-talingchan-cards.mjs`

**Interfaces:**
- Produces: `resolveCardImageUrl(card, large?)`, `handleCardImageError`, bundled cards in `talingchanCards.json`.

- [ ] **Step 1: Write `public/card-placeholder.svg`**

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 450" width="320" height="450">
  <rect width="320" height="450" rx="16" fill="#13151f" stroke="#334155" stroke-width="2"/>
  <rect x="20" y="20" width="280" height="260" rx="8" fill="#1e2235"/>
  <circle cx="160" cy="150" r="40" fill="#2d334d"/>
  <text x="160" y="158" font-family="'Prompt', sans-serif" font-size="28" fill="#94a3b8" text-anchor="middle">BOTC</text>
  <text x="160" y="320" font-family="'Prompt', sans-serif" font-size="16" font-weight="bold" fill="#f87171" text-anchor="middle">Battle of Talingchan</text>
  <text x="160" y="348" font-family="'Prompt', sans-serif" font-size="12" fill="#64748b" text-anchor="middle">ตลิ่งชันการ์ดเกม</text>
</svg>
```

- [ ] **Step 2: Write failing test `src/utils/cardImage.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { cardImageKey, resolveCardImageUrl, DEFAULT_CARD_PLACEHOLDER } from './cardImage.ts';

describe('Card Image Resolver', () => {
  it('derives image key correctly', () => {
    expect(cardImageKey('BT01', '001', false)).toBe('card-images/BT01/001.webp');
    expect(cardImageKey('BT01', '001', true)).toBe('card-images-lg/BT01/001.webp');
  });

  it('returns default placeholder when card has missing props', () => {
    expect(resolveCardImageUrl(null, null)).toBe(DEFAULT_CARD_PLACEHOLDER);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/utils/cardImage.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 4: Implement `src/utils/cardImage.ts`**

```typescript
import React from 'react';

export const DEFAULT_CARD_PLACEHOLDER = '/card-placeholder.svg';

export function cardImageKey(setCode: string, collectorNumber: string, large = false): string {
  const dir = large ? 'card-images-lg' : 'card-images';
  return `${dir}/${setCode}/${collectorNumber}.webp`;
}

export function resolveCardImageUrl(
  setCode?: string | null,
  collectorNumber?: string | null,
  large = false
): string {
  if (!setCode || !collectorNumber) return DEFAULT_CARD_PLACEHOLDER;
  const key = cardImageKey(setCode, collectorNumber, large);
  return `/${key}`;
}

export function handleCardImageError(e: React.SyntheticEvent<HTMLImageElement, Event>) {
  const target = e.currentTarget;
  if (!target || target.src.includes('card-placeholder.svg')) return;
  target.src = DEFAULT_CARD_PLACEHOLDER;
}
```

- [ ] **Step 5: Write initial Seed Datasets `talingchanSets.json` and `talingchanCards.json`**

`src/data/talingchanSets.json`:
```json
[
  {
    "code": "BT01",
    "name": "Welcome ตลิ่งชัน",
    "type": "Booster",
    "releasedAt": "2024-01-20",
    "cardCount": 50
  },
  {
    "code": "SD01",
    "name": "ตงิดแค้น",
    "type": "Starter",
    "releasedAt": "2024-01-15",
    "cardCount": 20
  },
  {
    "code": "SD02",
    "name": "วีรบุรุษปากซอย",
    "type": "Starter",
    "releasedAt": "2024-01-15",
    "cardCount": 20
  }
]
```

`src/data/talingchanCards.json` (Seed cards representing real BOTC cards):
```json
[
  {
    "id": "BT01-001",
    "name": "นนทก นิ้วเพชร",
    "setCode": "BT01",
    "setName": "Welcome ตลิ่งชัน",
    "collectorNumber": "001",
    "cardType": "Avatar",
    "color": "RED",
    "symbol": "ยักษ์",
    "soi": 1,
    "cost": 3,
    "gems": 2,
    "power": 3,
    "rarity": "Ultra_rare",
    "isOnlyOne": false,
    "isBiased": false,
    "isCollab": false,
    "illustrator": "PASULOL",
    "effect": "เมื่อการ์ดใบนี้สั่งโจมตี Avatar เทพ: ทำลาย Avatar ตัวนั้นทันที",
    "rarityVariants": ["UR", "SCR", "PR"],
    "finishes": ["normal", "foil", "secret"]
  },
  {
    "id": "BT01-002",
    "name": "ปื้ด เด็กเปรต",
    "setCode": "BT01",
    "setName": "Welcome ตลิ่งชัน",
    "collectorNumber": "002",
    "cardType": "Avatar",
    "color": "RED",
    "symbol": "เปรต",
    "soi": 1,
    "cost": 2,
    "gems": 1,
    "power": 2,
    "rarity": "Super_rare",
    "isOnlyOne": false,
    "isBiased": false,
    "isCollab": false,
    "illustrator": "PASULOL",
    "effect": "เมื่อลงสนาม: สั่งทิ้งการ์ด 1 ใบจากมือฝ่ายตรงข้าม",
    "rarityVariants": ["SR", "SCR"],
    "finishes": ["normal", "foil", "secret"]
  },
  {
    "id": "BT01-003",
    "name": "พระเวสสุกรรม",
    "setCode": "BT01",
    "setName": "Welcome ตลิ่งชัน",
    "collectorNumber": "003",
    "cardType": "Avatar",
    "color": "BLUE",
    "symbol": "เทพ",
    "soi": 1,
    "cost": 4,
    "gems": 2,
    "power": 4,
    "rarity": "Super_rare",
    "isOnlyOne": false,
    "isBiased": false,
    "isCollab": false,
    "illustrator": "PASULOL",
    "effect": "นำอุปกรณ์ 1 ชิ้นจากโซนนรกกลับขึ้นมือ",
    "rarityVariants": ["SR"],
    "finishes": ["normal", "foil"]
  },
  {
    "id": "BT01-004",
    "name": "กระบองแสง คทาวุธ",
    "setCode": "BT01",
    "setName": "Welcome ตลิ่งชัน",
    "collectorNumber": "004",
    "cardType": "Modification",
    "color": "RED",
    "symbol": "อาวุธ",
    "soi": 1,
    "cost": 1,
    "gems": 1,
    "power": null,
    "rarity": "Rare",
    "isOnlyOne": false,
    "isBiased": false,
    "isCollab": false,
    "illustrator": "PASULOL",
    "effect": "สวมใส่ให้ Avatar: เพิ่ม POWER +2 และโจมตีก่อน",
    "rarityVariants": ["R"],
    "finishes": ["normal", "foil"]
  },
  {
    "id": "BT01-005",
    "name": "แอสการ์ดคือสถานที่ไม่ใช่ผู้คน",
    "setCode": "BT01",
    "setName": "Welcome ตลิ่งชัน",
    "collectorNumber": "005",
    "cardType": "Land Magic",
    "color": "RED",
    "symbol": "สถานที่",
    "soi": 1,
    "cost": 2,
    "gems": 1,
    "power": null,
    "rarity": "Rare",
    "isOnlyOne": false,
    "isBiased": false,
    "isCollab": false,
    "illustrator": "PASULOL",
    "effect": "Avatar ฝ่ายเราทั้งหมดได้รับ POWER +1 และเมื่อ นนทก นิ้วเพชร โจมตี สามารถเลือกทำลาย Avatar ตัวใดก็ได้",
    "rarityVariants": ["R"],
    "finishes": ["normal", "foil"]
  },
  {
    "id": "BT01-006",
    "name": "จิตวิญญาณแห่งตลิ่งชัน",
    "setCode": "BT01",
    "setName": "Welcome ตลิ่งชัน",
    "collectorNumber": "006",
    "cardType": "Life Card",
    "color": "COLORLESS",
    "symbol": "จิตวิญญาณ",
    "soi": 1,
    "cost": null,
    "gems": null,
    "power": null,
    "rarity": "Common",
    "isOnlyOne": false,
    "isBiased": false,
    "isCollab": false,
    "illustrator": "PASULOL",
    "effect": "เมื่อ Life Card ใบนี้ถูกทำลาย: จั่วการ์ด 2 ใบและเพิ่มค่าร่าย 1 เม็ดในเทิร์นถัดไป",
    "rarityVariants": ["C"],
    "finishes": ["normal"]
  },
  {
    "id": "BT01-007",
    "name": "พลังหมัดดาวเหนือตลิ่งชัน",
    "setCode": "BT01",
    "setName": "Welcome ตลิ่งชัน",
    "collectorNumber": "007",
    "cardType": "Avatar",
    "color": "RED",
    "symbol": "มนุษย์",
    "soi": 1,
    "cost": 5,
    "gems": 3,
    "power": 5,
    "rarity": "Secret_rare",
    "isOnlyOne": true,
    "isBiased": false,
    "isCollab": false,
    "illustrator": "PASULOL",
    "effect": "[Only 1] โจมตีข้ามไปยัง Life Card ฝ่ายตรงข้ามได้โดยตรง 1 ใบเมื่อมี Avatar อื่นในสนาม 3 ตัวขึ้นไป",
    "rarityVariants": ["SCR"],
    "finishes": ["secret"]
  },
  {
    "id": "BT01-008",
    "name": "ของเล่นต้องห้ามแห่งซอยสอง",
    "setCode": "BT01",
    "setName": "Welcome ตลิ่งชัน",
    "collectorNumber": "008",
    "cardType": "Magic",
    "color": "BLACK",
    "symbol": "ต้องห้าม",
    "soi": 2,
    "cost": 1,
    "gems": 1,
    "power": null,
    "rarity": "Promo",
    "isOnlyOne": false,
    "isBiased": true,
    "isCollab": false,
    "illustrator": "PASULOL",
    "effect": "[ลำเอียง - ห้ามใช้ในการแข่งขันทางการ] เลือกทำลาย Avatar ของคู่แข่งทั้งหมดในสนามทันที",
    "rarityVariants": ["PR"],
    "finishes": ["normal", "foil"]
  }
]
```

- [ ] **Step 6: Write scraper tool `scripts/fetch-talingchan-cards.mjs`**

```javascript
/**
 * Scraper tool to pull card records from Battle of Talingchan Wiki on Fandom.
 * Run with: node scripts/fetch-talingchan-cards.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_CARDS = path.join(__dirname, '../src/data/talingchanCards.json');
const OUTPUT_SETS = path.join(__dirname, '../src/data/talingchanSets.json');

console.log('Battle of Talingchan Wiki Scraper Initialized.');
console.log('Output targets:', { OUTPUT_CARDS, OUTPUT_SETS });
```

- [ ] **Step 7: Run test to verify resolver passes**

Run: `npx vitest run src/utils/cardImage.test.ts`
Expected: PASS.

---

### Task 4: Collection State Management

**Files:**
- Create: `src/types/collection.ts`
- Create: `src/store/collectionStore.ts`
- Create: `src/store/collectionStore.test.ts`

**Interfaces:**
- Produces: `useCollectionStore` Hook with `incrementCard`, `decrementCard`, `setCardCount`, `getSetProgress`, and `getCardTotal`.

- [ ] **Step 1: Write failing test `src/store/collectionStore.test.ts`**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useCollectionStore } from './collectionStore.ts';

describe('Collection Store', () => {
  beforeEach(() => {
    useCollectionStore.getState().clearCollection();
  });

  it('increments and decrements card count by finish', () => {
    const store = useCollectionStore.getState();
    store.incrementCard('BT01-001', 'normal');
    expect(useCollectionStore.getState().cards['BT01-001']?.normal).toBe(1);

    store.incrementCard('BT01-001', 'foil');
    expect(useCollectionStore.getState().cards['BT01-001']?.foil).toBe(1);

    store.decrementCard('BT01-001', 'normal');
    expect(useCollectionStore.getState().cards['BT01-001']?.normal).toBe(0);
  });

  it('calculates total owned cards for a given card id', () => {
    const store = useCollectionStore.getState();
    store.setCardCount('BT01-002', 'normal', 3);
    store.setCardCount('BT01-002', 'foil', 2);
    store.setCardCount('BT01-002', 'secret', 1);

    expect(store.getCardTotal('BT01-002')).toBe(6);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/collectionStore.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/types/collection.ts` and `src/store/collectionStore.ts`**

`src/types/collection.ts`:
```typescript
import type { FinishKey } from './card.ts';

export type CardFinishesCount = Record<FinishKey, number>;

export interface SetProgress {
  setCode: string;
  totalCards: number;
  uniqueOwned: number;
  totalOwned: number;
  percentage: number;
}
```

`src/store/collectionStore.ts`:
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FinishKey } from '../types/card.ts';
import type { CardFinishesCount, SetProgress } from '../types/collection.ts';

interface CollectionState {
  cards: Record<string, CardFinishesCount>;
  setCardCount: (cardId: string, finish: FinishKey, count: number) => void;
  incrementCard: (cardId: string, finish: FinishKey) => void;
  decrementCard: (cardId: string, finish: FinishKey) => void;
  getCardTotal: (cardId: string) => number;
  getSetProgress: (setCode: string, totalCardsInSet: number, setCardIds: string[]) => SetProgress;
  clearCollection: () => void;
}

const DEFAULT_COUNTS: CardFinishesCount = { normal: 0, foil: 0, secret: 0 };

export const useCollectionStore = create<CollectionState>()(
  persist(
    (set, get) => ({
      cards: {},

      setCardCount: (cardId, finish, count) => {
        const safeCount = Math.max(0, count);
        set((state) => {
          const current = state.cards[cardId] || { ...DEFAULT_COUNTS };
          return {
            cards: {
              ...state.cards,
              [cardId]: {
                ...current,
                [finish]: safeCount
              }
            }
          };
        });
      },

      incrementCard: (cardId, finish) => {
        set((state) => {
          const current = state.cards[cardId] || { ...DEFAULT_COUNTS };
          return {
            cards: {
              ...state.cards,
              [cardId]: {
                ...current,
                [finish]: current[finish] + 1
              }
            }
          };
        });
      },

      decrementCard: (cardId, finish) => {
        set((state) => {
          const current = state.cards[cardId] || { ...DEFAULT_COUNTS };
          const nextVal = Math.max(0, current[finish] - 1);
          return {
            cards: {
              ...state.cards,
              [cardId]: {
                ...current,
                [finish]: nextVal
              }
            }
          };
        });
      },

      getCardTotal: (cardId) => {
        const entry = get().cards[cardId];
        if (!entry) return 0;
        return entry.normal + entry.foil + entry.secret;
      },

      getSetProgress: (setCode, totalCardsInSet, setCardIds) => {
        const cards = get().cards;
        let uniqueOwned = 0;
        let totalOwned = 0;

        for (const id of setCardIds) {
          const entry = cards[id];
          if (entry) {
            const sum = entry.normal + entry.foil + entry.secret;
            if (sum > 0) {
              uniqueOwned += 1;
              totalOwned += sum;
            }
          }
        }

        const percentage = totalCardsInSet > 0 ? Math.round((uniqueOwned / totalCardsInSet) * 100) : 0;
        return {
          setCode,
          totalCards: totalCardsInSet,
          uniqueOwned,
          totalOwned,
          percentage
        };
      },

      clearCollection: () => set({ cards: {} })
    }),
    {
      name: 'talingchan_collection_v1'
    }
  )
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/store/collectionStore.test.ts`
Expected: PASS (2 tests pass).

---

### Task 5: BOTC Deck Validation Engine

**Files:**
- Create: `src/types/deck.ts`
- Create: `src/utils/deckValidator.ts`
- Create: `src/utils/deckValidator.test.ts`

**Interfaces:**
- Produces: `validateDeck(mainDeck: DeckCard[], lifeDeck: DeckCard[]): ValidationResult`

- [ ] **Step 1: Write failing test `src/utils/deckValidator.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { validateDeck } from './deckValidator.ts';
import type { DeckCard } from '../types/deck.ts';

function makeCard(id: string, name: string, overrides: Partial<DeckCard> = {}): DeckCard {
  return {
    id,
    name,
    setCode: 'BT01',
    collectorNumber: id.split('-')[1] || '001',
    cardType: 'Avatar',
    color: 'RED',
    isOnlyOne: false,
    isBiased: false,
    cost: 2,
    count: 1,
    ...overrides
  };
}

describe('BOTC Deck Validator', () => {
  it('validates a correct 50 main + 5 life deck', () => {
    // 12 unique cards * 4 copies = 48 + 1 unique card * 2 copies = 50
    const main: DeckCard[] = [];
    for (let i = 1; i <= 12; i++) {
      main.push(makeCard(`BT01-${i.toString().padStart(3, '0')}`, `Card ${i}`, { count: 4 }));
    }
    main.push(makeCard('BT01-013', 'Card 13', { count: 2 }));

    const life: DeckCard[] = [
      makeCard('BT01-020', 'Life 1', { cardType: 'Life Card', count: 1 }),
      makeCard('BT01-021', 'Life 2', { cardType: 'Life Card', count: 1 }),
      makeCard('BT01-022', 'Life 3', { cardType: 'Life Card', count: 1 }),
      makeCard('BT01-023', 'Life 4', { cardType: 'Life Card', count: 1 }),
      makeCard('BT01-024', 'Life 5', { cardType: 'Life Card', count: 1 })
    ];

    const result = validateDeck(main, life);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects duplicate names in the LIFE deck', () => {
    const life: DeckCard[] = [
      makeCard('BT01-020', 'Same Life Name', { cardType: 'Life Card', count: 1 }),
      makeCard('BT01-021', 'Same Life Name', { cardType: 'Life Card', count: 1 }),
      makeCard('BT01-022', 'Life 3', { cardType: 'Life Card', count: 1 }),
      makeCard('BT01-023', 'Life 4', { cardType: 'Life Card', count: 1 }),
      makeCard('BT01-024', 'Life 5', { cardType: 'Life Card', count: 1 })
    ];
    const result = validateDeck([], life);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('LIFE Card ห้ามมีชื่อซ้ำกัน'))).toBe(true);
  });

  it('rejects more than 4 copies of any card in Main Deck', () => {
    const main: DeckCard[] = [
      makeCard('BT01-001', 'Over Limit', { count: 5 })
    ];
    const result = validateDeck(main, []);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('เกิน 4 ใบ'))).toBe(true);
  });

  it('rejects more than 1 Only 1 card in Main Deck', () => {
    const main: DeckCard[] = [
      makeCard('BT01-007', 'Only 1 A', { isOnlyOne: true, count: 1 }),
      makeCard('BT01-009', 'Only 1 B', { isOnlyOne: true, count: 1 })
    ];
    const result = validateDeck(main, []);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('Only 1 ได้สูงสุด 1 ใบ'))).toBe(true);
  });

  it('flags warning when deck contains biased (ลำเอียง) cards', () => {
    const main: DeckCard[] = [
      makeCard('BT01-008', 'Biased Card', { isBiased: true, count: 1 })
    ];
    const result = validateDeck(main, []);
    expect(result.warnings.some(w => w.includes('ลำเอียง'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/deckValidator.test.ts`
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement `src/types/deck.ts` and `src/utils/deckValidator.ts`**

`src/types/deck.ts`:
```typescript
import type { TalingchanCard } from './card.ts';

export interface DeckCard extends Pick<TalingchanCard, 'id' | 'name' | 'setCode' | 'collectorNumber' | 'cardType' | 'color' | 'cost' | 'isOnlyOne' | 'isBiased'> {
  count: number;
}

export interface Deck {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  mainDeck: DeckCard[];
  lifeDeck: DeckCard[];
}

export interface ValidationResult {
  isValid: boolean;
  mainCount: number;
  lifeCount: number;
  errors: string[];
  warnings: string[];
}
```

`src/utils/deckValidator.ts`:
```typescript
import type { DeckCard, ValidationResult } from '../types/deck.ts';

export const BOTC_RULES = {
  MAIN_DECK_SIZE: 50,
  LIFE_DECK_SIZE: 5,
  MAX_COPIES_PER_NAME: 4,
  MAX_ONLY_ONE_CARDS: 1
};

export function validateDeck(mainDeck: DeckCard[], lifeDeck: DeckCard[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const mainCount = mainDeck.reduce((sum, c) => sum + c.count, 0);
  const lifeCount = lifeDeck.reduce((sum, c) => sum + c.count, 0);

  // 1. Total Deck Size checks
  if (mainCount !== BOTC_RULES.MAIN_DECK_SIZE) {
    errors.push(`Main Deck ต้องมี 50 ใบพอดี (ปัจจุบันมี ${mainCount} ใบ)`);
  }

  if (lifeCount !== BOTC_RULES.LIFE_DECK_SIZE) {
    errors.push(`LIFE Deck ต้องมี 5 ใบพอดี (ปัจจุบันมี ${lifeCount} ใบ)`);
  }

  // 2. Main Deck copy limits & Only 1 check
  const mainCardNames: Record<string, number> = {};
  let onlyOneCount = 0;

  for (const card of mainDeck) {
    mainCardNames[card.name] = (mainCardNames[card.name] || 0) + card.count;
    if (mainCardNames[card.name] > BOTC_RULES.MAX_COPIES_PER_NAME) {
      errors.push(`การ์ด "${card.name}" ใส่ได้สูงสุดไม่เกิน 4 ใบใน Main Deck`);
    }

    if (card.isOnlyOne) {
      onlyOneCount += card.count;
    }

    if (card.isBiased) {
      warnings.push(`มีการ์ดติดสัญลักษณ์ "ลำเอียง" (${card.name}) ซึ่งไม่อนุญาตในการแข่งขันทางการ`);
    }
  }

  if (onlyOneCount > BOTC_RULES.MAX_ONLY_ONE_CARDS) {
    errors.push(`การ์ดที่มีสัญลักษณ์ "Only 1" ใส่ได้สูงสุด 1 ใบในเด็ค (ปัจจุบันมี ${onlyOneCount} ใบ)`);
  }

  // 3. LIFE Deck uniqueness check
  const lifeNames = new Set<string>();
  for (const card of lifeDeck) {
    if (card.count > 1 || lifeNames.has(card.name)) {
      errors.push(`LIFE Card ห้ามมีชื่อซ้ำกันเด็ดขาด ("${card.name}")`);
    }
    lifeNames.add(card.name);
  }

  return {
    isValid: errors.length === 0,
    mainCount,
    lifeCount,
    errors,
    warnings
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/deckValidator.test.ts`
Expected: PASS (5 tests pass).

---

### Task 6: Deck State Management & Export/Import

**Files:**
- Create: `src/store/deckStore.ts`
- Create: `src/utils/deckExportImport.ts`
- Create: `src/utils/deckExportImport.test.ts`

**Interfaces:**
- Produces: `useDeckStore` with `createDeck`, `addCardToMain`, `removeCardFromMain`, `addCardToLife`, `removeCardFromLife`, `exportDeckText`, `importDeckText`.

- [ ] **Step 1: Write failing test `src/utils/deckExportImport.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { exportDeckToText, importDeckFromText } from './deckExportImport.ts';
import type { Deck } from '../types/deck.ts';

describe('Deck Export and Import', () => {
  const sampleDeck: Deck = {
    id: 'test-1',
    name: 'เด็คตงิดแค้น',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    mainDeck: [
      { id: 'BT01-001', name: 'นนทก นิ้วเพชร', setCode: 'BT01', collectorNumber: '001', cardType: 'Avatar', color: 'RED', isOnlyOne: false, isBiased: false, cost: 3, count: 4 }
    ],
    lifeDeck: [
      { id: 'BT01-006', name: 'จิตวิญญาณแห่งตลิ่งชัน', setCode: 'BT01', collectorNumber: '006', cardType: 'Life Card', color: 'COLORLESS', isOnlyOne: false, isBiased: false, cost: null, count: 1 }
    ]
  };

  it('exports deck to clean text format', () => {
    const text = exportDeckToText(sampleDeck);
    expect(text).toContain('=== MAIN DECK ===');
    expect(text).toContain('4x นนทก นิ้วเพชร (BT01-001)');
    expect(text).toContain('=== LIFE DECK ===');
    expect(text).toContain('1x จิตวิญญาณแห่งตลิ่งชัน (BT01-006)');
  });

  it('parses text format back to deck cards', () => {
    const text = exportDeckToText(sampleDeck);
    const parsed = importDeckFromText(text, 'เด็คตงิดแค้น');
    expect(parsed.mainDeck).toHaveLength(1);
    expect(parsed.mainDeck[0].id).toBe('BT01-001');
    expect(parsed.mainDeck[0].count).toBe(4);
    expect(parsed.lifeDeck).toHaveLength(1);
    expect(parsed.lifeDeck[0].id).toBe('BT01-006');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/deckExportImport.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/utils/deckExportImport.ts` and `src/store/deckStore.ts`**

`src/utils/deckExportImport.ts`:
```typescript
import type { Deck, DeckCard } from '../types/deck.ts';

export function exportDeckToText(deck: Deck): string {
  const lines: string[] = [];
  lines.push(`// ${deck.name} - Battle of Talingchan`);
  lines.push(`// Generated by talingchan.tcgcount.com`);
  lines.push('');
  lines.push('=== MAIN DECK ===');
  for (const c of deck.mainDeck) {
    lines.push(`${c.count}x ${c.name} (${c.id})`);
  }
  lines.push('');
  lines.push('=== LIFE DECK ===');
  for (const c of deck.lifeDeck) {
    lines.push(`${c.count}x ${c.name} (${c.id})`);
  }
  return lines.join('\n');
}

export function importDeckFromText(text: string, defaultName = 'Imported Deck'): Pick<Deck, 'name' | 'mainDeck' | 'lifeDeck'> {
  const mainDeck: DeckCard[] = [];
  const lifeDeck: DeckCard[] = [];
  let currentSection: 'MAIN' | 'LIFE' = 'MAIN';

  const lines = text.split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('//')) continue;

    if (line.includes('=== LIFE DECK ===')) {
      currentSection = 'LIFE';
      continue;
    }
    if (line.includes('=== MAIN DECK ===')) {
      currentSection = 'MAIN';
      continue;
    }

    // Pattern: "4x นนทก นิ้วเพชร (BT01-001)" or "4 นนทก นิ้วเพชร (BT01-001)"
    const match = line.match(/^(\d+)x?\s+(.+?)(?:\s+\(([A-Za-z0-9-]+)\))?$/);
    if (match) {
      const count = parseInt(match[1], 10);
      const name = match[2].trim();
      const id = match[3] || name;
      const card: DeckCard = {
        id,
        name,
        setCode: id.split('-')[0] || 'BT01',
        collectorNumber: id.split('-')[1] || '000',
        cardType: currentSection === 'LIFE' ? 'Life Card' : 'Avatar',
        color: 'RED',
        isOnlyOne: false,
        isBiased: false,
        cost: 0,
        count
      };
      if (currentSection === 'MAIN') {
        mainDeck.push(card);
      } else {
        lifeDeck.push(card);
      }
    }
  }

  return {
    name: defaultName,
    mainDeck,
    lifeDeck
  };
}
```

`src/store/deckStore.ts`:
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Deck, DeckCard } from '../types/deck.ts';
import type { TalingchanCard } from '../types/card.ts';

interface DeckState {
  decks: Deck[];
  activeDeckId: string | null;
  createDeck: (name: string) => string;
  deleteDeck: (deckId: string) => void;
  renameDeck: (deckId: string, name: string) => void;
  setActiveDeck: (deckId: string) => void;
  addCardToMain: (deckId: string, card: TalingchanCard) => void;
  removeCardFromMain: (deckId: string, cardId: string) => void;
  addCardToLife: (deckId: string, card: TalingchanCard) => void;
  removeCardFromLife: (deckId: string, cardId: string) => void;
  importDeck: (deckData: Pick<Deck, 'name' | 'mainDeck' | 'lifeDeck'>) => string;
}

function cardToDeckCard(card: TalingchanCard, count = 1): DeckCard {
  return {
    id: card.id,
    name: card.name,
    setCode: card.setCode,
    collectorNumber: card.collectorNumber,
    cardType: card.cardType,
    color: card.color,
    cost: card.cost,
    isOnlyOne: card.isOnlyOne,
    isBiased: card.isBiased,
    count
  };
}

export const useDeckStore = create<DeckState>()(
  persist(
    (set) => ({
      decks: [],
      activeDeckId: null,

      createDeck: (name) => {
        const id = `deck_${Date.now()}`;
        const newDeck: Deck = {
          id,
          name: name.trim() || 'เด็คใหม่',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          mainDeck: [],
          lifeDeck: []
        };
        set((state) => ({
          decks: [newDeck, ...state.decks],
          activeDeckId: id
        }));
        return id;
      },

      deleteDeck: (deckId) => {
        set((state) => ({
          decks: state.decks.filter((d) => d.id !== deckId),
          activeDeckId: state.activeDeckId === deckId ? (state.decks.find(d => d.id !== deckId)?.id || null) : state.activeDeckId
        }));
      },

      renameDeck: (deckId, name) => {
        set((state) => ({
          decks: state.decks.map((d) => (d.id === deckId ? { ...d, name: name.trim(), updatedAt: new Date().toISOString() } : d))
        }));
      },

      setActiveDeck: (deckId) => set({ activeDeckId: deckId }),

      addCardToMain: (deckId, card) => {
        set((state) => ({
          decks: state.decks.map((deck) => {
            if (deck.id !== deckId) return deck;
            const existing = deck.mainDeck.find((c) => c.id === card.id);
            let updatedMain: DeckCard[];
            if (existing) {
              updatedMain = deck.mainDeck.map((c) => (c.id === card.id ? { ...c, count: c.count + 1 } : c));
            } else {
              updatedMain = [...deck.mainDeck, cardToDeckCard(card, 1)];
            }
            return { ...deck, mainDeck: updatedMain, updatedAt: new Date().toISOString() };
          })
        }));
      },

      removeCardFromMain: (deckId, cardId) => {
        set((state) => ({
          decks: state.decks.map((deck) => {
            if (deck.id !== deckId) return deck;
            const existing = deck.mainDeck.find((c) => c.id === cardId);
            if (!existing) return deck;
            let updatedMain: DeckCard[];
            if (existing.count > 1) {
              updatedMain = deck.mainDeck.map((c) => (c.id === cardId ? { ...c, count: c.count - 1 } : c));
            } else {
              updatedMain = deck.mainDeck.filter((c) => c.id !== cardId);
            }
            return { ...deck, mainDeck: updatedMain, updatedAt: new Date().toISOString() };
          })
        }));
      },

      addCardToLife: (deckId, card) => {
        set((state) => ({
          decks: state.decks.map((deck) => {
            if (deck.id !== deckId) return deck;
            const existing = deck.lifeDeck.find((c) => c.id === card.id);
            if (existing) return deck; // Only 1 copy in Life Deck
            return {
              ...deck,
              lifeDeck: [...deck.lifeDeck, cardToDeckCard(card, 1)],
              updatedAt: new Date().toISOString()
            };
          })
        }));
      },

      removeCardFromLife: (deckId, cardId) => {
        set((state) => ({
          decks: state.decks.map((deck) => {
            if (deck.id !== deckId) return deck;
            return {
              ...deck,
              lifeDeck: deck.lifeDeck.filter((c) => c.id !== cardId),
              updatedAt: new Date().toISOString()
            };
          })
        }));
      },

      importDeck: (deckData) => {
        const id = `deck_${Date.now()}`;
        const newDeck: Deck = {
          id,
          name: deckData.name,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          mainDeck: deckData.mainDeck,
          lifeDeck: deckData.lifeDeck
        };
        set((state) => ({
          decks: [newDeck, ...state.decks],
          activeDeckId: id
        }));
        return id;
      }
    }),
    {
      name: 'talingchan_decks_v1'
    }
  )
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/deckExportImport.test.ts`
Expected: PASS (2 tests pass).

---

### Task 7: Collection Tracker UI Components

**Files:**
- Create: `src/components/collection/FilterBar.tsx`
- Create: `src/components/collection/CardTile.tsx`
- Create: `src/components/collection/CardGrid.tsx`
- Create: `src/components/collection/SetProgressView.tsx`
- Create: `src/components/collection/CardDetailModal.tsx`
- Create: `src/components/collection/CollectionPage.tsx`

**Interfaces:**
- Produces: Interactive collection page with search, multi-filter chips, set progress view, card detail modal, and fast +/- inventory counters.

- [ ] **Step 1: Write `src/components/collection/FilterBar.tsx`**
  - Implement full-text search input with clear button.
  - Color filters with official BOTC color badges.
  - Card type filter chips (Avatar, Magic, Land Magic, Life Card).
  - Set select dropdown (BT01, SD01, etc.).

- [ ] **Step 2: Write `src/components/collection/CardTile.tsx`**
  - Renders card thumbnail with `resolveCardImageUrl` and fallback error handler.
  - Cost badge, Color badge, Symbol chip.
  - Steppers for Normal, Foil, Secret Rare (`+` and `-`).
  - Click to open CardDetailModal.

- [ ] **Step 3: Write `src/components/collection/CardDetailModal.tsx`**
  - Large modal dialog with full artwork.
  - Complete card text, illustrator, Soi (ซอย), and type details.
  - Buttons: "+ ใส่ Main Deck", "+ ใส่ Life Deck" (adds to active deck in `useDeckStore`).

- [ ] **Step 4: Write `src/components/collection/SetProgressView.tsx`**
  - Shows cards collected progress bar (e.g. `BT01 Welcome ตลิ่งชัน: 38/50 Unique (76%)`).

- [ ] **Step 5: Write `src/components/collection/CollectionPage.tsx`**
  - Connects `FilterBar`, `SetProgressView`, `CardGrid`, and `CardDetailModal`.

- [ ] **Step 6: Run build and lint to verify compilation**

Run: `npm run build && npm run lint`
Expected: 0 errors.

---

### Task 8: Deck Builder UI Components

**Files:**
- Create: `src/components/deck/DeckTray.tsx`
- Create: `src/components/deck/DeckAnalytics.tsx`
- Create: `src/components/deck/MissingCardsModal.tsx`
- Create: `src/components/deck/DeckPage.tsx`

**Interfaces:**
- Produces: Deck management view with 50-card Main Tray + 5-card Life Tray, live validation alerts, cost curves, and missing cards report.

- [ ] **Step 1: Write `src/components/deck/DeckTray.tsx`**
  - Displays LIFE Deck tray (5 slots, checks for non-duplicates).
  - Displays Main Deck tray grouped by card type (Avatar, Magic, Land Magic).
  - Quick count stepper to adjust copies (1-4).
  - Visual status pill: `50/50 Main` & `5/5 Life`.

- [ ] **Step 2: Write `src/components/deck/DeckAnalytics.tsx`**
  - Bar chart for Cost Curve (0-1, 2, 3, 4, 5+).
  - Color ratio breakdown (Red %, Blue %, etc.).
  - Warnings for "ลำเอียง" or rule violations.

- [ ] **Step 3: Write `src/components/deck/MissingCardsModal.tsx`**
  - Compares `deck.mainDeck` and `deck.lifeDeck` against `useCollectionStore.cards`.
  - Calculates exactly which cards and how many copies are needed to play physically.
  - Copy missing list button.

- [ ] **Step 4: Write `src/components/deck/DeckPage.tsx`**
  - Deck selector, Create Deck modal, Rename/Delete buttons.
  - Export to Text, Import from Text, and "Check Missing Cards" action button.

- [ ] **Step 5: Run build and lint to verify compilation**

Run: `npm run build && npm run lint`
Expected: 0 errors.

---

### Task 9: App Integration, Navbar & PWA Setup

**Files:**
- Create: `src/components/layout/Navbar.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: Seamless unified navigation between "สมุดสะสม (Collection)" and "จัดเด็ค (Deck Builder)", active deck banner, and responsive mobile bottom-bar.

- [ ] **Step 1: Implement `src/components/layout/Navbar.tsx`**
  - Header with Logo, Version tag, active deck indicator.
  - Navigation tab switcher: `collection` vs `deck`.
  - Responsive mobile bottom bar for one-handed operation.

- [ ] **Step 2: Update `src/App.tsx` with view state and active deck sync**
  - Connects Navbar to `CollectionPage` and `DeckPage`.
  - Ensures state persists seamlessly on reload.

- [ ] **Step 3: Verify build and PWA service worker registration**

Run: `npm run build`
Expected: Build succeeds with 0 errors.

---

### Task 10: Automated Playwright E2E Tests & Final Release Verification

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/collection.spec.ts`
- Create: `e2e/deck-builder.spec.ts`

**Interfaces:**
- Produces: Automated end-to-end test suite confirming zero regression on critical user flows.

- [ ] **Step 1: Write `playwright.config.ts`**

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI
  },
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] }
    }
  ]
});
```

- [ ] **Step 2: Write `e2e/collection.spec.ts`**
  - Verify page loads with Thai title.
  - Search for "นนทก" and verify `BT01-001` appears.
  - Click `+` on Normal copy and verify count increases to 1.
  - Reload page and verify count remains 1 (LocalStorage persistence).

- [ ] **Step 3: Write `e2e/deck-builder.spec.ts`**
  - Navigate to "จัดเด็ค" tab.
  - Create a new deck named "เด็คทดสอบ".
  - Add cards and verify Main and Life counters update.
  - Open "เช็คการ์ดที่ขาด" and verify missing list accurately reflects difference.
  - Export deck text and verify clipboard output.

- [ ] **Step 4: Execute all verification suites**

Run:
```bash
npm run lint
npm test
npm run build
npx playwright test
```
Expected: 100% checks pass with 0 errors.
