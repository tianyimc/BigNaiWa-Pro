# Archived Plans

## 2026-10-25 — Repository migration and Stage 1–3 plan (completed)

The repository migration, Stage 2 gameplay additions, and Stage 3 product updates have been implemented and owner-tested. This is the completed plan snapshot. Its historical instructions are retained for context and are superseded by the pinned rules and active task in `PLAN.md`.

### Archived plan snapshot

# Repository Migration and Gameplay Additions Plan

## Execution contract

This plan records completed work and the next planned stage.

1. **Stage 1 — Repository layout migration and site cleanup.** Completed.
2. **Stage 2 — Additive gameplay updates.** Implemented in the current repository; keep its documented feature specs as the behavior reference.
3. **Stage 3 — Product identity, tutorial, revive economy, and sponsor removal.** Planned below; do not begin until the owner authorizes it.

Keep each stage reviewable and commit only files belonging to that stage.

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

## Review response: `PLAN_FEEDBACK.md` and Stage 1 check

This section responds to the post-execution review. The earlier feedback sections that describe the pre-migration layout are historical context; the outcomes below describe the current repository. Stage 2 has since been implemented; Stage 3 is the next planned work and requires owner authorization.

### Rechecked in the current checkout

- `node physics.test.js`: **PASS**.
- `node gameplay.test.js`: **PASS**, 47 passed / 0 failed.
- `node name-filter.test.js`: **PASS**, 33 passed / 0 failed. The suite checks that the default leaderboard UI is offline and shows the placeholder; it also explicitly enables online behavior in an isolated test case to retain regression coverage.
- Root assets: **PASS** inventory check — 11 WebP sprites, 11 PNG sprites, `parts.js`, `blur.js`, and `assets/sponsor-qr.jpg` are present.
- Compatibility route: `v1/index.html` exists. The feedback records a browser check that `/v1/?x=1#h` reaches `/?x=1#h`.
- Asset tooling paths: root anchoring is implemented in all four scripts. The feedback records successful syntax/static-path checks and parser checks. Full asset regeneration remains unverified because NumPy and Pillow are unavailable; do not install them as part of this plan without separate authorization.
- Repository links: README and root page identify `tianyimc/BigNaiWa-Pro`; no former live-play URL was found in those files during the current check. The deployment source remains unknown, and no deployment is part of this plan.

### Feedback decisions and remaining follow-ups

1. **Workstream sequencing:** accepted and completed as specified: Stage 1 preceded Stage 2. Stage 2 must remain paused until the owner authorizes it.
2. **Root-anchored tools and generated assets:** accepted and implemented. The existing runtime asset inventory is complete; regeneration has not been proven without the missing Python packages.
3. **Leaderboard build source:** keep both `leaderboard.js` and `leaderboard.min.js` as requested. They are currently hand-synchronized because the referenced minifier does not exist. Treat them as a known maintenance risk; do not remove either file or add a build dependency in this plan. Any future edit to leaderboard behavior must update and test both files.
4. **Verification-file duplicate:** keep the root verification file and the copy under `v1/` while the compatibility path may still be used. The only intended contents under `v1/` are its redirect and that verification file.
5. **Preview image:** the feedback confirms `preview.png` predates the revive chip and merge-chain note, so it is stale. Refresh it as a small documentation-only follow-up before claiming the repository presentation is fully current; do not mix that asset update into gameplay changes.
6. **Line endings:** the feedback confirms existing CRLF blobs conflict with the declared LF policy. This is not a functional Stage 1 failure, but it can create noisy future diffs. Before Stage 2 edits, choose one repository-wide policy and make any normalization a standalone commit. Do not combine `git add --renormalize .` with functional work.
7. **Deployment:** remain explicitly unverified. The current plan removes direct-play claims and does not deploy. Local implementation and tests do not depend on resolving which GitHub Pages source, if any, is active.
8. **Gameplay detail and acceptance tests:** addressed in the Stage 2 feature specifications and test sequence above, including the 600 ms cascade boundary, bonus/revive interaction, discovery persistence, recovery cap, directional input limits, revive costs, mobile layout, and edge cases.
9. **Review screenshots:** visual smoke checks are required for the specified viewport sizes, but screenshots need not be committed unless the owner requests them. Refreshing the public preview image is handled separately under item 5.

### Stage 1 status

The gameplay and path self-checks pass, the current root asset inventory is complete, and the reviewed migration behavior matches the intended layout. Remaining items are documentation/maintenance follow-ups (stale preview and line-ending policy) and environment/deployment limitations (asset regeneration dependencies and unknown hosting source); they are not failures of the tested gameplay runtime. Keep these follow-ups visible and do not infer deployment success from a Git push.

## Stage 3 — Product identity, tutorial, revive economy, and sponsor removal

This is the next additive update after the implemented Stage 2. Keep the existing board, physics, merge chain, and single-player run flow. Do not begin Stage 3 until the owner authorizes it.

### 1. Remove sponsor functionality

- Remove the settlement-screen “可以赏作者一包辣条嘛” button and sponsor dialog from `index.html`.
- Remove sponsor event wiring and the sponsor script include. Remove `sponsor.js`, sponsor-only CSS, and `assets/sponsor-qr.jpg` if no other code or documentation uses them.
- Remove sponsor-specific documentation and stale references. Do not replace the sponsor button with another monetization prompt.
- Acceptance: no sponsor button, modal, QR image, sponsor script, or sponsor-only styling remains in the app; restart, leaderboard placeholder, and game flow still work.

### 2. Change revive coin earning threshold

- Change the score threshold for earning one revive coin from 2,000 to **1,500 points**.
- Preserve cumulative and cross-threshold behavior: each newly crossed 1,500-point boundary grants exactly one coin. A score increase crossing multiple boundaries grants all newly reached coins once. The top-tier clear's separately granted revive coin remains unchanged.
- Update all player-facing instructions and documentation that state the old threshold.
- Acceptance tests: 1,499 points grants none; 1,500 grants one; 1,501 does not duplicate; 3,000 grants two total; a single score award crossing multiple thresholds grants the correct total; resetting a run resets the issuance counter.

### 3. Rename the game and add a tutorial dialog

- Change the visible game heading from **“合成大奶蛙”** to **“合成大奶蛙Pro”**. Update the browser title and relevant accessibility labels consistently.
- Add a compact square `?` button aligned to the right side of the title row. Give it an accessible name such as “玩法教程”; ensure it does not crowd or overlap the title on narrow screens.
- Clicking the button opens a tutorial dialog with a close button, keyboard accessibility, Escape-to-close, and sensible focus return. Follow existing modal conventions for backdrop behavior.
- Teach basic controls: mouse aiming/click-to-drop; touch drag-to-aim/release-to-drop; current/next fruit preview; keyboard arrows/A-D, Space/Enter, and R; same-tier merges; the danger line and loss rule.
- Explain current Pro features accurately: cascade timing and bonus, merge discovery, run statistics, danger-line recovery points/cap, directional finesse (`Shift+←/→` and touch flick), and both revive choices and costs. State the earning rate as one revive coin per 1,500 score.
- Keep tutorial copy concise and segmented. Allow scrolling on small screens. Opening or using the tutorial must not trigger game controls or drop a fruit. Do not add a tutorial level or a new game mode.
- Acceptance: the help button opens the dialog; close button, Escape, and focus behavior work; copy matches the implemented mechanics; the dialog fits 320×568 and 390×844 without horizontal overflow; interacting with the tutorial never drops a fruit.

### 4. Add owner and original-author links at the page bottom

- Add a small footer at the bottom of the page with two clearly labeled external links:
  - **我的仓库 / Tianyimc:** `https://github.com/tianyimc/BigNaiWa-Pro`
  - **原作者 / YHSome:** `https://github.com/YHSome/BigNaiWa`
- Use safe new-tab links (`target="_blank"` and `rel="noopener noreferrer"`) with meaningful accessible labels. Do not add a live game URL.
- Clarify that this repository is the Pro fork/continuation and that the original repository is by YHSome; do not imply that the original author created the Pro additions.
- Acceptance: both links target the exact repositories above, are visible at the bottom on desktop and mobile, and do not cause horizontal overflow or obscure the board.

### Stage 3 implementation order and regression checks

1. Remove sponsor UI, assets, code, and documentation references.
2. Change the revive threshold and all related copy; add boundary tests.
3. Update the title and implement the accessible tutorial dialog with copy checked against actual mechanics.
4. Add the two repository attribution links at the page bottom.
5. Run all four existing Node self-checks (`physics.test.js`, `gameplay.test.js`, `name-filter.test.js`, and `stage2.test.js`), plus any tutorial test added for this stage. Smoke-check tutorial, revive prompt, and footer at 320×568, 390×844, and desktop width. Confirm Stage 2 behavior and the offline leaderboard placeholder remain intact.
6. Review the diff for removed sponsor references and outdated 2,000-point instructions. Keep the work separate from prior stages.

---

## 2026-10-25 — README license wording and feedback archival (completed)

The Execution Agent completed this maintenance task in commit `154caed`. The README now contains the owner-provided license wording, and resolved feedback was moved to `PLAN_FEEDBACK_ARCHIVED.md`; unresolved feedback remains active. The owner requested this plan snapshot be archived. The pinned operating rules remain only in the active `PLAN.md` and are intentionally not copied here.

### Completed task snapshot

Replace the README license-section wording with this exact Chinese text:

> 仅供学习娱乐，不得以此盈利。由于原作者（YHSome）未在其仓库声明开源许可证，本仓库亦无法声明开源许可证，如有侵权，请联系解决。

Keep the existing README heading. Do not add a license file or modify unrelated README or application files. As part of execution, archive only resolved/closed feedback in `PLAN_FEEDBACK_ARCHIVED.md`, keeping unresolved feedback in `PLAN_FEEDBACK.md`.

Acceptance was verified in commit `154caed`: the exact sentence appears in the README, and the execution report records the feedback archive housekeeping.

---

## 2026-10-25 — Create substantive version history (completed)

The Execution Agent created `VERSION_HISTORY.md`, reconstructed the Stage 1–3 substantive update history, and updated the project version labels. The owner then revised the version format; the current rules are maintained in the pinned section of `PLAN.md`. The original two-hash requirements below are retained only as a historical snapshot and are superseded.

### Completed plan snapshot (original requirements)

- Create `VERSION_HISTORY.md` with concise summaries for past substantive functional updates, including Stage 1, Stage 2, and Stage 3. Exclude pre-Stage history and all documentation-only, plan-only, feedback-only, or other nonfunctional commits.
- Use the substantive commit's short hash to identify each history entry. The original plan used a two-hash format; this was later replaced by the owner-approved single-hash rule in the pinned section of `PLAN.md`.
- Add a format explanation to the history file and maintain it for future substantive functional updates.
- Do not change gameplay or UI as part of the history-file task.

### Completion evidence

- `VERSION_HISTORY.md` exists and contains the substantive Stage 1–3 history.
- Follow-up commits `d089f4d` and `3a926d3` implemented the owner's single-hash naming rule and synchronized the version history/page footer. The stale plan wording was identified in feedback and corrected in the pinned rules afterward.
