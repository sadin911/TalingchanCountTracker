# Solo Practice Playmat & Firebase Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Battle of Talingchan Dual-Side Solo Practice Playmat (with expandable Avatar Zone 4–8 slots, Rule Book Ver. 3.0 zones, smart Cost/Gem payment and Combat helpers, Starter Deck presets, Undo/Redo) and integrate Firebase Google Auth + Cloud Firestore sync (`botcounttracker`).

**Architecture:** Pure immutable state reducer (`src/utils/talingchanTabletopHelper.ts`) manages both Player 1 and Player 2 board states, shared Land Magic Zone, turn/phase progression, and Undo/Redo history stacks, rendered through responsive React + Tailwind components (`src/components/playmat/`). Firebase Authentication and Firestore (`src/utils/firebase.ts`, `src/store/authStore.ts`) synchronize user collections and decks with automatic guest-to-cloud migration and offline LocalStorage fallback.

**Tech Stack:** React 19, TypeScript 5.7, TailwindCSS v4, Zustand 5, Firebase JS SDK v11 (`firebase/app`, `firebase/auth`, `firebase/firestore`, `firebase/analytics`), Vitest, Playwright.

## Global Constraints

- All user-facing UI text, zone labels, card types, and game rules must be displayed primarily in Thai (`AGENTS.md` Rule 5).
- Avatar Zone defaults to 4 slots per player and can be dynamically expanded up to 8 slots (`4..8`) per player.
- Single atomic commits bundling `AI_LOG.md` with code changes (`AGENTS.md` Rule 1 & 2).
- Quality gates required before push: `npm run lint`, `npm run build`, `npm test`, `npx playwright test` all passing with 0 errors.

---

### Task 1: Firebase SDK Setup, Auth Store & Cloud Sync (`botcounttracker`)

**Files:**
- Modify: `package.json`
- Create: `src/utils/firebase.ts`
- Create: `src/store/authStore.ts`
- Modify: `src/store/collectionStore.ts`
- Modify: `src/store/deckStore.ts`
- Create: `src/store/authAndSync.test.ts`

**Interfaces:**
- Produces:
  - `useAuthStore`: `{ user, loading, error, signIn, signOut, clearError }`
  - `useCollectionStore`: adds `{ syncStatus, lastSyncedAt, loadUserFromCloud, forceSyncCloud, resetToGuest, exportCollectionJSON, importCollectionJSON }`
  - `useDeckStore`: adds `{ syncStatus, lastSyncedAt, loadUserDecksFromCloud, forceSyncDecksCloud, resetToGuestDecks, pendingPlaymatDeckId, setPendingPlaymatDeck }`

- [ ] **Step 1: Install `firebase` dependency**
- [ ] **Step 2: Write failing unit tests in `src/store/authAndSync.test.ts` for collection JSON backup/restore, guest reset, and pending playmat deck selection**
- [ ] **Step 3: Implement `src/utils/firebase.ts`, `src/store/authStore.ts`, and cloud sync extensions in `collectionStore.ts` and `deckStore.ts`**
- [ ] **Step 4: Run `npm test` to verify `authAndSync.test.ts` passes**

---

### Task 2: BOTC Playmat Types, Starter Deck Presets & Tabletop State Engine (TDD)

**Files:**
- Create: `src/types/playmat.ts`
- Create: `src/constants/starterDecks.ts`
- Create: `src/utils/talingchanTabletopHelper.ts`
- Create: `src/utils/talingchanTabletopHelper.test.ts`

**Interfaces:**
- Produces:
  - `STARTER_DECK_PRESETS`: Built-in playable 50+5 BOTC starter decks (`SD01`–`SD05`) constructed from `talingchanCards.json`.
  - `TabletopActions`: Pure functions for `createInitialGameState`, `setupNewGame`, `drawCards`, `drawToThree`, `setAvatarZoneLimit`, `summonAvatarWithCost`, `buildConstructWithCost`, `castMagic`, `playLandMagic`, `attachModification`, `toggleAvatarRest`, `adjustAvatarPower`, `resolveAvatarCombat`, `attackLifeCard`, `flipLifeCard`, `moveCardBetweenZones`, `passTurn`, `swapPerspective`, `toggleRevealAllHands`, `flipCoin`.

- [ ] **Step 1: Write failing unit tests in `src/utils/talingchanTabletopHelper.test.ts` covering setup (50 main -> 5 hand + 45 deck, 5 life face-down), expandable Avatar Zone (4 -> 8 slots), Cost payment to Hell Zone, Combat POWER comparison (win, tie destroys both, lose), Draw-to-3 rule, and Turn pass untap**
- [ ] **Step 2: Run `npx vitest run src/utils/talingchanTabletopHelper.test.ts` and verify RED**
- [ ] **Step 3: Implement `src/types/playmat.ts`, `src/constants/starterDecks.ts`, and `src/utils/talingchanTabletopHelper.ts`**
- [ ] **Step 4: Run `npx vitest run src/utils/talingchanTabletopHelper.test.ts` and verify GREEN**

---

### Task 3: Solo Playmat UI Components & Modals

**Files:**
- Create: `src/components/playmat/CostPaymentModal.tsx`
- Create: `src/components/playmat/CombatTargetModal.tsx`
- Create: `src/components/playmat/ZoneBrowserModal.tsx`
- Create: `src/components/playmat/PlaymatDeckSelectorModal.tsx`
- Create: `src/components/playmat/CenterSharedZone.tsx`
- Create: `src/components/playmat/PlayerBoardZone.tsx`
- Create: `src/components/playmat/PlaymatPage.tsx`

- [ ] **Step 1: Create modals for Cost/Gem discard payment, Combat targeting, Zone browsing (Deck search, Top X, Hell Zone, Dark Dimension), and Deck Selection (Custom + Starter Presets)**
- [ ] **Step 2: Create `CenterSharedZone.tsx` (Land Magic Zone, Phase Stepper, Turn Indicator, Coin Flip, Solo Perspective/Reveal Controls)**
- [ ] **Step 3: Create `PlayerBoardZone.tsx` (Expandable Avatar Zone 4–8 slots with `+ ขยายช่อง` / `- ลดช่อง`, Construct Zone 3 slots, Magic Zone, Life Card Zone 5 slots, Deck/Hell/Dark piles)**
- [ ] **Step 4: Create `PlaymatPage.tsx` with Undo/Redo keyboard shortcuts (`Ctrl+Z`, `Ctrl+Y`, `D`, `S`, `Tab`, `Space`) and Hand Tray**

---

### Task 4: Navbar AccountMenu, Playmat Navigation & Deck Quick-Playtest Integration

**Files:**
- Create: `src/components/layout/AccountMenu.tsx`
- Modify: `src/components/layout/Navbar.tsx`
- Modify: `src/components/deck/DeckPage.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Implement `AccountMenu.tsx` with Google Login, Sync Now, Backup JSON Export/Import modal, and Sign Out**
- [ ] **Step 2: Update `Navbar.tsx` and `App.tsx` to add the `'playmat'` (`โหมดซ้อม (Playmat)`) tab and render `AccountMenu`**
- [ ] **Step 3: Update `DeckPage.tsx` to add the `"🥋 ซ้อมเด็คนี้"` button that loads the active deck directly into the Playmat**

---

### Task 5: End-to-End Playwright Tests & Quality Gate Verification

**Files:**
- Create: `e2e/playmat.spec.ts`
- Modify: `e2e/collection.spec.ts` (verify compatibility)

- [ ] **Step 1: Write Playwright E2E test `e2e/playmat.spec.ts` testing Playmat tab navigation, Starter Deck setup, Expandable Avatar Zone (4 -> 5 slots), Summoning Avatar with Cost payment to Hell Zone, Combat/Phase progression, P1/P2 hand switching, and AccountMenu rendering**
- [ ] **Step 2: Run full quality gate: `npm run lint`, `npm run build`, `npm test`, `npx playwright test`**

