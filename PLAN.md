# Gameplay Additions Roadmap

## Product direction

Extend the existing fruit-drop, physics, merge, and survival loop with additive content. Keep the current single-board rules, controls, and progression recognizable. Do not introduce a separate game mode or replace the core loop as part of this plan.

## Existing foundation

- Aim and drop fruit; matching tiers merge into the next tier.
- Merges award tier-based score. The highest-tier pair clears both fruits for 500 points and one revive coin.
- A landed fruit that remains above the danger line and nearly still for 1.5 seconds ends the run.
- Every 2,000 points grants a revive coin. Spending one clears the highest fruit and any fruit still above the danger line, then resumes play.
- Current fruit, next fruit, merge chain, score, best score, sound toggle, and recent-score leaderboard are already present.

## Proposed additions

### P1 — Merge-chain bonus

Detect a single uninterrupted cascade where a newly created fruit immediately merges again. Show the chain count and award a modest bonus for genuine consecutive merges. Define cascade boundaries explicitly so ordinary unrelated merges do not count. Tune the reward so it supplements merge score without dominating it.

**Player value:** Rewards planning placements that create cascades and makes successful merges easier to read.

### P1 — Merge discovery collection

Track which fruit tiers the player has merged into at least once. Show discovered tiers in the existing merge-chain display and retain this collection locally between runs. Keep collection progress cosmetic; it must not affect physics, spawn odds, or score.

**Player value:** Gives players a lightweight long-term goal and makes the existing merge chain feel like progress.

### P1 — Run highlights and statistics

Track a small set of run metrics: highest cascade, highest tier reached, number of top-tier clears, danger recoveries, and revives used. Present them on the existing end screen without displacing the score, best score, or leaderboard flow.

**Player value:** Makes each run memorable even when it does not place on the leaderboard.

### P2 — Danger-line recovery reward

Recognize a danger event that resolves before its per-fruit timer expires, such as the fruit falling below the line or merging away. Award a small, capped recovery bonus or include it in run highlights. Prevent deliberate danger-line farming by limiting repeated rewards and requiring a meaningful recovery.

**Player value:** Turns a tense near-loss into a readable moment of skill.

### P2 — Drop-direction finesse

Add an optional, small left/right impulse at release, accessible through keyboard controls and clear touch affordances. Keep the existing aim position as the primary control and make the impulse subtle enough that it cannot replace aiming.

**Player value:** Adds a little control for threading gaps while preserving the familiar drop mechanic.

### P3 — Revive choice

At the existing revive prompt, offer the current rescue as the default and consider one higher-cost option that clears a wider area. Keep the choice compact and explain the cost before the player commits.

**Player value:** Gives a revive a small strategic decision while reusing the existing recovery flow.

## Suggested sequence

1. Define cascade detection and add run-stat tracking; show a concise end-of-run summary.
2. Add locally saved merge discovery to the current merge-chain display.
3. Tune and add a modest cascade bonus after the cascade rules are clear.
4. Explore the danger recovery reward with anti-farming limits.
5. Prototype the small directional impulse; retain it only if it improves control without making placement trivial.
6. Consider the revive choice after observing how often players hold or spend revive coins.

## Scope and design guardrails

- Add to the current board, inputs, merge chain, and revive/end-screen flows.
- Avoid adding a separate mode, new core loop, or a large inventory of consumable powers in this roadmap.
- Keep optional assists understandable and usable on both desktop and touch screens.
- Keep progression cosmetic unless a future balance review explicitly changes that decision.
- Preserve the danger-line rule as the sole loss condition unless a separately reviewed design decision changes it.
- Review `README.md` against the actual `v1/` implementation before publishing gameplay changes; the README currently describes some older behavior and file locations.

## Open design decisions for implementation planning

- Whether the cascade bonus grants score only or also contributes to revive progress.
- The persistence format and reset controls for the discovery collection.
- Which run statistics fit the end screen without making it crowded on narrow screens.
- Input mapping and maximum impulse for directional finesse.
- The cost and exact clear radius of a second revive choice.

## Repository layout migration plan

### Goal

Make the repository root the canonical location for the playable game, rather than serving the game from `v1/`. Preserve a working site throughout the change and keep generated assets, tools, tests, and documentation pointed at one consistent layout.

### Current layout to account for

- Root `index.html` is a redirect to `./v1/`; it is not the game page.
- `v1/index.html`, `v1/game.js`, `v1/style.css`, `v1/leaderboard.js`, `v1/leaderboard.min.js`, and `v1/sponsor.js` are the active application files.
- `v1/assets/` contains the active fruit assets and sponsor QR image.
- `src/` contains source fruit images and should remain at the root.
- `tools/` contains asset-generation scripts and should remain at the root.
- Tests are at the root, but they do not all resolve application files the same way.
- `README.md` describes several active files as if they already live at the root.
- Asset scripts use mixed output/input roots: some write to `v1/assets/fruits`, while others expect root `assets/fruits` and root `game.js`.

### Migration steps

1. **Inventory references before moving files.** Search the repository for `v1/`, `./v1/`, `v1\\`, hard-coded `os.path.join("v1", ...)`, and page-relative asset paths. Record every reference in HTML, JavaScript, Python, tests, and docs.
2. **Move the active app to the root.** Move `v1/index.html`, `game.js`, `style.css`, `leaderboard.js`, `leaderboard.min.js`, `sponsor.js`, and `v1/assets/` into the corresponding root locations. Keep `src/`, `tools/`, tests, and root-level project metadata where they are.
3. **Resolve duplicate and legacy files deliberately.** Compare `v1/fd46d3bf08af562b46f4afcdd8134ffc.txt` with the root copy before removing the duplicate. Do not blindly delete `v1/` until all needed files are moved and references are updated. Check whether any remaining files under `v1/` are intentional historical artifacts; either retain them with a clear purpose or remove them as part of the migration.
4. **Replace the redirect with the real game page.** The root `index.html` should become the former `v1/index.html`. Remove the redirect logic and update canonical URL/metadata if needed. Relative references such as `style.css`, `game.js`, and `assets/...` should resolve from root after the move.
5. **Normalize all asset scripts to the root layout.** Update `tools/normalize_assets.py` and `tools/build_parts.py` output paths from `v1/assets/fruits` to `assets/fruits`. Verify `tools/optimize_sprites.py` and `tools/make_blur.py` resolve `game.js` and `assets/fruits` from the repository root. Keep the source-image input at root `src/`.
6. **Normalize test fixtures and loaders.** Update `physics.test.js` to load root `game.js` and `assets/fruits/parts.js`. Confirm `gameplay.test.js` paths match the same layout, and inspect other test scripts for `v1/` references. Keep tests at root unless a separate test-directory design is explicitly chosen.
7. **Update documentation and deployment instructions.** Revise the README file table, asset paths, local-run steps, and Pages instructions so root is consistently described as the app root. Remove references to the old `/v1/` URL unless they are needed as a historical redirect note.
8. **Check repository references and tracked outputs.** Search again for stale `v1/` application paths. Confirm expected generated files (`parts.js`, `blur.js`, optimized sprites) are present at their new paths and no unintended duplicates remain.
9. **Verify the migrated application.** Run the existing physics and gameplay self-check scripts. Open the root `index.html` through a local static server and confirm fruit images, sound toggle, leaderboard/sponsor dialogs, and mobile layout load. Also confirm `file://` behavior if it remains a documented use case.
10. **Review the resulting diff.** Ensure the change is a path/layout migration, with gameplay behavior unchanged. Confirm the root page is the only intended production entry point and GitHub Pages can continue publishing from the repository root.

### Migration acceptance criteria

- Opening the repository root serves the game directly; no redirect to `/v1/` remains.
- Runtime files and assets load from root-relative paths.
- All asset tools generate/read files from the same root layout.
- Existing tests load the root game and root assets consistently.
- README, test instructions, and GitHub Pages guidance match the actual layout.
- No required production file remains stranded under `v1/`.
- The migration does not intentionally change gameplay rules or balance.
