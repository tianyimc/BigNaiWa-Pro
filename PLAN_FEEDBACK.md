# PLAN_FEEDBACK — Active Feedback

Feedback for the currently active plan. Written by the Execution Agent.

**Scope rule:** only unresolved/open items live in this file. Closed items are appended to
`PLAN_FEEDBACK_ARCHIVED.md` with a dated heading. The latest archive entry
(**Archived 2026-10-25 — Pre-execution review and Stage 1–3 records**) holds the full
pre-execution review plus the Stage 1/2/3 execution records and all follow-up
refinements; everything raised there is closed or accepted except the two items below.

Current active task: README license wording (see `PLAN.md`).

---

## Open items carried forward

### 9.3 Asset pipeline cannot run in this environment

`numpy` and `Pillow` are not installed (Python 3.13.5). The four scripts under `tools/`
(`normalize_assets.py`, `build_parts.py`, `optimize_sprites.py`, `make_blur.py`) have been
verified only statically:

- all four compile (`python3 -m py_compile`);
- all four resolve their path constants to the repository root from any working directory;
- the two parsers that read `game.js` were simulated against the root file and extract the
  expected 11 radii and 11 sprite paths.

What remains unproven: an actual end-to-end asset regeneration. No stage has required it,
so this is an environment limitation rather than a repository defect.

**Blocker:** installing `numpy` and `Pillow` is a system-state change and requires explicit
owner authorization. Until then, asset-script changes can only be validated statically.

### 9.5 Deployment chain unverified

It is still unknown whether pushing `origin/main` publishes a site, and which repository is
canonical. `origin` is `tianyimc/BigNaiWa-Pro`; the historically referenced Pages URL was
`yhsome.github.io/BigNaiWa/`. A live check earlier in this project confirmed the `yhsome`
site served the old redirect page; nothing proves it redeploys from this repository.
Marked **未确定**.

This is consistent with the pinned rule in `PLAN.md`: hosting status is unverified and a Git
push is not evidence of deployment. No deployment has been attempted or authorized.

---

## Notes on the current task

The active plan (`PLAN.md`) asks for a single README license-sentence replacement plus this
feedback archive housekeeping. Both are executed in this turn; the file changes and the
verification actually run are reported to the owner. Per the pinned rule, nothing is pushed
unless the owner explicitly asks.

Two constraints from the pinned section were respected while doing this task:

- Only `PLAN_FEEDBACK.md` and `PLAN_FEEDBACK_ARCHIVED.md` were written by the Execution
  Agent for the feedback side of the work; `PLAN.md` and `PLAN_ARCHIVED.md` were read only.
- The README edit touched the license sentence only. No application file, no other README
  section, and no license file was added.
