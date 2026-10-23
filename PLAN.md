# Repository Migration and Gameplay Additions Plan

## Execution contract

This plan has two separately authorized stages.

1. **Stage 1 — Repository layout migration and site cleanup.** Complete only the repository, routing, documentation, tooling, tests, and leaderboard placeholder work specified below. When Stage 1 is complete, stop and report the diff and verification results. Do not start Stage 2 until the owner explicitly authorizes continuation.
2. **Stage 2 — Additive gameplay updates.** Start only after explicit owner authorization following Stage 1 review. Implement the features in the sequence below without creating another mode or replacing the existing core loop.

Do not combine the stages into one implementation or one commit. Keep each stage reviewable and commit only files belonging to that stage.

## Project identity and public links

- The canonical repository is the owner's fork: `https://github.com/tianyimc/BigNaiWa-Pro` (`origin`, branch `main`). Use this repository identity in repository documentation and project references.
- Remove direct-play URLs and claims that the game is currently playable online from the README and page metadata. Do not substitute another live game URL. Local instructions remain appropriate.
- Do not assume that pushing `origin/main` publishes a website. The deployment source is not established by this plan.
- Preserve attribution to the upstream projects already listed in the README. At the end of the README, add a clear attribution naming the original author/maintainer as `Tianyimc` and the canonical repository above. Do not imply that the upstream references authored this repository's original implementation.

## Stage 1 — Repository layout migration and site cleanup

### Objective

Move the active game from `v1/` to the repository root, make root `index.html` the real game page, and align paths and documentation. Keep an intentional compatibility page at `/v1/` that redirects visitors to the root game.

### Current layout

- Root `index.html` currently redirects to `./v1/`.
- `v1/index.html`, `v1/game.js`, `v1/style.css`, `v1/leaderboard.js`, `v1/leaderboard.min.js`, `v1/sponsor.js`, and `v1/assets/` are the active game and assets.
- `src/`, `tools/`, tests, and project documentation are already at the repository root.
- Tests and asset scripts use mixed root and `v1/` paths. The gameplay test currently expects root game/assets and does not match the checked-in layout.

### Required changes

1. Inventory references to `v1/`, `./v1/`, `v1\\`, and page-relative application/assets paths across the repository.
2. Move the active game page, JavaScript, CSS, leaderboard files, sponsor file, and `v1/assets/` contents to corresponding root locations. Preserve the root `src/`, `tools/`, tests, and metadata.
3. Replace root `index.html` with the current actual game page. Update page metadata to remove online-play claims and stale canonical URLs. Keep relative references valid from root.
4. Leave `v1/index.html` as a small, intentional compatibility redirect to `../` (preserving query string and hash where practical). Keep the verification text file under `v1/` only if required for the existing verification path; also retain the root copy. Remove other duplicate `v1/` files once confirmed unnecessary. The acceptance criterion is that no active application files remain under `v1/`, except this redirect and any intentionally retained verification artifact.
5. Update `tools/normalize_assets.py` and `tools/build_parts.py` to write to root `assets/fruits/`. Anchor all four asset scripts to the repository root derived from `__file__`, including their reads of `src/`, `game.js`, and fruit assets, so invocation works from any current directory.
6. Update all test loaders to read root `game.js` and root `assets/fruits/`. Inspect `physics.test.js`, `gameplay.test.js`, and `name-filter.test.js`; ensure each points to actual files and the existing behavior is covered.
7. Update the README's project structure, paths, local run instructions, test commands, and repository links. Remove direct online-play links. Preserve the existing upstream reference list and append the owner/original-author attribution at the end.
8. Check all moved runtime assets are present at root: `parts.js`, `blur.js`, all 11 WebP sprites, PNG sources, and the sponsor QR asset. Preserve the files and verify the move did not alter their bytes.
9. Do not silently drop leaderboard functionality files. Keep `leaderboard.js` and `leaderboard.min.js` in the repository, but disable all leaderboard network reads, writes, automatic score submissions, and retry behavior for now. The leaderboard buttons should still open the existing dialog (or a compact placeholder dialog) and display exactly: **“正在完善中，敬请期待”**. Keep a clear path to re-enable the feature later. Do not delete leaderboard source or generated files.
10. Resolve stale leaderboard build instructions while preserving the files: remove or correct references to the missing `tools/minify-leaderboard.py`; do not create a minifier as part of this stage.
11. Refresh `preview.png` only if the existing screenshot materially misrepresents the post-migration page; this is a documentation asset, not a gameplay feature.
12. Review the diff to confirm Stage 1 has not changed gameplay mechanics. No production deployment or publication is authorized by this plan.

### Stage 1 verification and acceptance

- Root `index.html` opens the game directly; `/v1/` redirects to root.
- No stale live-play URL or canonical URL to the former site remains in page metadata or README.
- README identifies `tianyimc/BigNaiWa-Pro`, provides local run guidance, and ends with the requested author/repository attribution.
- Leaderboard UI displays the placeholder and produces no network requests, score submissions, or reads; leaderboard source and minified files remain in the repository.
- All runtime assets exist at root and load through correct relative paths.
- Asset scripts resolve their inputs and outputs from the repository root regardless of working directory. If Python dependencies are unavailable, report that limitation; do not install dependencies without authorization.
- All three existing Node self-check scripts (`physics.test.js`, `gameplay.test.js`, `name-filter.test.js`) pass.
- Smoke-check root page layout, fruit rendering, sponsor dialog, and leaderboard placeholder at desktop and narrow mobile widths.
- The only intentional `v1/` runtime artifact is the compatibility redirect, plus the verification file if its old path must remain valid.
- Stop after reporting Stage 1 results. Wait for explicit owner authorization before Stage 2.

## Stage 2 — Additive gameplay updates (requires separate authorization)

### Product direction

Extend the existing fruit-drop, physics, merge, and survival loop. Do not introduce a separate mode, new core loop, or unrelated inventory system. Preserve current controls and loss condition except for the narrowly scoped optional finesse input described below.

### Feature 1: Cascade detection and run statistics

Implement this first because other proposed features depend on these events.

- A normal merge creates the next-tier fruit. It extends the current cascade only if that exact newly created fruit is consumed by another merge within **600 ms**, with no player drop occurring between the two merge events.
- The first merge starts a cascade of length 1. Each qualifying subsequent merge increments it. An unrelated merge starts a separate cascade at length 1.
- A highest-tier pair clear creates no fruit; it ends any active cascade and is not counted as a cascade merge. It still increments the top-tier-clear statistic.
- Track per run: highest cascade length, highest tier reached (include starting fruit tiers when dropped), top-tier pair clears, danger recoveries, and revives used.
- Display these five values as a compact two-column summary on the existing game-over panel, between the best-score row and submission/placeholder area. Preserve score, best score, restart, sponsor, and leaderboard entry points. Confirm the layout at 320×568 and 390×844.
- Reset all run statistics at new game; update them only from authoritative gameplay events, not rendering.

### Feature 2: Merge discovery collection

- Record a tier as discovered the first time the player creates it by merging two fruits into that tier. Reaching tier 10 through two tier-9 fruits counts.
- Persist discovered tier indexes in `localStorage` under `danaiwa.discovery.v1`; validate stored data and tolerate malformed or unavailable storage.
- Show undiscovered tiers as silhouettes in the existing merge-chain display. Revealed fruit appearance follows the existing art. Do not change spawn odds, physics, score, or revive progress.
- Discovery persists across runs and is separate from run statistics. Do not add a reset control in this release.

### Feature 3: Cascade feedback and bonus

- When a cascade ends (no qualifying continuation within 600 ms, or a player drop begins), show a concise chain count near the final merge. Cap displayed text at `×5+` while retaining the actual maximum in statistics.
- Award `min(cascadeLength - 1, 5) × 5` bonus points for cascades of length 2 or more (maximum +25). A length-1 merge receives no cascade bonus.
- Cascade bonus points must not grant revive coins. Implement the score award so it updates score/best score but bypasses the ordinary 2,000-point revive grant path. Ordinary merge points retain current revive behavior.
- The top-tier pair clear remains +500 and grants its existing revive coin; it is not cascade-bonus eligible.

### Feature 4: Danger recovery tracking and reward

- A recovery is credited to the same fruit only after its danger timer reaches at least 0.5 seconds, then that fruit either falls below the danger line or is consumed by a merge while the run remains active.
- Count no more than three recoveries per run. Add +30 score per credited recovery, but route it through a score path that does not grant revive coins. Show a small recovery cue and increment the run statistic.
- A fruit that merely passes above the line while moving, without accruing 0.5 seconds of danger time, is not a recovery. A single fruit can be credited only once.
- Add boundary checks for 0.49/0.50 seconds, fruit falling below the line, merge removal, duplicate credit prevention, and the three-recovery cap.

### Feature 5: Optional drop-direction finesse

- Keep current `←/→` and `A/D` aim movement unchanged. Add keyboard finesse with `Shift+←` and `Shift+→` while not typing in an input.
- On touch, use the final 120 ms horizontal flick velocity of the existing aim drag as the finesse input. Show a small left/right cue before release so the effect is understandable.
- Clamp horizontal release velocity to ±60 px/s; retain the current 130 px/s downward velocity. A neutral or slow release has zero horizontal impulse.
- Apply the impulse only when the fruit is dropped; do not alter aim position or move already-dropped fruit by user input.
- Keep behind a simple feature flag during tuning. Retain it only if pointer/keyboard usability remains clear and controlled; if it degrades aiming precision, remove the feature before release rather than expanding its strength.

### Feature 6: Revive choice

- Preserve the current one-coin rescue: spend 1 coin, remove the highest fruit and every fruit still above the danger line, clear danger timers, and resume.
- Add a wider rescue costing 2 coins: remove the three highest fruits and every fruit still above the danger line, then resume. Each fruit is removed once even if it meets both criteria.
- Show both choices in the existing revive prompt with the cost visible on each button. Disable the wider rescue when fewer than 2 coins are available and explain the required balance. Keep “give up” available.
- Track a revive use once per successful choice, not once per removed fruit. Update the revive statistic after successful consumption only.
- Keep the screen usable at 320 px width and add tests for 0, 1, and 2+ coins, overlapping clear criteria, and successful continuation.

## Stage 2 sequence, tests, and review

1. Add cascade event tracking and run statistics, with tests for timing, player-drop boundaries, unrelated merges, and top-tier clears.
2. Add persisted merge discovery and silhouette rendering, with storage and tier-10 discovery tests.
3. Add cascade display and score bonus, verifying the bonus never grants revive coins.
4. Add danger recovery tracking/reward, including anti-farming boundary tests.
5. Prototype directional finesse behind a flag and inspect both keyboard and touch behavior. Remove it if it harms precise aiming.
6. Add the two-cost revive choice and its narrow-screen behavior.

For each feature, update the existing Node self-check suite with observable behavior and edge-case assertions. Keep tests deterministic by controlling time and input events; do not rely on arbitrary wall-clock sleeps. After each feature, review the resulting UI on desktop and narrow mobile widths. Keep Stage 2 changes separate from the completed Stage 1 commit and report any deviations from the specified behavior.

## Non-goals

- No separate game mode or replacement of the fruit merge loop.
- No landing-path or landing-point preview.
- No online leaderboard connection during Stage 1; retain its files and show the placeholder only.
- No online deployment or public launch without a separate explicit request.
