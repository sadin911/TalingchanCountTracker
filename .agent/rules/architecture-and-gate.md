---
description: Two-Track Architecture (Brain vs View Separation), Semantic Contract Lock, and 4-Layer Verification Gate for TalingchanCountTracker
---
# TalingchanCountTracker — AI Engineering Rules

Always follow [`AGENTS.md`](file:///D:/project/01_Projects/TalingchanCountTracker/AGENTS.md), plus these operational constraints:

1. **Brain vs. View Separation:**
   - Put all state, game mechanics, deck validation, and sync logic inside `src/store/`, `src/utils/`, or `src/services/` with unit tests (`*.test.ts`).
   - Keep `src/components/**/*.tsx` strictly for presentation and wiring to Zustand hooks.

2. **Semantic Contract Lock (`data-testid`):**
   - Never remove or rename existing `data-testid` attributes on buttons, modals, playmat zones, or cards when editing `.tsx` files.

3. **Scope Lock (`npm run scope:ui` / `npm run scope:builder`):**
   - If the task is UI styling / layout / responsive polish: edit ONLY `src/components/**/*.tsx` and `src/index.css`, then verify with `npm run scope:ui`.
   - If the task is fixing application bugs: never weaken or delete tests in `e2e/` or `src/**/*.test.ts` (`npm run scope:builder`).

4. **Mandatory 4-Layer Gate (`npm run gate`):**
   - Never claim a task is finished without running `npm run gate` (`npm run lint && npm run build && npm test && npx playwright test`), which includes [`e2e/ui-guard.spec.ts`](file:///D:/project/01_Projects/TalingchanCountTracker/e2e/ui-guard.spec.ts) (0 console errors, 0 horizontal overflow, and legibility guard >= 9px).
