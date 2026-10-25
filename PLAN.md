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
