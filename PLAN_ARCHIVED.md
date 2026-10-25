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


---

## Archived 2026-10-25 — Stage 4: Voucher and hammer item

**Status: COMPLETED.** Implemented and verified according to the Stage 4 execution report in PLAN_FEEDBACK.md (version v. Stage 4-4f88949, footer v4-4f88).

## Active plan — Stage 4: Voucher and hammer item

Implement the first item system as an additive extension of the current game. This is a new major functional Stage, Stage 4. Limit scope to per-run item vouchers and the hammer; do not add magnets, fans, a shop, random drops, or other item types.

### Current implementation facts to preserve

- `game.js` owns score, game state, normal merges, cascade tracking, danger recovery, reset, and input handling.
- A normal merge calls `addScore()` before `noteCascadeMerge()`. Cascades are finalized after 600 ms, on a player drop, when superseded by another chain, or on a top-tier clear. The existing chain length counts merge events: a chain of length 2 displays `×2`, length 3 displays `×3`.
- `addScore()` changes the displayed/best score and checks the existing 1,500-point revive coin threshold. `addBonusScore()` changes score/best score without directly granting revive coins; it is used for cascade and danger-recovery bonus points.
- `landed` is not equivalent to currently resting: it remains true after first contact, including while a fruit can be bouncing. `contacts` is refreshed by physics substeps; the current speed threshold for avoiding bounce is 55 px/s.
- Merge removal currently marks both objects `dead`; `processMerges()` filters them from `state.balls`. There is no persistent constraint graph; contacts/merge lists are local to physics steps. Cascade continuation currently tests whether the previous generated fruit is merely `dead`, so removal cause must be distinguished before hammer removal is added.
- Stage 4 must preserve current score, revive coin behavior, cascade bonus, recovery reward, top-tier clear, and danger-line loss rules.

### A. Pre-implementation review

1. Trace all score-writing paths, including ordinary merges, the +500 top-tier clear, cascade bonus, and danger recovery bonus. Identify how each updates displayed score, best score, existing revive coins, and the new voucher progress counter.
2. Trace the complete cascade lifecycle, including merge creation, finalization timeout, a player drop, chain replacement, top-tier clear, and game over.
3. Trace `state.balls` creation/removal, draw order, collision sub-shapes, pointer coordinate conversion, and each input path that can currently drop a fruit.
4. Record the minimal Stage 4 implementation points and any test harness additions before editing. Preserve this audit in the Execution Agent's feedback report; do not create a separate mode or refactor unrelated physics.

### B. Voucher earning and per-500-point streak ledger

#### State and score accounting

- Vouchers are run-only, non-persistent, with a maximum balance of **2**. Reset voucher count, per-band streak records, score-progress bookkeeping, and milestone settlement state on `reset()`; reviving does not reset them.
- Check milestones at eligible score progress 500, 1,000, 1,500, 2,000, and every additional 500 points.
- Use a dedicated monotonic `voucherProgressScore` (or equivalent) so the new over-cap +100 payout can increase the visible score and best score without advancing voucher milestones. All existing score sources count toward voucher progress: ordinary merge score, the +500 top-tier clear, existing cascade bonus, and danger-recovery bonus. Only the new +100 over-cap payout is excluded.
- Keep existing revive coin behavior unchanged. Do not use voucher progress as a replacement for `state.score` or for existing revive coin accounting.

#### Combo event definition and attribution

- Count a combo only when an existing cascade is finalized. A chain of length 1 is not a combo. A finalized length-2 chain records one double combo. A finalized chain of length 3 or more records exactly one triple combo; a triple never also increments the double counter. Thus a length-4+ chain is one triple event, not several events.
- A highest-tier pair clear creates no fruit and is not a combo event; it closes any active cascade.
- Assign each finalized cascade to exactly one 500-point band: the band containing `voucherProgressScore` immediately before the first normal merge belonging to that cascade. Capture that start-band before the merge score is applied. A chain that crosses one or more milestones remains assigned to its original band and must never be copied into later bands.
- Maintain separate double/triple counts per band. A band qualifies at its milestone if it has either at least 3 double events or at least 2 triple events. Do not let counts from neighboring bands combine.
- No-combo events, length-1 merges, and top-tier clears do not add streak counts. They do not clear or move the current band's prior streak counts before that band's milestone is reached.

#### Milestone ordering and exactly-once behavior

- A score change that crosses multiple 500-point milestones queues each newly crossed node in ascending order. Each node is settled once using only the streak record of the band ending at that node, then that band's record is closed/discarded whether it qualified or not. Never retroactively award a missed band.
- A cascade's classification is not known until the cascade ends. If a score change crosses a milestone while a cascade is open, defer settlement of that crossed node until the cascade has been finalized and its one event (if any) has been assigned to its start band. This ensures one long cascade cannot qualify multiple bands.
- Resolve pending milestones when cascades finalize on timeout, a new drop, chain replacement, top-tier clear, or game over. Ensure any top-tier clear score is attributed and queued in a deterministic order relative to a cascade it closes.
- A qualifying milestone grants exactly one voucher while balance is below 2. If already at 2, award **+100 visible score** instead.
- The +100 over-cap payout must not increase `voucherProgressScore`, create a combo event, call milestone evaluation recursively, or cause another voucher payout. It may update current/best displayed score. Process the original milestone as settled before or atomically with its payout.
- A score award crossing multiple milestones evaluates each node independently, including multiple payouts in one resolution, and honors the cap at each node.

### C. Hammer item interaction

#### Eligibility and targeting

- The hammer can be activated only while at least one voucher is held and the game is active. It can target only a live fruit still present in `state.balls` that is marked `landed`, has physical contact in the most recent physics step (`contacts > 0`), and has speed `sqrt(vx² + vy²) <= 55 px/s` at validation time.
- The contact requirement excludes fruits still bouncing or flying even though their persistent `landed` flag is true. Revalidate eligibility at click time because physics continues while aiming.
- Hit-test the visible fruit shape using its rotated collision parts, not only its bounding circle. If eligible fruits overlap at the click point, select the topmost eligible fruit according to render order. Provide clear visual feedback for eligible targets; indicate that other fruits cannot be selected.

#### Mode flow

1. A clear hammer button displays the voucher balance, for example `道具券：1/2`. With zero vouchers it is disabled or clearly unavailable.
2. Activating it enters hammer targeting mode without pausing physics, cascade timers, or danger-line checks. Show a prominent mode cue and a cancel affordance.
3. In hammer mode, a valid target click performs a second validation, removes exactly that target, consumes exactly one voucher, updates the balance, and exits the mode.
4. Escape, the cancel affordance, or toggling the hammer button again exits without consumption. Clicking blank space or an ineligible target leaves the mode active (with a brief explanation) and consumes nothing, so the player can try another target or cancel.
5. During hammer mode, mouse/touch actions and Space/Enter/ArrowDown must never drop the pending fruit. Keyboard shortcuts for normal play must not leak through the item mode.
6. If the game ends, automatically cancel targeting before showing the existing game-over/revive flow. If the target is merged or otherwise removed before the click, reject the stale target without consuming a voucher.

#### Atomic removal and reward isolation

- Add or adapt one minimal removal helper that marks the selected fruit removed and removes it from `state.balls` synchronously. Since physics contact lists are step-local, ensure no persistent target references, cascade references, or per-fruit danger/recovery timers are left active.
- Record removal cause explicitly (for example, `removedBy = 'merge' | 'hammer'`). Cascade continuation must require merge consumption, not merely `dead === true`; hammer removal of the most recently generated cascade fruit must not masquerade as a merge or extend a chain. Allow any already-earned cascade to end through its normal timeout without adding a hammer-caused combo event.
- Hammer removal itself gives no merge score, combo count, cascade reward, revive progress, danger-recovery reward, or other event-only reward. Do not call `creditRecovery()` when removing a fruit with the hammer.
- Validate mode, voucher balance, membership, live state, landed/contact/speed eligibility before mutation. Consume a voucher only if the removal helper succeeds. JavaScript event handling is synchronous, but guard repeated pointer/click events and stale references so one action cannot remove twice or consume twice.

### D. UI and feedback

- Add the hammer button and voucher counter using current Pro styles and existing HUD sizing; do not redesign the HUD.
- In targeting mode, show an explicit instruction such as “选择一只静止的奶蛙，Esc 取消”. Provide hover/focus feedback for eligible targets and clear rejection feedback for blank/ineligible selections.
- Update the counter immediately after earning, over-cap payout, reset, successful use, or cancellation. No persistent inventory or shop UI is introduced.
- Keep all controls usable at 320 px and 390 px widths; do not let the button overlap score, title/help, or game board controls.

### E. Tests, regression, and version history

Add deterministic tests to a focused `stage4.test.js` (or extend the appropriate suite) covering:

- Milestones at 499/500/501, 999/1,000/1,001, multi-node score jumps, each node's exactly-once settlement, and new-run reset.
- Per-band independence and attribution using the eligible progress score immediately before a cascade's first merge; a chain crossing thresholds counts once only in its start band.
- Exactly one count for ×2; exactly one triple count for ×3 and ×4+; never a double count for a triple; chain length 1/top-tier clear not counted.
- Qualification at 3 doubles or 2 triples; no award below either threshold.
- Balance 0/1/2, successful voucher award, +100 over-cap payout, repeated over-cap milestones, and proof that +100 changes visible score but not voucher progress or recursive milestone state.
- Existing score sources (normal merge, top-tier clear, cascade bonus, danger recovery) advance voucher progress; existing revive coin and score/best behavior remains intact.
- Hammer target eligibility for landed/resting, moving, bouncing/no-contact, dead, removed, and stale targets; overlapping hit selection according to draw order.
- Successful use consumes one voucher and removes one target; blank click, ineligible click, cancel, no balance, game over, and stale target consume none; repeated events cannot double-consume.
- Hammer removal produces no score, revive coin, voucher progress, combo event, cascade reward, or danger-recovery reward; test removal of the active cascade fruit does not falsely continue a chain.
- Physics and danger-line timing continue during aiming; keyboard/touch inputs in hammer mode do not drop fruit; exiting returns to normal controls.

Run all existing self-checks plus Stage 4 tests: `physics.test.js`, `gameplay.test.js`, `name-filter.test.js`, `stage2.test.js`, `stage3.test.js`, and `stage4.test.js`. Smoke-check desktop and 320×568 / 390×844 layouts, and inspect console output. Do not claim browser checks unless actually performed.

For each substantive Stage 4 functional commit, append a concise entry to `VERSION_HISTORY.md` using the pinned single-hash rule and update the compact footer version (`v4-<first four hash characters>`) to that substantive commit. Documentation-only commits do not change version labels/history. Do not push unless the owner explicitly asks.

### Stage 4 scope boundaries

- Include only voucher earning, per-500-point combo tracking, capped overflow points, and the hammer.
- Do not add magnets, fans, a shop, random item drops, additional item types, online services, or a new mode.
- Prefer the smallest changes compatible with current code. If the audited cascade/score lifecycle cannot satisfy the stated ordering without materially changing existing behavior, stop and report the concrete conflict and smallest proposed adjustment before implementing that conflicting change.


---

## Archived 2026-10-25 — Stage 4 follow-up: Hidden grant shortcut and run-score exclusion

**Status: COMPLETED.** Implemented and verified according to the Stage 4 follow-up execution report in PLAN_FEEDBACK.md (version v. Stage 4-997b334, footer v4-997b).

## Active plan — Stage 4 follow-up: Hidden grant shortcut and run-score exclusion

Add a concealed, owner-approved shortcut to the existing game. This is a small follow-up within Stage 4, not a new Stage or game mode. Preserve normal play, the existing voucher cap, revive behavior, scoring, and the currently offline leaderboard.

### Confirmed owner decisions

- Clicking the existing game title repeatedly opens a concealed passphrase dialog; do not add a permanent button or disclose the entry in normal tutorial/help copy.
- The fixed passphrase is `hhh`. This is a client-side convenience gate only: anyone who inspects the public JavaScript can discover it; it must not be described as secure authentication.
- Each successful passphrase submission replenishes vouchers to **2/2** (never exceeds the existing cap) and adds **2 revive coins** to the current run.
- A successful use makes the **entire current run** ineligible for historical-best updates and leaderboard submission, including any record the run had already written before the shortcut was used. Keep the run tainted through revivals; clear the flag only when a genuinely new run starts.

### Implementation plan

1. Inspect the current title markup/event wiring, run reset and game-over lifecycle, all historical-best writes, revive coin mutations, leaderboard submission entry points, and existing modal/input protections. Reuse current modal and state patterns; do not alter unrelated gameplay.
2. Add a title-click counter with a short fixed time window (for example, seven deliberate clicks within two seconds); reset it when the window expires. Handle mouse, touch, and keyboard activation without double-counting a single gesture. The title remains visually unchanged and gains no obvious hint.
3. On threshold, open an accessible passphrase dialog. Support submit, cancel, Enter/Escape, focus management, and mobile keyboards. Invalid input gives a neutral failure message and changes no game state. Closing or opening the dialog alone does not taint the run.
4. On a correct passphrase, require an initialized run that has not reached terminal game over. Atomically set a run-level `runTainted`/equivalent flag, set vouchers to the existing maximum of 2, add exactly 2 revive coins, refresh both HUDs, and close the dialog. Do not add score, voucher progress, combo records, or other rewards. Repeated valid submissions during the same run may replenish vouchers to 2 and add another 2 revive coins each time; the run stays tainted. This shortcut must not bypass any other item cap or create persistent inventory.
5. Prevent historical-best contamination for the whole run. Capture the historical best at run start (or equivalent reliable baseline); if this run already raised and persisted the best before the first successful shortcut use, restore the pre-run historical value without erasing a higher record unrelated to this run. After tainting, all score-update paths must continue updating the live run score and ordinary end-of-run summary but must not update `state.best`, the best-score DOM/localStorage record, or any future historical-best backend. Keep the prior historical best visible/accurate.
6. Gate every leaderboard submission path on the run-taint flag, even though the leaderboard is currently offline. A tainted run must never be sent if online leaderboard support is enabled later. Keep the existing leaderboard placeholder and source files unchanged otherwise; do not make network requests.
7. Make the end-of-run summary explain that this run used the shortcut and was excluded from records. Do not imply the user's personal score was erased: only historical best and leaderboard eligibility are excluded. On a new run, clear the taint and capture a new historical-best baseline; revival within the same run must not clear it.
8. Keep the modal safe from gameplay input leakage: opening it must not drop a fruit through the overlay; while it is open, normal drop keys/pointer actions must not affect the board. Closing it restores the prior input behavior.

### Tests and acceptance

Add focused deterministic tests (extend an appropriate suite or create `stage4-followup.test.js`) for:

- Title gesture threshold, timeout reset, single-gesture mouse/touch handling, dialog open/cancel, valid and invalid passphrase.
- Successful use fills vouchers to 2 from balances 0/1/2, adds exactly 2 revive coins, permits a second valid use without exceeding 2 vouchers, and grants no score/progress/combo reward.
- Failed/cancelled use leaves all state unchanged; use after terminal game over is rejected.
- A run that had not beaten the historical best never updates it after tainting; a run that beat it before tainting restores the pre-run best; later scoring cannot rewrite it. Live score and the run summary remain correct.
- Taint persists through revival and clears only on a new run.
- Every leaderboard submit path rejects a tainted run; the offline placeholder remains network-silent.
- Dialog interactions do not leak pointer, touch, Enter, Space, Escape, or arrow-key actions into fruit dropping; normal controls work after close.
- Existing Stage 4 voucher, hammer, revive, game-over, and regression tests continue to pass.

Run the focused tests and existing project self-check suites; report commands and actual results in `PLAN_FEEDBACK.md`. Do not claim browser checks unless performed. For a substantive functional commit, follow the pinned Stage 4 single-hash version-history/footer rules. Do not push unless the owner explicitly asks.

### Scope boundaries

- This follow-up adds only the concealed voucher/revive grant and whole-run record exclusion.
- No new game mode, store, additional item, online service, public cheat button, or change to normal voucher/revive earning rules.
- Do not claim the passphrase is confidential or tamper-proof in this public client-side repository.
- If the existing best-score write lifecycle cannot safely roll back only this run's contribution, stop and report the concrete conflict and smallest safe approach before changing it.
