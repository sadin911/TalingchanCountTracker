# Design Document: TalingchanCountTracker (`talingchan.tcgcount.com`)

**Date:** 2026-10-26  
**Status:** Approved  
**Target Domain:** `talingchan.tcgcount.com`  
**System Family:** `tcgcount.com` (Sister project to `PokeCountTracker` and `LorcanaCountTracker`)

---

## 1. Executive Summary & Goals

**TalingchanCountTracker** is a high-performance, mobile-first Web Application and PWA designed specifically for the Thai Trading Card Game **Battle of Talingchan** (แบทเทิล ออฟ ตลิ่งชัน / BOTC by PASULOL x Team YUK).

Following the lessons learned and streamlined architecture from `PokeCountTracker` and `LorcanaCountTracker`, this project focuses directly on:
1. **Card Database & Collection Tracker**: Complete card database of Starter Decks (SD01+) and Booster Sets (BT01-BT12+), full Thai card metadata, filters by Type, Color, Tribe/Symbol, Cost, Power, and Soi (ซอย), and multi-finish inventory tracking (Normal, Foil, Secret Rare).
2. **Deck Builder Engine with Strict BOTC Rules**: 50-card Main Deck + 5-card Life Deck validation, duplicate checks, "Only 1" card limit, "ลำเอียง" (Banned) alerts, mana/cost curves, and an instant "Check Missing Cards" tool against the player's collection.
3. **Local-First Architecture (Phase 1)**: Zero-friction local development and testing utilizing LocalStorage and bundled JSON catalogue, designed with clean interfaces to plug into Cloudflare R2 and Firebase in Phase 2.

---

## 2. System Architecture & Tech Stack

### 2.1 Technology Stack
* **Framework:** React 19 + TypeScript (strict mode)
* **Build Tool:** Vite 8 (`@vitejs/plugin-react`)
* **Styling:** TailwindCSS v4 with a custom dark-mode urban street theme tailored for Battle of Talingchan (accented with game colors: Red, Blue, Green, Black, White, Yellow).
* **State Management:** Zustand 5 with `persist` middleware (local-first storage).
* **PWA:** `vite-plugin-pwa` with service worker caching for offline tournament usage.
* **Testing:**
  * **Unit/Integration Tests:** Vitest (testing BOTC deck validator rules and collection calculations).
  * **End-to-End (E2E) Tests:** Playwright (automating UI flows: collection updates, deck creation, rule enforcement, import/export).
* **Code Quality:** Oxlint + TypeScript compiler (`tsc -b`).

### 2.2 Project Structure
```
TalingchanCountTracker/
├── docs/
│   └── superpowers/specs/2026-10-26-talingchan-count-tracker-design.md
├── scripts/
│   ├── fetch-talingchan-cards.mjs      # Scrape card data from Fandom Wiki
│   ├── download-talingchan-images.mjs  # Download & convert images to WebP
│   └── upload-talingchan-r2.mjs        # Upload assets to Cloudflare R2 (Phase 2)
├── public/
│   ├── card-placeholder.svg
│   ├── pwa-192x192.png
│   └── pwa-512x512.png
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── common/                     # Button, Modal, SearchInput, Badge
│   │   ├── layout/                     # Navbar, Footer, MobileNav
│   │   ├── collection/                 # CardGrid, CardCard, FilterBar, DetailModal
│   │   └── deck/                       # DeckBuilder, DeckList, DeckStats, MissingCards
│   ├── constants/
│   │   ├── botc.ts                     # Colors, Types, Symbols, Finish styles
│   │   └── version.ts                  # APP_VERSION
│   ├── data/
│   │   ├── talingchanCards.json        # Compiled card catalogue
│   │   └── talingchanSets.json         # Set release metadata
│   ├── hooks/
│   │   └── useDebounce.ts
│   ├── store/
│   │   ├── collectionStore.ts          # Owned quantities per card and finish
│   │   └── deckStore.ts                # User decks, active deck, validation state
│   ├── types/
│   │   ├── card.ts                     # TalingchanCard, CardType, CardColor, Rarity
│   │   ├── collection.ts               # CollectionEntry, SetProgress
│   │   └── deck.ts                     # Deck, DeckCard, ValidationResult
│   ├── utils/
│   │   ├── cardImage.ts                # URL resolver (local / R2 / placeholder)
│   │   ├── deckValidator.ts            # BOTC rule validation engine
│   │   └── deckExportImport.ts         # Text and JSON deck serialisation
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── e2e/                                # Playwright E2E test specs
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 3. Card Data Model & Catalogue Specification

### 3.1 Types (`src/types/card.ts`)
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
  /** Unique ID: `${setCode}-${collectorNumber}`, e.g. "BT01-001" */
  id: string;
  name: string;
  setCode: string;          // e.g. "BT01", "SD01"
  setName: string;          // e.g. "Welcome ตลิ่งชัน"
  collectorNumber: string;  // e.g. "001"
  cardType: CardType;
  color: CardColor;
  symbol: string;           // Tribe/Symbol, e.g. "ยักษ์", "เปรต", "เทพ", "มนุษย์"
  soi: number;              // ซอย e.g. 1, 2, 3
  cost: number | null;
  gems: number | null;
  power: number | null;
  rarity: Rarity;
  isOnlyOne: boolean;       // Card possesses "Only 1" symbol
  isBiased: boolean;        // Card possesses "ลำเอียง" symbol (Banned from tournament play)
  isCollab: boolean;        // Card possesses "โดนใจ" collaboration mark
  illustrator: string;
  effect: string;
  rarityVariants: string[]; // Variations e.g. ['UR', 'SCR', 'PR']
  finishes: FinishKey[];
}

export interface TalingchanSet {
  code: string;             // e.g. "BT01"
  name: string;             // e.g. "Welcome ตลิ่งชัน"
  type: 'Booster' | 'Starter';
  releasedAt: string | null;
  totalCards: number;
}
```

---

## 4. Scraper Pipeline & Asset Handling

### 4.1 Data Pipeline
* **Source:** Battle of Talingchan Wiki (`battle-of-talingchan.fandom.com/th/wiki/`)
* **Scraper CLI Script (`scripts/fetch-talingchan-cards.mjs`):**
  1. Traverses the main wiki catalogue pages for all sets (BT01 through BT12, SD01 through SD03+).
  2. Extracts card table rows: Print ID, Name, Type, Symbol, Color, Soi, Rarity.
  3. Visits card detail pages to extract Cost, Gems, Power, Effect text, Illustrator, and Artwork images.
  4. Saves structured JSON to `src/data/talingchanCards.json` and `src/data/talingchanSets.json`.
* **Image Processing (`scripts/download-talingchan-images.mjs`):**
  1. Downloads artwork images.
  2. Uses `sharp` to convert and create dual-tier WebP:
     - Thumbnail: 320w (`public/card-images/${setCode}/${num}.webp`)
     - Full Resolution: 674w (`public/card-images-lg/${setCode}/${num}.webp`)
* **Image Resolution Strategy (`src/utils/cardImage.ts`):**
  - Priority: Local file -> Cloudflare R2 CDN (Phase 2) -> SVG Placeholder.
  - No broken images on UI; error handler cascades gracefully.

---

## 5. Collection Tracker Module

### 5.1 Card Catalogue View
* **Fast Filter Bar:**
  - Full-text search on card name, effect text, and card number with debounce.
  - Multi-select filters for Card Type, Color, Set, Tribe/Symbol, and Rarity.
  - Sorting options: By Set & Number, by Cost, by Power, by Name.
* **Card Tile & Stepper:**
  - Displays card artwork, cost badge, color accent, tribe symbol, and current owned quantities.
  - Inline +/- stepper allowing the collector to increment Normal, Foil, or Secret Rare count without opening a modal.
* **Set Progress Tracker:**
  - Visual progress bar per set indicating percentage and fraction of unique cards collected (e.g. `45/50 Unique (90%)`).
  - Total card count calculation including duplicates.
* **Card Detail Modal:**
  - Full high-resolution card view.
  - Complete card text, rules commentary, illustrator credit.
  - Quick action: "Add 1 to Active Deck (Main / Life)".

---

## 6. Deck Builder Module (BOTC Rule Engine)

### 6.1 Battle of Talingchan Official Deck Rules
The rule validator (`src/utils/deckValidator.ts`) evaluates decks in real-time according to official rules:
1. **Total Deck Size:** 55 cards total.
   - **Main Deck:** Exactly 50 cards (Avatar, Magic, Land Magic, Modification, React Magic).
   - **LIFE Deck:** Exactly 5 cards.
2. **Duplicate Limits:**
   - **Main Deck:** Maximum of 4 copies of any card with the same name.
   - **LIFE Deck:** Strictly **no duplicates allowed** (all 5 Life cards must have distinct names).
3. **Only 1 Restriction:**
   - The Main Deck may contain **at most 1 card** that has the "Only 1" (Only #1) symbol.
4. **Legality & Tournament Status:**
   - Cards marked as **"ลำเอียง"** trigger a prominent red warning: *“มีใบที่ติดสัญลักษณ์ 'ลำเอียง' ไม่อนุญาตให้ใช้ในการแข่งขันทางการ”*.
   - Cards marked as **"โดนใจ"** (Collab) are permitted normally.

### 6.2 Deck Builder UI / UX
* **Dual Deck Trays:**
  - Top Tray: **LIFE Deck (5 cards)** with slots 1-5 clearly delineated.
  - Main Tray: **Main Deck (50 cards)** grouped by Type (Avatars, Magic, Land Magic).
* **Live Deck Analytics:**
  - Card Count Indicator: `50/50 Main` + `5/5 Life` (color-coded: yellow while incomplete, green when valid, red if exceeded or violating rules).
  - Cost Curve Bar Chart: visual distribution across costs (0-1, 2, 3, 4, 5+).
  - Color Ratio Donut / Bar: breakdown of deck colors.
* **"Check Missing Cards" (เช็คการ์ดที่ขาด):**
  - Analyzes the deck list against `useCollectionStore`.
  - Lists cards required that the user does not own or lacks sufficient copies of, enabling quick trade list generation.
* **Export / Import:**
  - **Plain Text:** Export formatted text list to clipboard for Discord, Facebook groups, or tournament registration.
  - **JSON Backup:** Full deck import/export for local file backups.

---

## 7. State Management & Storage (Local-First)

### 7.1 `collectionStore.ts`
```typescript
interface CollectionState {
  // Keyed by cardId, storing counts: { normal: number, foil: number, secret: number }
  cards: Record<string, { normal: number; foil: number; secret: number }>;
  setCardCount: (cardId: string, finish: FinishKey, count: number) => void;
  incrementCard: (cardId: string, finish: FinishKey) => void;
  decrementCard: (cardId: string, finish: FinishKey) => void;
  clearCollection: () => void;
}
```
* Persisted to `localStorage` under key `talingchan_collection_v1`.

### 7.2 `deckStore.ts`
```typescript
interface DeckState {
  decks: Deck[];
  activeDeckId: string | null;
  createDeck: (name: string) => string;
  deleteDeck: (deckId: string) => void;
  renameDeck: (deckId: string, name: string) => void;
  addCardToMain: (deckId: string, card: TalingchanCard) => void;
  removeCardFromMain: (deckId: string, cardId: string) => void;
  addCardToLife: (deckId: string, card: TalingchanCard) => void;
  removeCardFromLife: (deckId: string, cardId: string) => void;
  importDeck: (deck: Deck) => void;
}
```
* Persisted to `localStorage` under key `talingchan_decks_v1`.

---

## 8. Verification & Quality Gates

To adhere strictly to the engineering persona of `tcgcount.com`:
1. **Unit Tests (Vitest):**
   - `deckValidator.test.ts`:
     - Validates 50 main cards + 5 life cards passing.
     - Validates rejection of 51 or 49 main cards.
     - Validates rejection of duplicate names in Life Deck.
     - Validates rejection of >4 copies of the same card name in Main Deck.
     - Validates rejection of >1 "Only 1" card.
     - Flags "ลำเอียง" cards as tournament illegal.
   - `collectionStore.test.ts`:
     - Correctly calculates set completion percentages and finishes.
2. **E2E Automation (Playwright):**
   - `collection.spec.ts`: Tests search filtering, updating card counts, and persisting state across reloads.
   - `deck-builder.spec.ts`: Tests creating a deck, adding cards to main/life, enforcing BOTC rules, and checking missing cards.
3. **Build & Lint Gate:**
   - `npm run lint` (Oxlint) with 0 errors.
   - `npm run build` (`tsc -b && vite build`) with 0 errors.

---

## 9. Future Phase: Cloud & Production Deployment
When ready for cloud deployment:
1. **Cloudflare R2 Bucket:** Create bucket `talingchan-card-images` and configure custom CDN URL.
2. **Firebase Setup:** Create project `talingchancounttracker`, enable Anonymous & Google Auth, deploy Firestore rules.
3. **Domain:** Assign `talingchan.tcgcount.com` CNAME to Cloudflare Pages deployment.
