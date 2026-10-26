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
