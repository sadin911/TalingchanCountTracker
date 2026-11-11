# Cross-Agent Repository Rules & Guidelines

This document applies to **all AI coding assistants** working on this repository, including **Antigravity IDE, Claude Code, Gemini CLI, GitHub Copilot, and Cursor**.

---

## 1. Mandatory Version Bump & Git Tag on Deploy (CRITICAL)

Whenever taking changes live, merging to `main`, or triggering a production deployment:

1. **Synchronize Version Numbers**:
   - Update `"version"` in [`package.json`](file:///Users/sadin/Project/TalingchanCountTracker/package.json) (SemVer: `x.y.z`).
   - Update version constants in code if applicable.
2. **Quality Gate Verification Before Tagging**:
   - Run linter: `npm run lint`
   - Run production build: `npm run build`
   - Run unit tests: `npm test`
   - Run E2E tests: `npx playwright test`
   - Ensure all checks pass with 0 errors before tagging.
3. **Log in AI_LOG.md Before Committing**:
   - Record the release entry in [`AI_LOG.md`](file:///Users/sadin/Project/TalingchanCountTracker/AI_LOG.md) BEFORE running `git commit`.
4. **Single Atomic Commit (CRITICAL - NO SEPARATE AI_LOG COMMITS)**:
   - Stage all code changes, `package.json`, and `AI_LOG.md` together:
     ```bash
     git add -A
     git commit -m "chore(release): vX.Y.Z - <short description>"
     ```
   - **STRICTLY FORBIDDEN**: Never create a standalone commit solely for `AI_LOG.md`.
5. **Git Tagging & Push**:
   - Create an annotated git tag matching the version format `vX.Y.Z`:
     ```bash
     git tag -a vX.Y.Z -m "Release vX.Y.Z - <short description>"
     ```
   - Push both commits and tags to remote in one go:
     ```bash
     git push origin main --tags
     ```

---

## 2. Shared Action Log (`AI_LOG.md`)

Every agent MUST maintain [`AI_LOG.md`](file:///Users/sadin/Project/TalingchanCountTracker/AI_LOG.md) in the project root.

### Format
```text
[YYYY-MM-DD HH:MM] LEVEL | AGENT | TOOL | description
```

### Rules
- One line per action, UTF-8, append-only (never overwrite or truncate).
- Log every Major action immediately after it completes.
- **Atomic Commits Only**: Always bundle `AI_LOG.md` changes into the same commit as the corresponding code or release changes.

---

## 3. Cloudflare Deployment Architecture (Workers Static Assets via wrangler.jsonc)

- **Domain**: `talingchan.tcgcount.com` (Worker Custom Domain on zone `tcgcount.com`)
- **Worker Service**: `talingchancounttracker`
- **Deploy Command**: `npm run deploy` (`npm run build && npx wrangler deploy`)
- **R2 Card Image CDN**: `https://pub-851c7b1da9514507a99b79bc2fd47577.r2.dev`
- **Binary Image Assets**: NEVER commit `public/card-images/` to Git. Card images are served via Cloudflare R2 CDN in production.
- **SPA Routing**: Configured natively via `wrangler.jsonc` (`not_found_handling: "single-page-application"`). Do not create `_redirects` as Workers Assets handles SPA rewrites natively.

---

## 4. Testing Policy: Automated E2E Only

Whenever verifying frontend features, bug fixes, or user flows:
1. **Automated Verification**: Use Vitest (`npm test`) and Playwright (`npx playwright test`).
2. **Headless Browser**: Run test suites in headless mode.

---

## 5. Thai Language Priority for UI Display (Mandatory Rule)

Whenever displaying text in user-facing UI:
- All card names, effects, mechanics, colors, and game rules must be displayed primarily in Thai.

---

## 6. Two-Track Architecture: Headless Logic Separation & Contract Lock (CRITICAL)

To prevent UI/styling changes from breaking business logic (and to stop AI agents from hallucinating completion), all work in this repository MUST follow these 4 rules:

### 6.1 Strict Separation of "Brain (Headless Logic)" vs. "Face (UI View)"
1. **Brain Layer (`src/store/`, `src/utils/`, `src/services/`, `src/types/`, `src/data/`):**
   - All game rules (50-card Main Deck, 5 unique LIFE cards, Cost payment to Hell Zone, Combat power math), state mutations, filtering, and Firebase sync MUST live here.
   - Every new rule or helper MUST have a corresponding unit test (`*.test.ts`) verified via `npm test`.
2. **View Layer (`src/components/**/*.tsx`, `src/index.css`):**
   - React components are strictly for rendering state from Zustand stores and dispatching actions.
   - **FORBIDDEN in `.tsx` files:** Complex deck validation math, raw Firestore queries, or inline data transformations that belong in `src/store/` or `src/utils/`.

### 6.2 Semantic Contract Lock (`data-testid` Preservation)
- Interactive elements tested by E2E suites carry explicit `data-testid` attributes (e.g., `btn-account-menu`, `nav-tab-playmat`, `life-count-player1`, `avatar-slot-player1-0`, `cost-payment-modal`, `combat-target-modal`, `card-detail-meme-lore`).
- **RULE:** When redesigning layouts, changing Tailwind classes, or refactoring components, you **MUST NEVER remove, rename, or break existing `data-testid` attributes**.

### 6.3 Scope Lock During UI / Styling Passes (`npm run scope:ui`)
- When the user asks to **restyle, polish UI, adjust layout, or fix responsive design**:
  1. You may ONLY edit `src/components/**/*.tsx` and `src/index.css`.
  2. You MUST NOT touch `src/store/`, `src/utils/`, `src/services/`, `src/types/`, `src/data/`, or any test files (`e2e/`, `*.test.ts`).
  3. Run `npm run scope:ui` (`node scripts/verify-scope.mjs ui-only`) to prove zero logic/test files were touched.

### 6.4 Independent Judge & 4-Layer Gate (`npm run gate`)
- **Builder vs. Judge Separation:** When fixing a bug or implementing a feature, **NEVER weaken, delete, or skip assertions in `e2e/*.spec.ts` or `src/**/*.test.ts`** just to make tests pass (`npm run scope:builder`).
- Before claiming any task is complete, you MUST run the full 4-Layer Gate:
  ```bash
  npm run gate
  ```
  which executes:
  1. `npm run lint` (`oxlint` — 0 warnings/errors)
  2. `npm run build` (`tsc -b && vite build` — strict TypeScript + bundle check)
  3. `npm test` (`vitest run` — unit tests for store, deck validator, tabletop helper)
  4. `npx playwright test` (E2E functional flows + `e2e/ui-guard.spec.ts` checking 0 console errors, 0 horizontal overflow, and font legibility >= 9px across all tabs)

