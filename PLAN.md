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
