# Design Specification: Battle of Talingchan Solo Practice Playmat & Firebase Cloud Auth

**Date:** 2026-11-03  
**Status:** Draft for User Review  
**Project:** `TalingchanCountTracker` (`talingchan.tcgcount.com`)

---

## 1. Executive Summary & Goals

This specification defines two major capabilities for **TalingchanCountTracker**:

1. **Solo Practice Playmat Mode (โหมดซ้อมเล่นคนเดียวแบบกระดาน 2 ฝั่ง - Dual-Side Solo Playmat)**:
   - Inspired by `PokeCountTracker` Playmat V3 and tailored specifically to the **Battle of Talingchan Rule Book Ver. 3.0**.
   - Allows a single player to test and pilot two decks (Player 1 vs Player 2) on one screen, switch hand control (`Tab` or auto-switch on End Turn), reveal both hands (`โหมดซ้อมเปิดมือ`), and execute official Battle of Talingchan mechanics with smart rule helpers and full Undo/Redo (`Ctrl+Z` / `Ctrl+Y`).
   - Supports **Expandable Avatar Zone** (default 4 slots, dynamically expandable up to 8 slots per side for card effects that increase Avatar Zone capacity).
2. **Firebase Authentication & Cloud Sync (`botcounttracker`)**:
   - Integrates Google Sign-In, Firebase Analytics, and Cloud Firestore synchronization (following `PokeCountTracker` and `LorcanaCountTracker` patterns).
   - Automatically syncs the user's **Card Collection** and **Custom Decks** across devices while preserving offline/guest LocalStorage support.

---

## 2. Part A: Battle of Talingchan Solo Practice Playmat

### 2.1 Official Board Zones (Per Side: P1 & P2 + Shared Center)

Each player side (`player1` and `player2`) maintains independent zones according to the Battle of Talingchan Rule Book:

1. **Avatar Zone (Expandable: Default 4 Slots, Expandable up to 8 Slots)**:
   - Default capacity is **4 slots** (`avatarZoneLimit: 4`).
   - Includes a **`+ ขยายช่อง` / `- ลดช่อง` control** on the board so players can expand the Avatar Zone (5, 6, 7, or 8 slots) when card effects increase Avatar Zone capacity.
   - Each occupied Avatar slot tracks:
     - `card`: The `TalingchanCard` instance.
     - `powerModifier`: Integer modifier (`+1`, `-1`, etc.) applied on top of base `power`, displaying current effective `POWER`.
     - `isRested`: Boolean (`Stand` vs `Rest`/ตะแคง) when attacking or activating abilities.
     - `attachedModifications`: Array of `Modification` Magic cards attached to this Avatar.
     - `note`: Optional status badge or counter text.
2. **Construct Zone (3 Slots)**:
   - Up to **3 slots** for `Construct` (สิ่งก่อสร้าง) cards.
   - Displays a visual warning badge if two Constructs with the same name are placed on the same side.
3. **Magic Zone**:
   - Active area for `Magic` (Normal / React Magic) cards being cast or remaining on field, with one-click action to send to Hell Zone (`ลงนรก`) after resolution.
4. **LIFE Card Zone (5 Cards)**:
   - Holds the 5 `Life Card` instances (from the deck's `lifeDeck`, or top 5 cards fallback if testing an incomplete deck).
   - Each Life Card starts **face-down** (`isFaceDown: true`) and can be individually:
     - Flipped face-up (`หงาย Life Card`)
     - Destroyed to Hell Zone (`ทำลายลงนรก`)
     - Added to Hand (`นำขึ้นมือ`)
     - Banished to Dark Dimension (`เนรเทศไปมิติมืด`)
5. **Main Deck Pile (กองการ์ดหลัก 50 ใบ)**:
   - Displays remaining card count.
   - Quick actions:
     - **Draw 1 (`จั่ว 1 ใบ` / Shortcut `D`)**
     - **Draw to 3 (`จั่วให้ครบมือ 3 ใบ` — Official BOTC Draw Phase helper when hand has < 3 cards)**
     - **View Top X Cards (`ดูใบบนสุด 1–5 ใบ`)** — reorder, add to hand, send to Hell Zone, or put on bottom of deck.
     - **Search Deck (`ค้นหากองการ์ด` / Shortcut `S`)** — modal to pick any card from deck to hand/field/Hell Zone, then auto-shuffle.
     - **Shuffle Deck (`สับกองการ์ด`)**
6. **Hell Zone (โซนนรก / Graveyard)**:
   - Displays count and top card thumbnail.
   - Clicking opens the **Hell Zone Modal** to inspect all cards in Hell and recover cards back to Hand, Avatar Zone, Top/Bottom of Deck, or banish to Dark Dimension (`[เนรเทศ]`).
7. **Dark Dimension Zone (โซนมิติมืด / Banished)**:
   - Displays count of banished (`[เนรเทศ]`) cards.
   - Clicking opens the **Dark Dimension Modal** to inspect or return cards if an effect allows.
8. **Hand Tray (การ์ดบนมือ)**:
   - Interactive bottom bar for the currently active perspective (`player1` or `player2`).
   - Solo Practice Toolbar (matching `PokeCountTracker` Playmat V3):
     - `🔵 P1 มือของคุณ (N)` / `🔴 P2 มือคู่แข่ง (N)` switch tabs (Shortcut `Tab`)
     - `🔄 สลับมือ` button
     - `⚡ สลับมือออโต้เมื่อจบเทิร์น` toggle
     - `👁️ โหมดซ้อม: เปิดดูมือทั้ง 2 ฝั่ง` toggle (`soloRevealAllHands`)
9. **Shared Center Zone (โซนกลางสนามที่ใช้ร่วมกัน)**:
   - **Land Magic Zone (เวทย์สนาม):** Shared single slot affecting both sides, showing which player (`P1` or `P2`) cast it.
   - **Turn, Phase & Coin Flip Bar:**
     - Current Turn Counter (`Turn 1, 2, ...`) and Active Player (`🔵 เทิร์น P1` / `🔴 เทิร์น P2`).
     - Phase Stepper: `Draw Phase` → `Main Phase` → `Attack Phase` → `End Phase` (with Turn 1 First Player No-Attack reminder badge).
     - **Coin Flip / Dice Roller** to decide first player.
     - **Pass Turn (`จบเทิร์น` / Shortcut `Space`)**: Advances turn counter, untaps (Stands) all rested Avatars of the new turn player, sets phase to `Draw Phase`, and optionally flips perspective if Auto-Switch is enabled.

---

### 2.2 Smart Rule Helpers (ตัวช่วยกติกากึ่งอัตโนมัติ)

1. **Game Setup & Starter Deck Presets**:
   - **Deck Selector Modal:** Pick P1 and P2 decks from either:
     - **Custom Decks** saved in `useDeckStore`.
     - **Built-in Starter Deck Presets** generated from `talingchanCards.json` (e.g., `SD01 ตัวตึงไกรลาส`, `SD02 วีรบุรุษปากซอย`, `SD03 นรกก็แค่น้ำพริก`, `SD04 ทหารไก่ชนเขา`, `SD05 กำเนิดจากน้ำ`) so players can jump into practice immediately even with 0 custom decks.
   - **Auto Setup / Mulligan:** Shuffles 50 Main Deck cards, places 5 Life Cards face-down in Life Zone, and draws 5 opening cards for both P1 and P2.
2. **Cost / Gem Payment Helper Modal (หน้าต่างช่วยจ่าย Cost ลงนรก)**:
   - When clicking an `Avatar` or `Construct` in hand to summon/build:
     - If `cost > 0`, opens a compact **Cost Payment Prompt** showing the card's `Cost` and allowing the player to select cards from their hand to discard to Hell Zone (`แสดงค่า Gems ของการ์ดบนมือแต่ละใบ`), OR click **"อัญเชิญทันที (ข้ามการจ่าย Cost / เอฟเฟกต์พิเศษ)"** for zero-friction sandbox flexibility.
     - Also allows choosing whether to attach a `Modification` card to an existing Avatar or play a `Magic` / `Land Magic` directly.
3. **Combat & Life Attack Helper (ระบบสั่งโจมตีเทียบ POWER & ตี Life)**:
   - Clicking an Avatar on the field offers:
     - **⚔️ สั่งโจมตี (Attack):** Rests the Avatar and lets the player pick a target on the opponent's board:
       - **Target Opponent Avatar:** Compares effective `POWER` (`base + powerModifier`).
         - Attacker POWER > Defender POWER → Defender sent to Hell Zone.
         - Attacker POWER === Defender POWER → Both Avatars sent to Hell Zone (per BOTC Rule Book).
         - Attacker POWER < Defender POWER → Attacker sent to Hell Zone (or cancel).
       - **Target Opponent Life Card:** Warns if opponent still has Avatars in their Avatar Zone (per BOTC rule: must clear enemy Avatars first unless an effect allows direct attack), and flips/destroys the chosen Life Card.
     - **ปรับ POWER (`+1` / `-1` / Reset)**
     - **สลับตั้ง/ตะแคง (`Stand / Rest`)**
     - **ย้ายโซน (`ลงนรก` / `เนรเทศไปมิติมืด` / `กลับขึ้นมือ` / `เข้ากองการ์ด`)**

---

## 3. Part B: Firebase Authentication & Cloud Sync (`botcounttracker`)

### 3.1 Firebase Configuration (`src/utils/firebase.ts`)
Uses the project credentials provided for `botcounttracker` (with `import.meta.env.VITE_FIREBASE_*` override support):
- `projectId`: `"botcounttracker"`
- `authDomain`: `"botcounttracker.firebaseapp.com"`
- `storageBucket`: `"botcounttracker.firebasestorage.app"`
- `messagingSenderId`: `"721461955099"`
- `appId`: `"1:721461955099:web:d1b84ddb130e61e93d46be"`
- `measurementId`: `"G-XR3PTEV5C1"`

Initializes:
- `app`: Singleton Firebase App
- `auth`: Firebase Auth with `GoogleAuthProvider` (`prompt: 'select_account'`) and `browserLocalPersistence`
- `db`: Cloud Firestore instance
- `analytics`: Firebase Analytics (guarded by `isSupported()` so headless tests and SSR never fail)

### 3.2 Auth & Cloud Sync Architecture
1. **`src/store/authStore.ts`**:
   - Tracks `user`, `loading`, `error`, `signIn()`, `signOut()`.
   - `onAuthStateChanged` listener triggers `useCollectionStore.getState().loadUserFromCloud(user.uid)` and `useDeckStore.getState().loadUserDecksFromCloud(user.uid)` upon sign-in, and resets to guest storage upon sign-out.
2. **Cloud Sync in `collectionStore.ts`**:
   - Firestore path: `users/{uid}/collection/main` storing `{ cards, updatedAt }`.
   - When signed in:
     - If cloud document exists, loads cloud collection (or merges non-empty guest cards if cloud is empty).
     - Debounces writes (500ms) to Firestore whenever `setCardCount`, `incrementCard`, `decrementCard`, or `clearCollection` is called.
     - Tracks `syncStatus: 'idle' | 'syncing' | 'synced' | 'error'` and `lastSyncedAt: number | null`.
     - Provides `forceSyncCloud()` for manual sync from `AccountMenu`.
3. **Cloud Sync in `deckStore.ts`**:
   - Firestore path: `users/{uid}/decks/{deckId}` storing each `Deck` document.
   - When signed in:
     - Loads all user decks from `users/{uid}/decks`. If cloud is empty and guest has local decks, uploads guest decks to cloud automatically.
     - Syncs deck creations, edits, renames, and deletions to Firestore.
4. **`src/components/layout/AccountMenu.tsx` (Pokemon-style Account Button & Dropdown in `Navbar`)**:
   - Displays **"เข้าสู่ระบบ (Google)"** button when logged out, or User Avatar + Name + Cloud Sync indicator dot when logged in.
   - Dropdown menu includes:
     - User profile header (Display Name, Email, Cloud Sync status & last synced time)
     - **☁️ ซิงค์ข้อมูลตอนนี้ (Sync Now)**
     - **📥 ส่งออก / นำเข้าข้อมูลสำรอง (Backup JSON)**
     - **🚪 ออกจากระบบ (Sign Out)**

---

## 4. File Structure Additions & Modifications

```text
src/
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx                      # Add "โหมดซ้อม (Playmat)" tab + AccountMenu
│   │   └── AccountMenu.tsx                 # Google Login / Cloud Sync dropdown menu
│   ├── deck/
│   │   └── DeckPage.tsx                    # Add "🥋 ซ้อมเด็คนี้" quick-launch button
│   └── playmat/
│       ├── PlaymatPage.tsx                 # Main Dual-Side Solo Playmat screen
│       ├── PlayerBoardZone.tsx             # P1 / P2 board zones (Expandable Avatar, Construct, Life, Magic, Deck, Hell, Dark)
│       ├── CenterSharedZone.tsx            # Land Magic Zone, Turn/Phase stepper, Coin Flip, Solo controls
│       ├── CostPaymentModal.tsx            # Gem/Cost discard-to-Hell helper when summoning Avatar/Construct
│       ├── CombatTargetModal.tsx           # Attack Avatar (POWER comparison) or Life Card modal
│       ├── ZoneBrowserModal.tsx            # Inspect/search Deck, Hell Zone, Dark Dimension, Top X cards
│       └── PlaymatDeckSelectorModal.tsx    # Select Custom Decks or Starter Deck Presets for P1 & P2
├── constants/
│   └── starterDecks.ts                     # Built-in Starter Deck presets (SD01–SD05) from talingchanCards.json
├── store/
│   ├── authStore.ts                        # Firebase Auth Zustand store
│   ├── collectionStore.ts                  # Add Firestore sync + syncStatus + lastSyncedAt
│   └── deckStore.ts                        # Add Firestore sync + pendingPlaymatDeckId
├── types/
│   └── playmat.ts                          # BOTC Tabletop state, slot, phase, and action types
└── utils/
    ├── firebase.ts                         # Firebase App, Auth, Firestore, Analytics init
    └── talingchanTabletopHelper.ts         # Pure state reducer functions + Undo/Redo history stack
```

---

## 5. Verification & Testing Plan

1. **Unit Tests (Vitest)**:
   - `talingchanTabletopHelper.test.ts`:
     - Game setup (50 main deck → 5 hand + 45 deck, 5 life cards face-down).
     - Expandable Avatar Zone (`4` → `5`..`8` slots, enforcement of current slot limit).
     - Summoning Avatar with Cost payment (moving selected hand cards to Hell Zone).
     - Combat resolution (`POWER` win, `POWER` tie destroying both, Life Card flip/destroy).
     - Draw Phase helper (Draw to 3 cards in hand vs Draw 1).
     - Turn pass (untapping rested Avatars, perspective auto-swap).
   - `authAndSync.test.ts`:
     - Guest mode persistence and cloud sync state transitions.
2. **E2E Tests (Playwright)**:
   - `playmat.spec.ts`:
     - Navigate to **โหมดซ้อม (Playmat)**, load Starter Deck preset, draw cards, expand Avatar Zone from 4 to 5 slots, summon an Avatar with Cost helper, attack opponent, switch P1/P2 hand perspective, and verify Auth button renders in Navbar.

