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

- Use the format **`Stage X-AAAAAAA-BBBBBBB`**, where each hash is the seven-character abbreviated Git commit hash.
- `X` is the current major functional Stage. Increment it only when the owner-approved plan begins a new major functional Stage; small changes and maintenance do not increment it.
- `AAAAAAA` is the hash of the latest commit pushed to the owner's repository, whether it contains functional changes or documentation/plan/feedback-only changes.
- `BBBBBBB` is the hash of the latest pushed commit that contains a substantive functional change or substantive functional fix. A documentation-only, plan-only, feedback-only, or other nonfunctional commit updates the first hash only.
- Example: after a documentation-only commit `abcdefg`, if the latest substantive commit is `7ae3c31`, the current version is `Stage 3-abcdefg-7ae3c31`. The owner's example `Stage 3-211c57c-7ae3c31` follows the same rule for the repository state at that point in history.
- Create and maintain `VERSION_HISTORY.md` as the human-readable version update list. Record only substantive functional updates/fixes. Each entry's version must have equal hash fields (`Stage X-AAAAAAA-AAAAAAA`), because the entry represents the commit that introduced that substantive update. Do not add entries for documentation-only, plan-only, feedback-only, or other nonfunctional commits.
- For historical entries, inspect Git history and summarize substantive changes only. For each future substantive update, append its version and a concise summary to `VERSION_HISTORY.md`. Do not rewrite old entries to reflect later documentation-only pushes; the current version's first hash can advance without changing the version-history list.
- The Planning Agent maintains these rules in the pinned section. The Execution Agent creates/updates `VERSION_HISTORY.md` only when an active plan directs it to do so or when a substantive update is part of the authorized implementation task.

## Active plan — create version history

This is a documentation task, not a new functional Stage.

### Required work

- Create `VERSION_HISTORY.md`.
- Review Git history and add concise summaries for past substantive functional updates only. At minimum, identify the existing Stage 1 repository/gameplay baseline, Stage 2 gameplay additions, and Stage 3 product/tutorial updates. Use each substantive update commit's seven-character hash in both positions of the history entry version.
- The latest substantive Stage 3 update currently identified by the owner is `7ae3c31`; verify it against Git history and use the actual substantive commit hash if the history shows a later substantive commit.
- Add a short note at the top of `VERSION_HISTORY.md` explaining the format and that nonfunctional pushes do not receive history entries.
- Future substantive implementation plans must require the Execution Agent to append a version-history entry for each substantive functional update/fix. The version entry must use equal hash components for that functional commit. Nonfunctional commits do not add entries.
- Do not change the game's UI, README, version label, gameplay, or other files as part of this task. Do not create a new Stage.

### Acceptance

- `VERSION_HISTORY.md` exists and contains concise, accurate summaries of the repository's past substantive updates.
- Every listed version matches `Stage X-<7-char hash>-<same 7-char hash>` and the hash resolves to the summarized substantive commit.
- The current-version rule and the example remain documented in the pinned section of `PLAN.md`.
- No functional code or UI is changed for this task.
