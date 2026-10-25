# PLAN_FEEDBACK — Active Feedback

Feedback for the currently active plan. Written by the Execution Agent.

**Scope rule:** only unresolved/open items live in this file. Closed items are appended to
`PLAN_FEEDBACK_ARCHIVED.md` with a dated heading. The latest archive entry
(**Archived 2026-10-25 — Pre-execution review and Stage 1–3 records**) holds the full
pre-execution review plus the Stage 1/2/3 execution records and all follow-up refinements;
everything raised there is closed or accepted except the two items below.

Current active task: Stage 4 second phase — item inventory, magnet, fan, bubble shield (see `PLAN.md`). Implemented in this turn; see the phase-2 note below.

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

## Stage 4 second phase execution note — inventory, magnet, fan, shield

Implemented. Stage number stayed **4** as the plan requires. This section records the
required audit, the implementation points, and every deviation.

### A. Audit before implementation (required by `PLAN.md` §A)

**Milestone path.** `advanceVoucherProgress()` queues crossed 500-point nodes;
`trySettleMilestones()` drains them only when no cascade is open; `settleMilestone()` closes
each band exactly once and decides qualification from `band.double >= 3 || band.triple >= 2`.
The award branch was the only place that needed changing, so the queuing/attribution logic
was left untouched.

**Score paths.** Four: `addScore()` (ordinary merge, top-tier +500), `addBonusScore()`
(cascade bonus, danger recovery), and the direct writes inside `payoutOverflow()`. All
still advance `voucherProgress` except the compensation payout, which is excluded by design.

**Physics integration order.** `stepPhysics(dt)` runs integrate → constraint solve → elastic
impulse → merge processing. Item forces must therefore be applied **before** the integrate
loop as accelerations; anything that repositions fruit directly would bypass collision
resolution. Both new forces were inserted immediately before integration.

**Danger clock.** `checkGameOver(dt)` accumulates per-fruit `overTime` only when speed is
below `REST_SPEED` (140 px/s), decays at 2× otherwise, and ends the run when a single fruit
exceeds `OVER_LIMIT` (1.5 s). It is not a global countdown — which is exactly why the shield
had to pause each fruit's own counter rather than a shared timer.

**Frame throttling.** `frame()` caps `dt` at 0.25 s and allows at most 5 catch-up steps, so a
backgrounded tab produces a large `dt` on return. The shield therefore uses
`performance.now()` (monotonic) rather than accumulated `dt`, and expiry is processed at the
top of `update()` before any danger evaluation.

**Reset vs revive.** `reset()` clears run state; `revive()` does not call `reset()`, so
run-scoped inventory and the shield-used flag survive revival for free.

No conflict was found with the plan's ordering requirements, so the "stop and report"
branch was not needed.

### B. Implementation points

- `ITEM_TYPES` / `ITEM_MAX` / `ITEM_LABEL` centralize the four types and their caps (2/2/2/1).
- `state.inventory` replaces the shared count; `state.shieldUsedThisRun` is the one-use ledger.
- `drawItemType()` / `awardRandomItem()` draw **before** checking availability and never
  reroll; `payoutOverflow()` is the single compensation path.
- `setItemRandom(fn)` injects the random source for deterministic tests.
- `applyMagnetForce(dt)` / `applyFanForce(dt)` are called at the top of `stepPhysics()`,
  before integration, and are bounded by `MAGNET_MAX_SPEED` / `FAN_MAX_ADDED_VX`.
- `magnetLocalTarget()` recomputes the neighbourhood centroid every substep.
- `activateShield(source)` is the single entry for manual and automatic activation;
  `updateShield()` handles expiry with `nowMs()`; `maybeAutoShield()` runs immediately before
  `checkGameOver()`.
- `checkGameOver()` returns early while the shield is active, leaving every `overTime` and
  `dangerPeak` untouched, and still reports the visual danger state truthfully.

### C. Deviations and judgement calls

1. **`paintVouchers()` was kept as a thin alias.** Old call sites and tests still reference
   it; it now forwards to `paintInventory(pop, 'hammer')`. Removing it outright would have
   churned unrelated code for no benefit.
2. **`state.vouchers` is retained but unused.** Kept as a zeroed compatibility field so that
   stale references cannot throw; it is reset on every new run and is not read by gameplay.
3. **The item UI became an expandable menu.** With four items plus audio/restart/leaderboard,
   the action bar no longer fit at 320 px — score cards were being clipped. Per the owner's
   direction the four items now live behind one 🎒 button that opens a floating panel.
4. **The menu is re-parented to `<body>`.** `.panel` carries `backdrop-filter`, which creates
   a containing block that breaks `position: fixed`, and `.stage` has `overflow: hidden`.
   Moving the panel to `body` and positioning it in viewport coordinates avoids both. This
   cost three iterations to get right; the measured result is in the verification table.
5. **Narrow-screen top bar wraps.** `--topbar` was raised from 68 px to 104 px so the
   two-row top bar does not squeeze the board.
6. **Shield auto-trigger scans for the minimum remainder.** The plan says "the minimum
   remaining time is at most 0.5 s"; the implementation computes that minimum across all
   eligible fruits rather than checking them in array order, so multiple fruits with
   different timers behave correctly.
7. **`stage4.test.js` and `stage4-followup.test.js` were migrated** to the inventory API
   (`inventory.hammer`, `cnt-*` / `btn-*` element ids, forced random draws for milestone
   assertions). This is test-fixture migration required by the plan's own §C, not a
   behaviour change.

### D. Verification actually performed

| Command / check | Result |
|---|---|
| `node physics.test.js` | PASS |
| `node gameplay.test.js` | 48 / 0 |
| `node name-filter.test.js` | 33 / 0 |
| `node stage2.test.js` | 118 / 0 |
| `node stage3.test.js` | 114 / 0 |
| `node stage4.test.js` | 108 / 0 |
| `node stage4-followup.test.js` | 74 / 0 |
| `node stage4-phase2.test.js` (new) | **146 / 0** |
| Browser 1280×900 | menu opens above the button, all four rows with counts, `scrollWidth == 1280` |
| Browser 320×568 | menu fully visible, `scrollWidth == 320`, no clipping |
| Browser 390×844 | menu fully visible, `scrollWidth == 390` |
| Browser: shield active | countdown reads `🫧 护盾 4.9s`, shield button disabled |
| Browser: page/console errors | none |
| Browser: external network requests | **0** |

### E. Owner-directed deviation — hidden grant now fills all four items

`PLAN.md` §B states the hidden grant "fills the hammer count to its existing maximum of 2
and adds 2 revive coins; it must not fill or alter the other item inventories."

**The owner has since directed that the grant fill every item.** Implemented as instructed:

- `hammer` → 2, `magnet` → 2, `fan` → 2, `shield` → 1 (each to `ITEM_MAX`).
- `shield` is still skipped when `shieldUsedThisRun` is true, because filling it would break
  the one-use-per-run rule that §B and §F both establish. This is the smallest reading that
  satisfies "fill them all" without contradicting the shield contract.
- Revive coins remain +2; the run still becomes tainted and excluded from records.

The grant float changed from 「已补满道具券」 to 「道具已补满」 to match the broader effect.

Tests updated in `stage4-phase2.test.js` section [D]: the three "does not touch
magnet/fan/shield" assertions were replaced with "fills to cap" assertions, plus new cases
for partial holdings and for the shield-already-used case. `stage4-phase2` is now
**157 / 0** (was 149).

This is a deliberate, owner-authorized divergence from the plan text, not an oversight. If
the plan is re-issued, §B's hidden-grant paragraph should be updated to match.

### F. Version

Footer is `v4-2a6a`; `VERSION_HISTORY.md` gained `v. Stage 4-2a6a1eb` at the top of the
newest-first list and the current-version block points at the same commit. Stage stayed **4**.
Version synced in a follow-up commit because a commit cannot contain its own hash.

## Stage 4 follow-up execution note — hidden shortcut and run-score exclusion

Implemented. This section records the required audit, the implementation, and every
deviation, using only checks that were actually run.

### A. Pre-implementation audit (required by `PLAN.md` step 1)

**Historical-best write sites.** Before this change `state.best` was written from **three**
places — `addScore()`, `addBonusScore()`, and `payoutOverflow()` — each doing the same
`state.best` / `localStorage` / `bestEl.textContent` triple. That duplication is why the
rollback requirement was tractable: all three were collapsed into a single entry point
(`updateBestIfEligible()`), which now short-circuits when the run is tainted.

**Run lifecycle.** `reset()` establishes a new run; `gameOver()` → `askRevive()` → `revive()`
continues the same run; `settle()` ends it. `revive()` deliberately does **not** call
`reset()`, so a run-scoped flag survives revival naturally.

**Leaderboard submission.** The only game→board call is
`window.DanaiwaBoard.onGameOver(state.score)` inside `settle()`. It is now gated on
`!state.runTainted`. The board itself remains offline behind `ONLINE_ENABLED = false`.

**Modal/input protection.** `isModalOpen()` already gated `pointermove`, `pointerdown`, and
the global `keydown`; the new dialog was added to that list.

**Feasibility conclusion.** The existing best-score lifecycle *can* be rolled back safely
without touching unrelated state: capturing `best` at `reset()` and restoring it when the
taint is set only ever lowers the value this run contributed, and never below the pre-run
baseline. No conflict was found, so the plan's "stop and report" branch was not needed.

### B. Implementation points

- `SECRET_PASS = 'hhh'`, `SECRET_CLICKS = 7`, `SECRET_WINDOW = 2000`,
  `SECRET_VOUCHERS = VOUCHER_MAX`, `SECRET_REVIVES = 2`.
- `registerTitleClick()` counts clicks with a rolling window; `openSecretDialog()` /
  `closeSecretDialog()` / `submitSecret()` handle the dialog with focus save/restore.
- `applySecretGrant(pass)` validates, rejects when `state.over`, then atomically calls
  `taintRun()` before filling vouchers and adding revive coins.
- `taintRun()` sets `runTainted` and, **only if** `state.best > state.bestBaseline`,
  restores `state.best` from the baseline and rewrites `localStorage` + DOM.
- `updateBestIfEligible()` is the single historical-best writer and returns early when
  tainted; live score and the run summary keep updating normally.
- `paintRunTainted()` toggles `#taintNote` on the settlement panel.
- The dialog was added to `isModalOpen()`, and `keydown` handles it **before** `isTyping()`
  so typing in the passphrase field cannot leak Space/Enter into a fruit drop.

### C. Deviations and judgement calls

1. **`keydown` ordering changed.** The secret-dialog branch must run before the
   `isTyping()` early return, otherwise pressing Space inside the password field would fall
   through to the game. The dialog branch now consumes every key except Escape.
2. **Grant feedback float downsized.** The first version used the 40 px "big" float style
   for both lines; in the browser it covered most of the board and obscured the settlement
   panel behind it. Both lines now use the 26 px `chain` style with a shorter life.
3. **Narrow-screen HUD rework (side effect).** With a third and fourth action button, two
   three-digit score cards no longer fit at 320 px; the score values were being clipped.
   Buttons were compacted to 30 px icon buttons and the score cards tightened so both
   three-digit values render fully. This is a layout fix, not a new feature.
4. **`stage3.test.js` assertion relaxed.** The heading gained `id="gameTitle"`, so the exact
   `<h1>…</h1>` match was widened to `<h1[^>]*>…</h1>`.
5. **No separate "run ended" bookkeeping was added.** The plan's requirement that the taint
   clears only on a genuinely new run is satisfied by `reset()` alone, because `revive()`
   never resets state.

### D. Verification actually performed

| Command / check | Result |
|---|---|
| `node physics.test.js` | PASS |
| `node gameplay.test.js` | 48 / 0 |
| `node name-filter.test.js` | 33 / 0 |
| `node stage2.test.js` | 118 / 0 |
| `node stage3.test.js` | 114 / 0 |
| `node stage4.test.js` | 108 / 0 |
| `node stage4-followup.test.js` (new) | **80 / 0** |
| Browser 1280×900 / 320×568 / 390×844 | 7 title clicks open the dialog, input auto-focused, `scrollWidth == innerWidth` |
| Browser: correct passphrase | `runTainted` true, vouchers 0→2, revives +2, dialog closed |
| Browser: best rollback | best 900 → 500 restored, live score stays 900 |
| Browser: settlement panel | taint note visible with the exclusion wording; `finalScore` 900, `finalBest` 500 |
| Browser: page/console errors | none |
| Browser: external network requests | **0** |

### E. Version

Footer is `v4-997b`; `VERSION_HISTORY.md` gained `v. Stage 4-997b334` at the top and the
current-version block points at the same commit. Stage stayed **4** because the plan
classifies this as a follow-up, not a new Stage. Version synced in a follow-up commit, since
a commit cannot contain its own hash.

### F. Standing note on the passphrase

`hhh` lives in the public `game.js`. Anyone can read it, and it must not be described as
secure or tamper-proof. It is a convenience gate only, exactly as the plan states.

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
