# PLAN_FEEDBACK — Active Feedback

Feedback for the currently active plan. Written by the Execution Agent.

**Scope rule:** only unresolved/open items live in this file. Closed items are appended to
`PLAN_FEEDBACK_ARCHIVED.md` with a dated heading. The latest archive entry
(**Archived 2026-10-25 — Pre-execution review and Stage 1–3 records**) holds the full
pre-execution review plus the Stage 1/2/3 execution records and all follow-up refinements;
everything raised there is closed or accepted except the two items below.

Current active task: Stage 4 — voucher and hammer item (see `PLAN.md`). Implemented in this turn; see the Stage 4 execution note below.

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

## Stage 4 execution note — voucher and hammer

Stage 4 is implemented. This section records the required pre-implementation audit, the
implementation points, and every deviation from the literal plan text.

### A. Pre-implementation audit (required by `PLAN.md`)

**Score-writing paths.** Four exist, and all now advance voucher progress:

| Path | Function | Revive coins | Voucher progress |
|---|---|---|---|
| Ordinary merge | `addScore()` | yes (1,500 threshold) | yes |
| Top-tier +500 clear | `addScore()` | yes, plus its own extra coin | yes |
| Cascade bonus | `addBonusScore()` | no | yes |
| Danger recovery +30 | `addBonusScore()` | no | yes |

Only the new over-cap +100 payout bypasses progress; it writes score/best directly.

**Cascade lifecycle.** `noteCascadeMerge()` starts or extends a chain; `settleCascade()` is
called on the 600 ms timeout, on a player drop, when a new chain supersedes the old one, and
on a top-tier clear. Length is only known at settlement, which is why milestone settlement is
deferred while a chain is open.

**Ball creation/removal and input.** `state.balls` is only appended by `makeBall()` callers
(drop, merge) and previously only shrunk by the `dead` filter in `processMerges()`. Render
order in `drawBalls()` is `sort((a,b) => a.r - b.r)`, so **larger fruit is drawn later and
therefore sits on top**. Input paths that could drop a fruit were `pointerdown` (mouse),
`pointerup` (touch), and the Space/Enter/ArrowDown branch of `keydown`; all three are now
gated by hammer mode.

### B. Implementation points

- `voucherProgress` is a separate monotonic counter; `state.score` and the revive ledger are
  untouched.
- `bandCombos[]` holds per-band `{double, triple, closed}`; a closed band is never reopened.
- `pendingMilestones[]` queues crossed nodes in ascending order and is drained only when no
  cascade is open, so one long chain cannot qualify multiple bands.
- `noteCascadeMerge(nb, startBand)` receives the band captured **before** `addScore()` in
  `processMerges()`.
- `removeBall(b, cause)` marks `dead`, sets `removedBy`, splices synchronously, clears danger
  timers, and settles the chain if the removed ball was its current link.
- `isHammerTarget()` requires live membership, `landed`, `contacts > 0`, and speed ≤ 55 px/s.
- `pickHammerTarget()` walks the render order backwards so the visually topmost fruit wins.

### C. Deviations and judgement calls

1. **Render-order correction.** My first implementation assumed the smaller fruit was drawn
   on top and selected the largest on overlap, which the Stage 4 test caught as a failure.
   The test was right: `drawBalls()` sorts ascending and paints in that order, so the
   **largest** fruit is on top. Implementation and test were both corrected, and the comment
   now states the real ordering.
2. **`ensureBand()` gained defensive defaults.** The stricter cascade rule
   (`removedBy === 'merge'`) meant older Stage 2 tests that simulate merges by setting
   `dead = true` now need `removedBy = 'merge'`. Rather than only patching the tests,
   `ensureBand()` and `noteCascadeMerge()` now fall back to the current band when
   `startBand` is missing or invalid, so an external caller cannot crash the game.
3. **`stage2.test.js` was edited.** Five places that hand-simulate a merge now also set
   `removedBy = 'merge'`. This is a test-fixture correction forced by the new, stricter
   contract — not a behaviour change.
4. **Narrow-screen action bar.** Four action buttons no longer fit beside the score cards.
   The narrow layout now renders all four as icon-only buttons. The panel still keeps the
   full label on desktop.
5. **`.actions` grid changed to three columns** on desktop so hammer/audio/restart share a
   row while the leaderboard button keeps its own full-width row.

### D. Verification actually performed

| Check | Result |
|---|---|
| `node physics.test.js` | PASS |
| `node gameplay.test.js` | 48 / 0 |
| `node name-filter.test.js` | 33 / 0 |
| `node stage2.test.js` | 118 / 0 |
| `node stage3.test.js` | 114 / 0 |
| `node stage4.test.js` (new) | **108 / 0** |
| Browser 1280×900 / 320×568 / 390×844 | no page errors, no console errors, 11/11 sprites, no horizontal overflow |
| External network requests | 0 |
| Live play then hammer | 6 resting fruits eligible; click removed 1, consumed 1 voucher, score unchanged, mode auto-exited |
| Voucher progress during live play | advanced 0 → 154 with real merges; band recorded 2 doubles |
| Hammer mode input isolation | Space did not drop; Escape exited |

### E. Version

Page footer is `v4-4f88`; `VERSION_HISTORY.md` gained
`v. Stage 4-4f88949` at the top of the (newest-first) list, and the current-version block
points at the same commit. Per the pinned rule, the version was synced in a follow-up
commit because a commit cannot contain its own hash.

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
