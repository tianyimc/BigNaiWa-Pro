# Active Plan

## Pinned operating rules — do not archive this section

This section is durable project guidance. It stays at the top of `PLAN.md` and must never be moved to `PLAN_ARCHIVED.md`, even when all active tasks are complete.

### Agent file ownership

- **Planning Agent:** may write only `PLAN.md` and `PLAN_ARCHIVED.md`. Read `PLAN_FEEDBACK.md` and `PLAN_FEEDBACK_ARCHIVED.md` only when needed to plan or review the next work.
- **Execution Agent:** may write only `PLAN_FEEDBACK.md` and `PLAN_FEEDBACK_ARCHIVED.md`. Read `PLAN.md` and `PLAN_ARCHIVED.md` only as needed to execute the active plan.
- Neither agent edits the other role's files. Repository implementation files are changed only by the Execution Agent as directed by an active plan.

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

## Active task — README license wording

This is a small maintenance edit, not a new Stage.

### Required change

Replace the current license-section wording in `README.md` with this exact Chinese text:

> 仅供学习娱乐，不得以此盈利。由于原作者（YHSome）未在其仓库声明开源许可证，本仓库亦无法声明开源许可证，如有侵权，请联系解决。

Preserve the existing README heading unless a minimal wording adjustment is needed for clarity. Do not add a license file or modify other README sections or application files.

### Feedback archive housekeeping

As part of this execution, the Execution Agent must review `PLAN_FEEDBACK.md`, move only resolved/closed feedback into `PLAN_FEEDBACK_ARCHIVED.md` using the pinned archive rules, and leave any still-open items in `PLAN_FEEDBACK.md`. This housekeeping is within the current task and does not authorize gameplay or deployment work.

### Acceptance

- The exact required sentence appears in the README license section.
- No other README content or application file is changed for this task.
- Closed feedback is appended to `PLAN_FEEDBACK_ARCHIVED.md`; unresolved feedback remains active in `PLAN_FEEDBACK.md`.
- The Execution Agent reports the file changes and verification performed. Do not push unless the owner explicitly requests it for the implementation change.
