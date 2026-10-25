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

## Active plan — Stage 4 second phase: Item inventory, magnet, fan, and bubble shield

Extend the existing item system in the current game. This work remains within **Stage 4**; do not increment the Stage number. Add the magnet, small fan, and bubble shield, and replace the shared voucher balance with per-item inventory and random milestone rewards. Preserve the fruit-drop, physics, merge, survival, revive, and score loops.

### Current implementation facts to preserve

- The Stage 4 voucher ledger uses 500-point milestones and per-band cascade qualification: at least 3 finalized double combos or 2 finalized triple combos. A milestone settles once after an open cascade closes. The current over-cap reward adds +100 visible score without advancing voucher progress, granting revive coins, or recursively settling milestones.
- The current shared voucher balance is capped at 2. The hammer consumes one voucher and only removes a live, landed, currently contacting fruit at or below 55 px/s; targeting does not pause the simulation. The Stage 4 hidden grant fills this same shared balance and is a separate convenience shortcut.
- Physics runs at a fixed 1/60 s update with 3 physics substeps; frame dt is capped at 0.25 s, and catch-up is limited to 5 steps. Gravity is 2,600 px/s². New item forces must be integrated into the existing simulation rather than directly changing fruit positions.
- Danger time is tracked per landed fruit in `overTime`. A fruit above `DANGER_Y` accumulates danger time only when its speed is below 140 px/s; otherwise the timer decays at twice real simulation dt. It also decays below the line. Game over occurs when an individual `overTime` exceeds 1.5 s. This is not a single global countdown.
- Game over first offers the existing revive flow when revive coins are available. A revive clears the current danger timers but continues the same run and preserves run inventory. A genuine `reset()` begins a new run.
- The leaderboard is offline by default. Keep it offline and network-silent; do not remove its code or enable network behavior.

### A. Audit before implementation

1. Trace milestone queuing/finalization, the shared voucher state, hammer activation/removal, the hidden grant, `payoutOverflow()`, reset/revive, and all inventory/HUD updates.
2. Trace `stepPhysics()`, force/integration order, fruit creation/removal, collision resolution, and the precise ordering of `checkGameOver()` relative to danger accumulation and terminal handling.
3. Confirm how frame throttling and `performance.now()` behave when the tab is backgrounded. Use a monotonic clock for the shield's five-second real-time duration; reconcile expiry before the next danger check after a delayed frame.
4. Report the minimal implementation points and any conflict in `PLAN_FEEDBACK.md` before changing code. Do not refactor unrelated physics or change the Stage number.

### B. Per-item inventory and random milestone rewards

#### Inventory model and reset

- Replace the generic voucher count with a per-run inventory keyed by `hammer`, `magnet`, `fan`, and `shield`. Centralize initial limits in one configuration table:
  - hammer: maximum 2;
  - magnet: maximum 2;
  - fan: maximum 2;
  - shield: maximum 1 held and at most one successful use per run.
- A shield that has been consumed manually or automatically is permanently unavailable for the rest of that run. If held but not yet used, it occupies the one shield slot. If it is used, do not allow a later milestone to award another shield.
- A new run clears all four counts, the shield-used flag, active effects, targeting modes, warnings, and temporary timers. Reviving preserves inventory and whether the shield was used; it must not reset item limits.
- Migrate the existing hammer and hidden-grant logic to the new inventory without changing their established user-facing behavior. The hidden grant remains a Stage 4 convenience shortcut: it fills the hammer count to its existing maximum of 2 and adds 2 revive coins; it must not fill or alter the other item inventories. A successful use continues to taint the full run for records as currently implemented.

#### Milestone draw, caps, and compensation

- Keep the existing score-progress source, 500-point bands, combo thresholds, cascade attribution, pending-node ordering, and exactly-once settlement unchanged.
- At each qualified milestone, draw exactly one item uniformly from the four item types. Draw before checking inventory/availability, and never reroll or substitute another item.
- If the drawn item's current held count is below its cap and it is available this run, add exactly one. For shield, availability requires both `shieldUsedThisRun === false` and no shield already held.
- If the drawn item is at its hold cap, or if it is the one-use shield already consumed this run, award the existing +100 visible-score compensation instead. A shield already held but not used is at cap and therefore also yields compensation if drawn again.
- Compensation does not grant any item, advance item-progress score, create a combo, trigger revive coins, or recursively evaluate milestones. Preserve the current overflow behavior for visible score and historical best, subject to the existing run-taint rule.
- Inject or wrap the random source so tests can force each draw deterministically. Production draws are uniform; do not bias selection toward available items.

### C. Existing hammer migration

- Keep the current hammer eligibility, hit testing, visuals, cancel behavior, and atomic removal contract. Change only its inventory read/write from shared vouchers to `inventory.hammer`.
- A successful hammer use consumes one hammer; cancel, blank click, ineligible/stale target, or no inventory consumes none. Preserve all current reward isolation and cascade-removal protections.
- Ensure the hidden grant fills only hammer inventory up to 2. Add coverage for grant behavior with 0, 1, and 2 hammers and for repeated valid grants.

### D. Magnet

- Add a magnet button and an exclusive targeting state (hammer and magnet targeting cannot be active simultaneously). On activation, show a clear instruction; the player selects one live fruit in `state.balls`. Cancel or invalid selection consumes nothing.
- On valid selection, compute the local dense-area target as the center of nearby live fruits excluding the selected fruit, within a centralized configurable radius. If no other live fruit is within range, report that there is no suitable target and consume nothing.
- Start a short, configurable, weak attraction effect on only the selected fruit. Recompute the local target as nearby fruit positions change. Apply bounded acceleration through the existing physics update; do not teleport, directly reposition, delete, merge, or create fruit.
- Initial tuning parameters must be centralized (suggested starting points: 200 px neighborhood, 1.25 s duration, 250 px/s² maximum attraction acceleration) and calibrated in playtests against current gravity and collision behavior. Clamp the added acceleration/velocity contribution so a force cannot create runaway speed.
- Once a valid effect starts, consume exactly one magnet. A target removed during the effect ends that effect cleanly; the consumed item is not refunded. Do not stack or restart a second magnet effect while one is active; reject that use without consumption.
- Magnet use must not directly add score, combo records, revive coins, item progress, or danger-recovery rewards. Normal physics may still lead to ordinary collisions and merges.

### E. Small fan

- Add a fan button. Each successful use applies a short horizontal airflow to every live fruit currently participating in normal physics. Use a predictable alternating direction (first use left, next successful use right) to avoid another direction-selection dialog and keep the action bar compact.
- Apply the force as bounded acceleration during existing physics substeps, not as a direct position/velocity teleport. Centralize and tune duration, acceleration, and maximum total velocity contribution; suggested starting points are 0.8 s, 600 px/s², and 180 px/s of added horizontal velocity.
- Consume one fan only when the effect starts. Do not stack or restart another fan while one is active; reject without consumption. A fruit removed during the effect is ignored; newly created live fruit follows the documented effect scope (prefer all live fruit evaluated each substep until the effect expires).
- End the force on duration expiry, new run, or terminal game over. Do not directly remove fruit, create merge results, add score/combo/revive/item rewards, or bypass collisions/danger checks.

### F. Bubble shield and danger-clock integration

#### One-run inventory and shared activation path

- A held shield can be activated manually once, or activated automatically once. Both paths call one shared `activateShield(source)` routine that validates availability, marks `shieldUsedThisRun`, consumes the shield, sets a five-second expiry using a monotonic real-time clock, and updates the HUD.
- Manual activation starts the effect immediately and consumes the shield only after validation succeeds. It gives no score, combo, revive coin, item-progress, or recovery reward.
- Auto-use is allowed only when a shield is held, unused, not already active, and the game has not entered terminal game-over flow.
- Evaluate auto-use immediately before danger/loss checks. For each live landed fruit above the danger line whose speed is below the existing 140 px/s danger-rest threshold, compute remaining time as `max(0, 1.5 s - overTime)`. When the minimum remaining time is at most 0.5 s, auto-activate once before any fruit can trigger `gameOver()` in that update. This must work when multiple fruits have different danger timers.

#### Accurate pause and resume

- Shield activation pauses the actual per-fruit `overTime` progression for all fruits, not just the warning or UI. Preserve each fruit's exact `overTime` and danger peak while active; neither accumulation nor decay may alter the paused countdown. Continue physics, collisions, merges, and the visible danger condition normally.
- The five-second effect uses elapsed real time from a monotonic clock, not frame-count estimates. On each update and after background throttling, process expiration before danger checks. Do not grant a fresh 1.5-second danger timer on shield expiry: each fruit resumes with its own pre-shield `overTime` and remaining time.
- If a fruit had 0.2 s remaining before activation, it still has 0.2 s remaining after the shield expires. The next eligible danger update may end the run if the fruit remains stationary and above the line.
- A fruit that first enters the danger zone during the shield must not accumulate danger time until the shield expires. The shield does not erase pre-existing danger state or directly rescue/remove fruit.
- Keep `state.danger`/danger-line visuals truthful while protected and show a separate clear shield-active indicator/countdown. When the shield expires, clear its timer and warning and resume the existing danger logic.
- If danger loss or game-over/revive flow begins before a shield is validly activated, do not auto-trigger after terminal handling. Preserve the existing revive behavior. Shield use cannot be repeated after manual or automatic activation, and it cannot be reacquired for the rest of the run.

### G. UI, feedback, and state consistency

- Show separate counts and controls for hammer, magnet, fan, and shield. Each button consumes only its matching item; zero-count or currently unavailable actions are clearly disabled.
- Show shield ownership, active protection, and remaining effect time distinctly. Show a brief, prominent warning for automatic activation (for example, “危险！泡泡护盾已自动触发”) and clear temporary messaging on expiry/reset.
- Keep controls, counts, help/title, score, danger warning, and board usable at 320 px and 390 px widths. Reuse existing Pro styling and avoid a large HUD redesign.
- Modal/targeting states must be mutually safe: no background fruit drops from pointer/touch/keyboard events; game-over cancels targeting; reset cancels every temporary effect. Do not pause physics for magnet, fan, or shield.

### H. Implementation phases, tests, and versioning

1. **Audit and inventory migration:** document current state and compatibility; migrate hammer/secret-grant; add deterministic random reward, caps, shield one-use ledger, compensation, and reset/revive coverage. Preserve milestone and cascade rules.
2. **Magnet and fan:** implement force integration, exclusive targeting where needed, effect lifecycle/caps, HUD controls, and focused physics tests. Calibrate parameters without changing the base physics model.
3. **Shield:** implement accurate per-fruit pause/resume and automatic trigger ordering, then HUD and boundary tests for multiple danger timers, frame delays, and game-over/revive transitions.
4. **Regression and documentation:** run Stage 4 and existing suites, desktop/narrow viewport checks, and console/network checks. Record actual changes, deviations, and results in `PLAN_FEEDBACK.md`; update `VERSION_HISTORY.md` and the footer for substantive commits using **Stage 4** and its single-hash rule. Do not update version labels for plan/feedback-only commits.
5. Validate each phase before moving to the next. If source behavior conflicts with this plan, record the concrete conflict and smallest safe adjustment in `PLAN_FEEDBACK.md` before implementing the affected requirement.

Deterministic test coverage must include:

- Each of the four forced random outcomes; uniform production selection contract; no reroll; unavailable/capped item produces exactly one +100 and no recursive milestone or secondary rewards.
- Per-item caps at below/at/above boundaries, one-use shield held/used/reward-blocked states, new-run reset, revive preservation, random item state, and secret-grant interaction with hammer only.
- Hammer regressions: valid/invalid/resting/moving/stale targets, cancellation, exactly-once inventory consumption, reward isolation, and cascade removal.
- Magnet targeting, no-neighbor failure/no charge, local-target recomputation, force/duration caps, target removal, no stacking, collision/merge preservation, and no direct rewards or teleportation.
- Fan left/right alternation, affected live objects, new fruit during active airflow, force/duration/speed caps, no stacking, cleanup, collision/merge/danger preservation, and no direct rewards.
- Shield manual/automatic activation, one-use enforcement, exact 0.5 s trigger boundary, auto-trigger before game-over, multiple fruits with different `overTime`, stationary/moving/below-line cases, exact five-second elapsed time, preserved sub-0.5-second remainder, fruit entering danger during shield, long-frame/background expiry, revive preservation, reset cleanup, and no-shield regression.
- HUD/state agreement, 320 px / 390 px layouts, modal and targeting input isolation, no console errors, and zero network requests with the leaderboard offline.
- Existing `physics.test.js`, `gameplay.test.js`, `name-filter.test.js`, `stage2.test.js`, `stage3.test.js`, `stage4.test.js`, and `stage4-followup.test.js` remain passing.

### Stage 4 scope boundaries

- This is Stage 4; do not create Stage 5 or change the version's Stage number.
- Add only per-type inventory/random milestone awards and the magnet, fan, and bubble shield described here. Do not add shops, random world drops, online services, or other item types.
- Preserve current score/milestone/combo rules, hammer semantics, revive behavior, run-taint handling, leaderboard-offline default, and core gameplay.
- Tune only centralized item parameters; do not conduct unrelated physics or HUD redesigns.
