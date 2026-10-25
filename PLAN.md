# Active Plan

## Pinned operating rules — do not archive this section

This section is durable project guidance. It stays at the top of `PLAN.md` and must never be moved to `PLAN_ARCHIVED.md`, even when all active tasks are complete. The ownership rules below apply only to the four coordination files named here; they do not restrict normal project-file edits required by an authorized plan.

### Agent file ownership

- **Planning Agent — coordination files:** may write only `PLAN.md` and `PLAN_ARCHIVED.md`; may read `PLAN_FEEDBACK.md` and `PLAN_FEEDBACK_ARCHIVED.md` only as needed to plan or review work.
- **Execution Agent — coordination files:** may write only `PLAN_FEEDBACK.md` and `PLAN_FEEDBACK_ARCHIVED.md`; may read `PLAN.md` and `PLAN_ARCHIVED.md` only as needed to execute the active plan.
- These exclusive write permissions apply only to the four coordination files (`PLAN.md`, `PLAN_ARCHIVED.md`, `PLAN_FEEDBACK.md`, and `PLAN_FEEDBACK_ARCHIVED.md`). They do **not** mean that the Execution Agent is forbidden from modifying `README.md`, game code, tests, assets, or other project files. The Execution Agent may modify any project files required by the authorized active plan.
- Neither agent may write the other role's coordination files.

### Plan and feedback lifecycle

- Keep long-term instructions and project facts in this pinned section; do not bury durable guidance in an archive.
- Keep `PLAN.md` focused on the current authorized task. Do not create a new Stage for small maintenance or documentation edits.
- When a plan task is complete, the Planning Agent copies the completed plan content into `PLAN_ARCHIVED.md` with a dated/status heading, then replaces the non-pinned portion of `PLAN.md` with the next active plan. Append to the archive; never overwrite earlier archived entries.
- After execution, the Execution Agent moves only resolved/closed items from `PLAN_FEEDBACK.md` into `PLAN_FEEDBACK_ARCHIVED.md`, preserving any unresolved items in the active feedback file. Create the feedback archive if it does not yet exist. Append; never overwrite earlier archived entries.
- Archive headings and dates must make it clear what is completed. The pinned section of `PLAN.md` is never archived.
- After completing its assigned file updates, each Agent must report changed files and test/verification results. Do not push unless the owner asks.

### Project identity and constraints

- Owner's repository: `https://github.com/tianyimc/BigNaiWa-Pro`.
- Original repository: `https://github.com/YHSome/BigNaiWa`.
- The game is an additive continuation of the existing fruit-drop, physics, merge, and survival loop. Do not create a separate mode or replace the core loop unless the owner explicitly changes this direction.
- Do not add direct-play URLs or claim that the game is deployed. Hosting status is unverified; a Git push is not evidence of deployment.
- The online leaderboard is intentionally offline. Keep its source files unless explicitly asked otherwise; the UI says “正在完善中，敬请期待” and must not make network requests by default.
- The root directory is the active app. `v1/index.html` is a compatibility redirect, and the verification artifact under `v1/` is intentionally retained.
- The owner tests the game and may confirm it works. Do not assert unverified test results; report only checks actually run by the Agent.

### Version naming and update history

- Version strings are determined **only by substantive functional commits or substantive functional fixes**. Documentation-only, plan-only, feedback-only, and other nonfunctional commits never appear in a version string and never change the displayed version.
- The project/history version format is **`v. Stage X-AAAAAAA`**, where `X` is the major functional Stage and `AAAAAAA` is the seven-character abbreviated hash of the substantive commit. Example: `v. Stage 3-0fc13ae`.
- The compact game-page footer format is **`vX-AAAA`**, using the same Stage and the first four characters of that substantive commit hash. Example: `v3-0fc1`.
- Increment `X` only when a new major functional Stage begins under an owner-approved plan. Smaller improvements and fixes within a Stage keep the same `X` and use the hash of their own substantive commit.
- Maintain `VERSION_HISTORY.md` as the human-readable list of substantive updates only. Each entry uses `v. Stage X-AAAAAAA` and summarizes the corresponding substantive commit. Do not include nonfunctional commits or pre-Stage history that has no Stage number.
- For each future substantive implementation update/fix, the Execution Agent appends the corresponding version and concise summary to `VERSION_HISTORY.md` and updates the compact page-footer version if that task includes a substantive UI/code change. Documentation-only pushes do not change either version display or the history list.
- The Planning Agent maintains these rules in this pinned section. The pinned section itself is never archived.

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
