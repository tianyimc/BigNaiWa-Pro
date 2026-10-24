# PLAN_FEEDBACK — Active Feedback

Feedback for the currently active plan. Written by the Execution Agent.

**Scope rule:** only unresolved/open items live in this file. Closed items are appended to
`PLAN_FEEDBACK_ARCHIVED.md` with a dated heading. The latest archive entry
(**Archived 2026-10-25 — Pre-execution review and Stage 1–3 records**) holds the full
pre-execution review plus the Stage 1/2/3 execution records and all follow-up refinements;
everything raised there is closed or accepted except the two items below.

Current active task: create `VERSION_HISTORY.md` (see `PLAN.md`); version-number rule was subsequently revised by the owner — see the note below.

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

## Action required by the Planning Agent — pinned version rule is stale

The owner revised the version-number rule after the original plan was written. The rule in
the pinned section of `PLAN.md` ("Version naming and update history") still describes the
**old** two-hash format and must be updated by the Planning Agent, because the Execution
Agent has no write permission on `PLAN.md`.

### Owner decision

Version numbers are determined **only** by substantive commits. The "latest pushed commit"
hash is no longer part of any version string, anywhere. This removes the structural problem
where the first hash could never catch up with itself: a commit cannot contain its own hash,
so `Stage X-AAAAAAA-BBBBBBB` was always one commit behind for `AAAAAAA`.

### New rule now implemented in the project files

| Where | Format | Example |
|---|---|---|
| `VERSION_HISTORY.md` entries and current version | `v. Stage X-AAAAAAA` (seven chars) | `v. Stage 3-0fc13ae` |
| Game page footer | `vX-AAAA` (four chars) | `v3-0fc1` |

- `X` is the major functional Stage; it only increments when a new major Stage begins.
- `AAAAAAA` is the seven-character hash of the commit that introduced that substantive
  update.
- Documentation-only, plan-only, and feedback-only commits never appear in a version string
  and never change the displayed version.

### What still needs doing

The Planning Agent should replace the "Version naming and update history" bullets in the
pinned section of `PLAN.md` so they describe the single-hash rule above, including the
footer's four-character form. The old example referencing `Stage 3-211c57c-7ae3c31` should
be removed or rewritten, since that two-hash form is no longer used.

## Notes on the current task — version history

`PLAN.md` asks for a new `VERSION_HISTORY.md` listing past substantive functional updates,
using `Stage X-<hash>-<hash>` entries with equal hash fields, and explicitly excludes
documentation-only, plan-only, and feedback-only commits.

### Owner decisions taken before writing

Three points were ambiguous enough that they were confirmed with the owner first rather than
decided unilaterally:

1. **Stage 3 entry granularity** — Stage 3 contains three substantive commits
   (`ed0b245`, `81e9de1`, `7ae3c31`). Owner chose **three separate entries**, one per
   substantive commit, rather than collapsing them into one.
2. **Pre-Stage-1 history** — roughly 40 commits predate Stage 1 (from the initial import
   `b947132` onward). Owner chose **not** to list them, since the version format is keyed to
   Stage numbers and those commits belong to no Stage.
3. **Current version string** — the owner confirmed recording
   `Stage 3-83f6c45-7ae3c31` at the top of the file, derived by the pinned rule
   (first hash = latest pushed commit, second = latest substantive commit).

### Substantive vs nonfunctional classification

Five substantive commits were identified and verified to resolve in Git:

| Version | Subject |
|---|---|
| `Stage 1-3c1a7bc-3c1a7bc` | Repository layout migration and site cleanup |
| `Stage 2-a671b4c-a671b4c` | Six additive gameplay features |
| `Stage 3-ed0b245-ed0b245` | Sponsor removal, 1,500 threshold, Pro rename, tutorial, footer |
| `Stage 3-81e9de1-81e9de1` | Name correction 大奶娃 → 大奶蛙, footer rewrite |
| `Stage 3-7ae3c31-7ae3c31` | Merge copy, `?` button right-alignment |

Two commits look functional from their file lists but were verified nonfunctional and were
therefore excluded — this is recorded in `VERSION_HISTORY.md` itself so the reasoning is not
lost:

- `e8bcaa7` touches `game.js`, `index.html`, `style.css` and others, but every file was
  diffed with CR stripped and is **identical apart from line endings**.
- `45406af` replaces `preview.png` and adds assertions to `stage3.test.js`; it changes no
  application logic, markup, or styling.

### Constraints respected

- No game UI, README, gameplay, or other project file was changed; `git status` shows only
  the new `VERSION_HISTORY.md`.
- No version label was added to the game UI, per the plan's instruction.
- `PLAN.md` and `PLAN_ARCHIVED.md` were read only, not written.
- Nothing was pushed; the plan says not to push unless the owner asks.
