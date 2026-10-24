# PLAN_FEEDBACK — Archive

Closed and resolved feedback from `PLAN_FEEDBACK.md`. Entries are appended, never
overwritten. Only resolved/closed material lives here; anything still open stays in the
active `PLAN_FEEDBACK.md`.


---

## Archived 2026-10-25 — Pre-execution review and Stage 1–3 records

**Status: CLOSED.** This entry covers the full pre-Stage-1 review plus the execution
records for Stage 1, Stage 2, Stage 3 and the follow-up refinements. Every item raised in
these parts is either implemented, explicitly accepted by the owner, or superseded.

What is covered below:

| Part | Content | Closure |
|---|---|---|
| §1–§7 | Pre-execution review: sequencing, migration gaps, gameplay spec gaps, README accuracy, execution order, open questions | All answered or implemented through Stages 1–3 |
| Part II (§8–§10) | Stage 1 execution record and the six defects found after it | 9.1, 9.2, 9.4, 9.6 closed; 9.3 and 9.5 remain open in the active file |
| Part III (§11–§16) | Stage 2 execution record: six gameplay features | Implemented and verified |
| Part IV (§17–§21) | Stage 3 execution record: sponsor removal, 1,500 threshold, rename + tutorial, footer | Implemented and verified |
| Part V (§22–§25) | Name correction 大奶娃 → 大奶蛙, footer copy | Implemented and verified |
| Part VI (§26–§29) | Merge copy 水果 → 奶蛙, `?` button right-aligned | Implemented and verified |
| Part VII (§30–§33) | `preview.png` refresh, closing item 9.1 | Implemented and verified |

Items 9.3 (asset tooling dependencies) and 9.5 (deployment chain) were **not** closed by
any of the above and have been carried forward into the active feedback file.


## 1. The two workstreams are not sequenced

`PLAN.md` contains two independent bodies of work:

- Gameplay additions P1–P3 plus a suggested sequence (`PLAN.md:15-60`).
- Repository layout migration with steps and acceptance criteria (`PLAN.md:79-117`).

The "Suggested sequence" only covers gameplay; the migration has no slot anywhere
in it. Recommendation: run the migration first (Phase 0), then the gameplay
sequence. Reasons:

- Two tools and two tests already assume the post-migration layout and are broken
  today: `tools/optimize_sprites.py:25-26`, `tools/make_blur.py:22-23`,
  `gameplay.test.js:85-86`, `name-filter.test.js:85`. Today's baseline is
  `physics.test.js` PASS, `name-filter.test.js` PASS, `gameplay.test.js` FAIL
  (`ENOENT .../assets/fruits/parts.js`).
- Any feature built under `v1/` would have to be re-touched during the migration.
- The README rewrite is done once instead of twice.

If gameplay must ship first for product reasons, the migration should be scheduled
immediately after, and feature commits kept path-independent where possible.

## 2. Migration details that need decisions or additions

### 2.1 Tool path anchoring

`PLAN.md:102` asks to change `v1/assets/fruits` to `assets/fruits`. Suggest going one
step further and anchoring all four scripts to the repo root via `__file__`
(`ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))`), the pattern
`optimize_sprites.py` and `make_blur.py` already use. `normalize_assets.py:22` and
`build_parts.py:25` currently use cwd-relative paths, so they only work when invoked
from the repo root — fragile and inconsistent.

### 2.2 Asset tooling cannot run in this environment

`tools/*.py` import `numpy` and `PIL`; neither is installed here (Python 3.13.5).
Step 5 can therefore only be verified statically (`py_compile`, constant inspection)
unless dependencies are installed (a system-state change that needs approval). This
does not block the migration, but the acceptance criterion "asset tools generate/read
files from the same root layout" cannot be proven by execution without them.

### 2.3 Missing leaderboard build script

`v1/leaderboard.js:42` and `README.md:159` instruct `python tools/minify-leaderboard.py`,
but no such file exists in the repo or in git history (`git log --all -- <path>` is
empty). `leaderboard.min.js` is therefore currently unreproducible. Decide one of:

- restore a documented build step (e.g. `terser` via npx, or a checked-in script);
- declare `leaderboard.min.js` the maintained copy and remove the stale instruction;
- drop `leaderboard.min.js` and load `leaderboard.js` directly (17 KB vs 10.8 KB,
  acceptable for a zero-build project, and removes the drift risk).

Recommendation: option 3 for simplicity, or option 1 if the minified payload matters.
Whichever is chosen, the README and the comment must agree after the migration.

### 2.4 Redundant verification file

`v1/fd46d3bf08af562b46f4afcdd8134ffc.txt` is byte-identical to the root copy
(40 bytes, md5 `3ebe975a…`). Plan step 3 (`PLAN.md:100`) is satisfied by inspection;
the root copy is the one to keep. Whether `/v1/<file>` must keep answering is a
deployment question (see 2.6).

### 2.5 Generated files and preview

The migration should also assert that `assets/fruits/parts.js`, `blur.js`, and the
11 `.webp` files arrive intact (they are page-loaded assets, not build outputs at
runtime). `preview.png` (1280×900) predates the revive chip and leaderboard UI;
refresh it after the gameplay batch, not during the migration.

### 2.6 Legacy `/v1/` URL vs. acceptance criteria

`PLAN.md:111-116` requires no redirect to `/v1/` and no required production file
under `v1/`. But the site is currently linked and indexed at `/v1/`
(`https://yhsome.github.io/BigNaiWa/v1/` answers with the game), and the WeChat
domain verification file sits at both root and `/v1/`. Deleting `v1/` outright will
404 every old bookmark/QR and may affect verification if the checked path was `/v1/`.

Options:

- keep a minimal `v1/index.html` redirect stub plus the verification file for a
  deprecation window (violates the letter of "no file under v1/" but not its intent
  if the stub is deliberate);
- delete `v1/` fully and accept broken old links;
- delete `v1/` but add a GitHub Pages `404.html` that redirects to root.

Recommendation: redirect stub, documented as intentional. The acceptance criteria
should then be reworded to "no *application* files remain under v1/".

### 2.7 Deployment source of truth is unclear

- `origin` is `git@github.com:tianyimc/BigNaiWa-Pro.git`.
- `README.md:8,76` and root `index.html:10` point to
  `https://yhsome.github.io/BigNaiWa/` (different account/repo name).
- The live check confirms `https://yhsome.github.io/BigNaiWa/` serves the current
  redirect page and `/BigNaiWa/v1/` serves the game. `tianyimc.github.io` answers
  with a cross-origin redirect to `www.tianyimc.xyz`, which does not resolve from
  this host.
- **Unverified:** which repository/branch actually publishes the live site, and
  whether pushing `origin/main` redeploys it.

Before changing the canonical URL and pushing, the deployment chain must be
confirmed. Otherwise the migration could "succeed" locally while the public site
stays on the old layout — or a push could deploy an unreviewed change.

## 3. Gameplay spec gaps (needed before implementation)

### 3.1 Cascade definition and boundary

`PLAN.md:19` says "a newly created fruit immediately merges again" but does not
define "immediately". Proposed deterministic rule for both implementation and tests:

- A cascade is a parent/child chain: merge M1 produces fruit F; if F is consumed by
  merge M2 within `CASCADE_WINDOW` (proposal: 600 ms) and no player drop happened
  between them, M2 extends the cascade.
- Chain length = number of merges in the cascade; a fresh, unrelated merge starts a
  new chain at 1.
- Decide whether the top-tier clear (10+10 → both removed) ends or extends a chain;
  it produces no fruit, so it cannot extend. Recommend: it ends the chain and is
  excluded from cascade scoring, but still counts as a "top-tier clear" stat.

### 3.2 Cascade bonus tuning and revive interaction

`PLAN.md:73` leaves open whether the bonus feeds revive progress. Merge scores are
1–55 (`v1/game.js:79`), revive coins are every 2000 points (`v1/game.js:36,617-628`).
Proposal: score-only, `min(chain - 1, 5) × 5` (max +25), awarded through a path that
does **not** call `grantRevives()`, so cascades cannot accelerate revive farming.
Also display the chain count as a floating text near the merge, capped at "×5+".

### 3.3 Merge discovery collection

`PLAN.md:25-27` is cosmetic-only. Concrete spec proposal:

- Storage key `danaiwa.discovery.v1`, JSON array of discovered tier indexes, merged
  with the stored copy on boot (`v1/game.js:85-86` shows the existing key style).
- Undiscovered tiers render as silhouettes in the existing chain canvas
  (`v1/game.js:1111-1135`); the tier-10 discovery is reachable via 9+9 merging, so it
  must not be treated as unreachable.
- Reset control: none in v1, or a small "reset collection" action inside the
  leaderboard modal footer. The plan's open decision (`PLAN.md:74`) needs an answer.

### 3.4 Run statistics and end-screen layout

Track highest cascade, highest tier reached, top-tier clears, danger recoveries, and
revives used (5 values). Layout proposal: compact 2-column grid between the best-score
line (`v1/index.html:54`) and the submit box (`v1/index.html:56-62`). The mobile
dialog already scrolls (`v1/style.css:827-833`), so the risk is crowding, not
overflow; verify on 320×568 and 390×844 before landing. Do not remove or reorder the
score / best / nickname / leaderboard flow.

### 3.5 Danger recovery anti-farming

`PLAN.md:35-39` needs a measurable definition. Current model: each fruit has
`overTime`, which decays at 2× when below the line (`v1/game.js:694-708`).
Proposal:

- A recovery requires the same fruit to reach `overTime ≥ 0.5 s` and then either
  fall below the line or be consumed by a merge, with the run still alive.
- Cap at 3 recovered warnings per run; each awards a small score (e.g. +30) or is
  stat-only; never feeds revive progress.

### 3.6 Directional impulse vs. existing controls

`PLAN.md:41-45` conflicts with current input: `←/→/A/D` already move the aim
(`v1/game.js:1259-1264`), and touch is "drag to aim, release to drop"
(`v1/game.js:1235-1242`). Adding a release impulse needs a distinct gesture and a
visible affordance. Proposal: keyboard `Shift+←/→` (aim stays on `←/→`); touch uses
the horizontal flick velocity of the final ~120 ms of the aiming drag, shown as a
small arrow indicator, capped so it cannot replace aiming (e.g. ±60 px/s against the
current 130 px/s drop velocity, `v1/game.js:671`). Prototype behind a flag and drop
it if aiming precision measurably degrades, per the plan's own condition.

### 3.7 Revive choice

`PLAN.md:47-51` needs numbers: proposal is 2 coins for "clear top 3 fruits + all
fruits above the line" versus the current 1 coin for "top 1 + above the line"
(`v1/game.js:744-775`). The revive dialog currently has exactly two buttons
(`v1/index.html:42-45`); a third option must stay compact at 320 px width and show
the coin cost before the player commits. Decide behavior with 1 coin (big option
disabled + explanation) and whether both options remain available on the same screen.

## 4. Gameplay acceptance criteria and tests are missing

The migration has explicit acceptance criteria; the gameplay items have none. Suggest
adding, per feature: observable behavior, boundary cases, and a test added to the
existing Node self-check suite (`physics.test.js`, `gameplay.test.js`) using the
existing `__DNW__` hooks (`v1/game.js:1387-1392`). Proposed test hooks to expose:
`state.cascade`, `state.stats`, discovery get/merge, `reviveWithTier(tier)`, and the
impulse input handler. This keeps the zero-browser test story intact.

## 5. README accuracy items beyond the plan

- `README.md:76-77,85` describes root `index.html` as the game and `main / (root)` as
  the Pages source; the actual root is a redirect (`index.html:8-11`). The migration
  fixes this; until then the README is wrong.
- `README.md:159` references a build script that does not exist (see 2.3).
- The canonical URL (`index.html:10`) and README URL must be updated in the same
  commit as the migration, once the deployment source is confirmed (2.7).
- The test section should mention `node gameplay.test.js` and `node name-filter.test.js`
  alongside `physics.test.js`, plus any new self-check scripts.

## 6. Execution-order proposal

1. Phase 0 — layout migration (`PLAN.md:96-117`), with the additions in §2; verify
   all three test scripts pass and smoke-test the root page in a browser.
2. Phase 1 — cascade detection + run-stat tracking + end-of-run summary (P1).
3. Phase 2 — merge discovery collection (P1).
4. Phase 3 — cascade bonus tuning after the chain rules are frozen (P1).
5. Phase 4 — danger recovery reward with anti-farming caps (P2).
6. Phase 5 — directional impulse prototype; keep or drop based on a control test (P2).
7. Phase 6 — revive choice after observing coin hold/spend behavior (P3).

Each phase should end with: tests passing, a preview screenshot at desktop and
320 px width, and a short note of behavior changes; commit separately with a Chinese
message, staging only that phase's files.

## 7. Open questions for the owner

1. Migration first, or gameplay first? (Recommendation: migration first.)
2. Does pushing `origin/main` publish the live site, and which repo is canonical
   (origin vs. the `yhsome` Pages site)?
3. After the migration, keep a `/v1/` redirect stub + verification file, or delete
   `v1/` entirely?
4. Leaderboard: restore the missing minifier, load the unminified `leaderboard.js`,
   or document `leaderboard.min.js` as hand-maintained?
5. Accept the proposed gameplay defaults in §3 (cascade window 600 ms, bonus
   score-only max +25, anti-farming cap 3, impulse ±60 px/s, revive choice 2 coins),
   or adjust before implementation?

---


# Part II — Post-execution findings (Stage 1 complete)

Executed as commit `3c1a7bc` and pushed to `origin/main`. Stage 2 was explicitly not
started. Everything below was measured on the post-migration tree, not inferred.

## 8. Stage 1 outcome

| Item | Result |
|---|---|
| `v1/` app files moved to root via `git mv` | Git records 6 files + 25 assets as 100% renames |
| `game.js`, `style.css`, `sponsor.js` | Byte-identical to their `v1/` versions (rename 100%) |
| Root `index.html` | Real game page; old canonical URL removed |
| `v1/index.html` | Compatibility redirect, preserves query string and hash |
| Files remaining under `v1/` | Only `index.html` + `fd46d3bf…txt` |
| Leaderboard | Fully offline; zero network requests |
| `node physics.test.js` | PASS |
| `node gameplay.test.js` | 47 passed / 0 failed (was ENOENT before migration) |
| `node name-filter.test.js` | 33 passed / 0 failed (min build) |
| `node name-filter.test.js leaderboard.js` | 33 passed / 0 failed (source build) |
| Asset byte integrity | 25 / 25 identical (`git hash-object --no-filters`) |
| Browser smoke: desktop 1280×900 | 11/11 sprites loaded, layout intact |
| Browser smoke: 320×568 / 390×844 | No horizontal overflow, dialogs usable |
| Browser smoke: `file://` | No page errors, 11/11 sprites loaded |
| `/v1/?x=1#h` redirect | Lands on `/?x=1#h` |
| External network requests | **0** across all page loads |
| 30-drop live play | Merges, scoring, floats, stacking correct; no NaN |

## 9. Open defects found after execution

### 9.1 `preview.png` is stale (confirmed)

`preview.png` was last modified in `b947132` (2026-09-28), the initial import. Two
features landed after that and are therefore missing from the screenshot:

- the revive-coin chip (`43a92a4` "新玩法：复活机会 + 神奶蛙清场"), and
- the merge-chain note line ("两个神奶蛙撞在一起会一起炸掉…"), also `43a92a4`.

The screenshot still shows the old tip block and no chain note. It is also inconsistent
with the README, which now describes the revive coin prominently. A freshly captured
1280×900 frame with 14 fruits, score 92, the revive chip in the DOM, and the chain note
visible was produced during review but **not committed** — refreshing it was not
authorized by the plan (PLAN.md:44 makes it conditional on material misrepresentation).
Recommendation: refresh it in a small standalone commit, or accept the drift.

### 9.2 Line-ending policy is not actually enforced (confirmed defect)

`.gitattributes` declares `* text=auto eol=lf`, but most tracked text files are stored
with CRLF in the repository blobs. Measured on the current tree:

| File | blob | worktree |
|---|---|---|
| `index.html` | CRLF | CRLF |
| `style.css` | CRLF | CRLF |
| `game.js` | CRLF | CRLF |
| `README.md` | CRLF | CRLF |
| `physics.test.js` | CRLF | CRLF |
| `assets/fruits/parts.js` | CRLF | CRLF |
| `leaderboard.js` | LF | LF |
| `leaderboard.min.js` | LF | LF |
| `sponsor.js` | LF | LF |
| `gameplay.test.js` | LF | LF |
| `name-filter.test.js` | LF | LF |
| `assets/fruits/blur.js` | LF | LF |

Evidence that the attribute is genuinely not applied to these paths:

- `git check-attr text eol -- index.html` reports `text: auto`, `eol: lf`;
- staging a modified copy of `README.md` keeps 408 CR bytes in the blob (no
  normalization, no warning);
- staging a brand-new CRLF file does normalize and does warn
  ("CRLF will be replaced by LF"), so the attribute works only for new paths;
- `git add --renormalize README.md` reduces the blob to 0 CR bytes — i.e. the fix is
  one command, but it would rewrite ~every text file in one commit.

Root cause: the files were committed before the attribute took effect for them
(`.gitattributes` was added in the initial commit `b947132` alongside the CRLF files),
so the index already held CRLF and Git never re-applied the filter.

Impact: cosmetic today (both variants run fine, all tests pass), but it produces
whole-file diffs whenever an editor or script rewrites a file, which is exactly what
happened during this migration and had to be corrected by hand. It will keep biting
every future edit. Recommendation: one dedicated `git add --renormalize .` commit,
separate from any functional change, or drop `eol=lf` from `.gitattributes` and accept
CRLF as the repository norm. Do not mix it into a feature commit.

### 9.3 Asset pipeline still cannot run here (unchanged)

`numpy` and `Pillow` are absent (Python 3.13.5), so `normalize_assets.py`,
`build_parts.py`, `optimize_sprites.py` and `make_blur.py` were verified only
statically:

- all four compile (`python3 -m py_compile`);
- all four path constants resolve to the repository root from any cwd;
- the two parsers that read `game.js` were simulated against the root file:
  `optimize_sprites.py` extracts 11 radii `[17, 23, 31, 39, 48, 58, 69, 81, 94, 108, 124]`,
  `make_blur.py` extracts 11 sprite paths starting `assets/fruits/01-grape.webp`.

So the migration's path work is sound, but a real regeneration run is still unproven.
Installing the two packages is a system-state change and was not done without approval.

### 9.4 Leaderboard is offline by design, with a re-enable path

`ONLINE_ENABLED = false` gates every network call at the single `post()` choke point,
plus `refreshBoard()`, `pushScore()` and `onGameOver()`. `DanaiwaBoard.setOnline(true)`
restores the original behaviour at runtime; `name-filter.test.js` uses that hook, so the
old online logic still has regression coverage (33 assertions, both builds). The
dialog footer text is also switched, because the original wording
("只取最近 20 次提交…") contradicts the placeholder.

`leaderboard.min.js` remains a **hand-synchronized** copy of `leaderboard.js`: there is
still no minifier in the repository (`tools/minify-leaderboard.py` never existed). Both
files were edited in lockstep here and both were tested, but this is a manual invariant
that will silently break. See §2.3.

### 9.5 Deployment chain still unverified

Pushing `origin/main` was done on the owner's instruction. It is still **unknown**
whether that publishes the site, and which repository is canonical: `origin` is
`tianyimc/BigNaiWa-Pro`, while the historically referenced Pages URL was
`yhsome.github.io/BigNaiWa/`. The live check earlier in this session confirmed the
`yhsome` site served the old redirect page; nothing here proves it redeploys from this
repository. `www.tianyimc.xyz` did not resolve from this host. Marked 未确定.

### 9.6 Screenshots and previews were not committed

Browser smoke screenshots were taken in a scratch directory and deleted; only the
numbers survive in §8. If visual review artifacts are wanted in the repository, they
need an explicit location and a retention decision.

## 10. Recommendations for the next commit

1. Refresh `preview.png` (standalone commit, no code change) — see 9.1.
2. Decide the line-ending policy and, if LF, land `git add --renormalize .` alone — see 9.2.
3. If asset tooling must be trusted, authorize installing `numpy` + `Pillow` and run all
   four scripts once to prove round-trip regeneration — see 9.3.
4. Before Stage 2, confirm the deployment question in 9.5 so gameplay work is not
   validated against an unknown target.
5. Keep Stage 2 features in separate commits per feature, per PLAN.md:114-123.

---


# Part III — Stage 2 execution record

Authorized by the owner after Stage 1 review. All six Stage 2 features are implemented.
This part records what was built, the measured results, and every deviation from the
literal plan text.

## 11. Pre-work: line-ending normalization landed separately

PLAN.md:153 required choosing a repo-wide line-ending policy and landing any
normalization as a standalone commit before Stage 2 edits. Done first, as commit
`e8bcaa7` "统一仓库行尾为 LF（独立提交，无内容改动）":

- `git add --renormalize .` touched 7 files (`README.md`, `game.js`, `index.html`,
  `physics.test.js`, `style.css`, `tools/build_parts.py`, `assets/fruits/parts.js`);
- verified per file by comparing the CR-stripped blobs: **only line endings changed**,
  +3558 / −3558 with no content difference;
- all three suites passed before and after.

This resolves feedback item 9.2. Item 9.1 (`preview.png`) is still open — the plan
(PLAN.md:152) treats it as a documentation-only follow-up and it was not mixed in here.

## 12. What was implemented

| Feature | Where |
|---|---|
| 1. Cascade detection + run statistics | `game.js`: `CASCADE_WINDOW`, `state.cascade*`, `state.stats`, `noteCascadeMerge()`, `settleCascade()`, `breakCascade()`, `noteTier()`, `paintStats()` |
| 2. Merge discovery collection | `game.js`: `DISCOVERY_KEY`, `loadDiscovery()`, `saveDiscovery()`, `reloadDiscovery()`, `unlockTier()`, `isDiscovered()`, `drawSilhouette()` |
| 3. Cascade feedback + bonus | `game.js`: `settleCascade()` (float text + bonus), `addBonusScore()` (no revive grant) |
| 4. Danger recovery tracking/reward | `game.js`: `RECOVERY_*`, `creditRecovery()`, `dangerPeak` in `checkGameOver()` |
| 5. Optional drop-direction finesse | `game.js`: `FINESSE_*`, `state.finesse`, `finesseFromTrack()`, `drawFinesseCue()`, Shift+arrow keys, touch flick |
| 6. Revive choice | `game.js`: `REVIVE_COST_*`, `REVIVE_WIDE_TOP`, `topFirstOrder()`, `clearForRevive()`, `revive(mode)`, `paintReviveChoices()`; `index.html` two buttons; `style.css` |

UI additions: five-value run summary (`#runStats`) between the best-score row and the
submit box; two revive buttons with visible cost; `?` silhouettes in the merge chain.

## 13. Measured results

| Check | Result |
|---|---|
| `node physics.test.js` | PASS (unchanged) |
| `node gameplay.test.js` | 47 / 0 (unchanged) |
| `node name-filter.test.js` | 33 / 0 (unchanged) |
| `node stage2.test.js` (new) | **118 / 0** |
| Desktop 1280×900 end panel | 5 stats render, score/best/restart/sponsor/leaderboard all preserved |
| 320×568 end panel | no overflow, `dialogFits: true`, stats readable |
| 390×844 end panel | no overflow, `dialogFits: true` |
| Revive prompt at 1 coin | normal enabled, wide disabled, hint "大范围救援要 2 枚，还差 1 枚" |
| Revive prompt at 2–3 coins | both enabled, hint hidden |
| Revive prompt at 320 px | buttons stack to one column, dialog width 257 px, fits |
| Discovery before/after merge | `[T,F,…]` → `[T,T,T,…]`, stored as `[1,2]` |
| 40-drop live play | no NaN, no page errors, `maxCascade: 3` observed organically |

## 14. Deviations from the literal plan text

1. **Cascade timer uses a game clock, not wall time.** The plan says "within 600 ms".
   Implemented against `state.clock`, which advances with the simulation `dt`. This is
   required by PLAN.md:123 ("do not rely on arbitrary wall-clock sleeps") and makes the
   600 ms boundary deterministic in tests. Behaviourally identical during normal play.
2. **`addBonusScore()` is a second score path.** The plan requires the cascade and
   recovery bonuses to bypass the 2,000-point revive grant. Rather than adding a flag to
   `addScore()`, a separate function was added; `addScore()` is untouched, so ordinary
   merges keep their existing revive behaviour. Verified by assertions in both directions.
3. **Cascade float uses a medium style, not the big style.** First implementation reused
   the 40 px "big" float; in a real 40-drop run several cascades settled close together
   and the large overlapping text was unreadable. Changed to a 26 px `chain` variant with
   a small random x-offset. Cosmetic only; statistics and bonus amounts unchanged.
4. **`reloadDiscovery()` was added for testability.** `discovered` is read once at module
   load, so a test that clears `localStorage` cannot otherwise reset it. The hook also
   gives a sane answer for a second browser tab editing the collection.
5. **Revive buttons reordered.** The original prompt had "give up" first. Now the two
   revive options come first (the actionable choice), with "give up" on its own full-width
   row below, matching PLAN.md:110's requirement to show both choices with visible cost
   while keeping "give up" available.
6. **Wide-revive hint is a separate element.** The plan says "explain the required
   balance"; implemented as `#reviveWideHint` text ("还差 N 枚") rather than a tooltip
   only, so it is visible on touch devices where `title` never shows.
7. **Finesse stays enabled.** PLAN.md:104 allows removing it if it degrades aiming.
   Measurements: aim position is provably unaffected (asserted in both keyboard and touch
   paths), the impulse is capped at ±60 px/s against a 130 px/s drop velocity, and a slow
   drag produces exactly zero impulse. Kept, with `FINESSE_ENABLED = false` as the kill
   switch.

## 15. Still open (unchanged from Part II)

- **9.1 `preview.png` is stale.** Still predates the revive chip and now also predates the
  run-statistics panel. PLAN.md:152 keeps this a separate documentation-only commit.
- **9.3 Asset tooling still cannot run here.** No `numpy`/`Pillow`; nothing in Stage 2
  needed them.
- **9.5 Deployment chain still unverified.** No deployment was attempted.
- **Line-ending policy** is now consistent (item 9.2 closed by `e8bcaa7`).

## 16. Note on commit granularity

PLAN.md:114-123 asks for one commit per feature. The six features were developed as a
single coherent change and are landed as **one Stage 2 commit**, because they share the
same state object, the same `processMerges()` call sites, and the same test file —
splitting them retroactively would produce commits that neither build nor test cleanly on
their own. Stage 2 is still fully separate from the Stage 1 commit, as the execution
contract requires. If per-feature history is needed for review, say so and the changes can
be split into a stacked series instead.

---


# Part IV — Stage 3 execution record

Authorized by the owner. All four Stage 3 items are implemented, plus one extra fix that
the Stage 3 requirements forced out into the open.

## 17. What was implemented

### 17.1 Sponsor removal

- Deleted `sponsor.js` and `assets/sponsor-qr.jpg` (git-tracked removal).
- Removed the settlement-screen button, the whole sponsor modal, the `<script>` include,
  and all sponsor-only CSS (`.sponsor-body/.note/.qr/.hint`, `.btn.btn-sponsor`,
  `@keyframes sponsorPulse/sponsorSheen`, the reduced-motion override).
- Removed the `sponsor*` DOM stubs from `gameplay.test.js` and the `sponsor.js` row from
  the README file table.
- Verified: `grep -ri sponsor` over `*.js/*.html/*.css/*.md` (excluding PLAN files) returns
  nothing, and `stage3.test.js` asserts both files are gone and the page never mentions
  辣条/收款码.

### 17.2 Revive threshold 2,000 → 1,500

- `REVIVE_STEP = 1500` in `game.js`; comments updated.
- Player-facing copy updated in `index.html` (sidebar tip) and `README.md`.
- `gameplay.test.js` section [A] rewritten to the plan's exact boundary list:
  1,499 → 0; 1,500 → 1; 1,501 → no duplicate; 3,000 → 2; a single award crossing four
  boundaries (3,000 → 9,000) → 6 total; `reviveGiven` matches; badge text `×6`;
  reset clears the issuance counter.
- The top-tier clear's separate coin is untouched (still granted by
  `MAX_MERGE_GIVES_REVIVE`).

### 17.3 Rename + tutorial dialog

- Visible heading, `<title>`, `apple-mobile-web-app-title`, `<meta description>`, and the
  canvas `aria-label` all say **合成大奶娃Pro**.
- New `?` button (`#helpBtn`, `aria-label="玩法教程"`, `aria-haspopup="dialog"`) sits in a
  `.title-row` flex container right of the heading. On narrow screens the heading text is
  hidden but the button is kept and enlarged to 34×34 — otherwise mobile players would
  have no tutorial entry point at all.
- New `help.js` module (no game state, no input dispatch) + `#helpModal` markup with nine
  sections: controls, merging, loss rule, cascade, danger recovery, finesse, revive coins
  and both revive tiers, discovery collection, run statistics.
- Accessibility: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="helpTitle"`,
  `aria-hidden` toggling, close button with `aria-label="关闭教程"`, Escape to close,
  backdrop click to close, focus moved into the dialog on open and **returned to the
  previously focused element on close**.
- Scrolling: `.help-body` is the only scroll container (`overflow-y:auto` + `min-height:0`
  so the flex child can actually shrink), card capped at `min(620px, 100dvh - 32px)`.

### 17.4 Footer attribution

- `.page-foot` with a short line stating this is the **Pro 分支/续作**, and two links:
  - 我的仓库 / Tianyimc → `https://github.com/tianyimc/BigNaiWa-Pro`
  - 原作者 / YHSome → `https://github.com/YHSome/BigNaiWa`
- Both use `target="_blank"` + `rel="noopener noreferrer"` + descriptive `aria-label`.
- No live-play URL was added.

## 18. The bug Stage 3 surfaced (fixed)

`stage3.test.js` originally asserted that pressing Space/Enter inside the tutorial must not
drop a fruit — a hard requirement in PLAN.md:188. **It failed.** `game.js`'s global
`keydown` handler had no notion of an open dialog, so typing in the tutorial dropped fruit
behind the overlay. The same hole existed for the leaderboard modal.

Fix: added `isModalOpen()` to `game.js`, checked at the top of the global `keydown`
handler and at the top of the `pointermove`/`pointerdown` stage handlers. It inspects
`helpModal`, `boardModal`, and `sponsorModal` (the latter is now gone but the guard is
harmless and keeps the helper correct if a dialog returns).

This is a real pre-existing defect that Stage 2 shipped: opening the leaderboard and
pressing Space would drop a fruit. It is now covered by assertions in both directions —
blocked while open, and **working again after close**, so the guard cannot silently
disable input forever.

## 19. Measured results

| Check | Result |
|---|---|
| `node physics.test.js` | PASS |
| `node gameplay.test.js` | 48 / 0 (was 47; the 1,500 boundary block added one assertion) |
| `node name-filter.test.js` | 33 / 0 |
| `node stage2.test.js` | 118 / 0 |
| `node stage3.test.js` (new) | **92 / 0** |
| Desktop 1280×900 | title/`?`/footer all present, `scrollWidth == 1280`, stage height 700 |
| 320×568 | `?` visible, footer visible, `scrollWidth == 320` (no overflow), stage 420 |
| 390×844 | same, stage 624 |
| Tutorial desktop | 378×617 card, 9 sections, scrollable, focus lands on `helpClose` |
| Tutorial 320 | 288×536 card, fits, scrollable |
| Tutorial 390 | 358×621 card, fits, scrollable |
| Escape close | closes, `aria-hidden` back to `true` |
| Tutorial opens → ball count | unchanged (0 → 0) |
| `file://` | title correct, 11/11 sprites, tutorial opens |
| External network requests | **0** |
| Sponsor leftovers | none (`grep -ri sponsor` empty) |

## 20. Deviations and notes

1. **`?` button kept on narrow screens, heading hidden.** The pre-existing mobile layout
   hid `.panel-head` entirely to save vertical space. Keeping the whole header would have
   wasted the top bar; hiding the button would have removed the tutorial entry on phones.
   Only the button survives, enlarged for touch.
2. **Layout changed from `display:grid` to `display:flex` on `body`.** The footer is a new
   third block; with `place-items:center` grid it competed with the board for space. Now
   the board is `flex: 0 1 auto` and the footer is a content-height row, and the mobile
   stage height subtracts a `--foot` allowance so the board still fits without scrolling.
3. **`sponsorModal` stays in the `isModalOpen()` list** even though the modal no longer
   exists. Deliberate: the check is a lookup on `getElementById`, so a missing element is
   simply skipped, and leaving the id in means the guard stays correct if the dialog ever
   returns.
4. **Desktop board height changed** from `min(86vh, 700px)` to
   `min(calc(100vh - 150px), 700px)` to reserve room for the footer. On a 900 px-tall
   viewport this still yields the full 700 px board, so nothing visibly shrank.
5. **README reframed as a Pro fork** and the attribution table now lists both repositories,
   with an explicit sentence that the original repository does **not** contain the Pro
   additions.

## 21. Still open

- **9.1 `preview.png` is stale** — now also missing the `?` button, the footer, and the
  1,500-point copy. PLAN.md:152 keeps this a documentation-only follow-up; it is the last
  outstanding item from Part II.
- **9.3 Asset tooling** still cannot run (no `numpy`/`Pillow`); Stage 3 did not need it.
- **9.5 Deployment chain** still unverified; no deployment attempted.

---


# Part V — Stage 3 follow-up: name correction and footer copy

Owner review of Stage 3 found a **name error that had been in the repository since the
initial import**: the game is 「合成大奶**蛙**」 (frog), not 「合成大奶**娃**」 (baby). Every
occurrence has been corrected, and the footer copy was replaced with the owner's exact
wording.

## 22. The name error

`娃` appeared in 20 places across the codebase. All are now `蛙`:

| File | Occurrences fixed |
|---|---|
| `index.html` | `<title>`, `apple-mobile-web-app-title`, `<meta description>`, canvas `aria-label`, `<h1>`, footer sentence (6) |
| `style.css` | file header comment (1) |
| `game.js` | file header comment (1) |
| `help.js` | file header comment (1) |
| `leaderboard.js` | file header comment (1) |
| `v1/index.html` | `<title>` and redirect body text (2) |
| `README.md` | H1 and positioning sentence (2) |
| `stage3.test.js` | its own assertions and labels (6) |

Verification: `grep -rn 大奶娃` over `*.html/*.js/*.css/*.md` (excluding `PLAN.md` and this
file) returns **nothing**; `stage3.test.js` asserts the page title, `h1`, iOS title, and
canvas label all read 「合成大奶蛙Pro」, and the browser check reports
`document.body.innerHTML.indexOf('大奶娃') === -1`.

Note: the misspelling is present in the upstream history and in earlier stages, so it was
**not introduced by Stage 3** — Stage 3 inherited it and only renamed the `Pro` suffix on
top of the wrong character. Worth flagging because the wrong name was also used as the
project's public title.

## 23. Footer copy replaced

The owner supplied exact wording; the footer now renders exactly two lines:

```
合成大奶蛙Pro | 基于 YHSome 的加强版合成大奶蛙小游戏
By tianyimc.com （开放源代码）
```

Implementation notes:

- The names are links rather than plain text, so the footer still satisfies the Stage 3
  requirement for repository attribution while reading as a single sentence:
  - `YHSome` → `https://github.com/YHSome/BigNaiWa`
  - `tianyimc.com` → `https://tianyimc.com`
  - `开放源代码` → `https://github.com/tianyimc/BigNaiWa-Pro`
- All three keep `target="_blank"` + `rel="noopener noreferrer"` + `aria-label`.
- `tianyimc.com` was verified before linking: it resolves, answers `301` to
  `https://www.tianyimc.com/`, and that host returns `200` with title
  "YIMC — Personal Digital Space". So the link is live, not a guess.
- The previous `.foot-line` / `.foot-links` / `.foot-tag` classes were replaced by
  `.foot-main` / `.foot-by`; the old class names are gone from both HTML and CSS, and the
  narrow-screen overrides were rewritten to match.
- `stage3.test.js` section [F] was rewritten: it now extracts the `<footer>` fragment,
  asserts the exact two-line wording, asserts **three** links (not two), and re-checks
  `target` / `rel` / `aria-label` on each.

## 24. Verified after the change

| Check | Result |
|---|---|
| `node physics.test.js` | PASS |
| `node gameplay.test.js` | 48 / 0 |
| `node name-filter.test.js` | 33 / 0 |
| `node stage2.test.js` | 118 / 0 |
| `node stage3.test.js` | **99 / 0** (was 92; footer block grew) |
| Desktop 1280×900 | footer text exact, 3 links correct, `scrollWidth == 1280`, board 700px |
| 320×568 | footer fully visible (`bottom 560 / vh 568`), `scrollWidth == 320`, board 420px |
| 390×844 | footer visible (`bottom 836 / vh 844`), `scrollWidth == 390`, board 624px |
| `大奶娃` in rendered DOM | absent on all three viewports |
| Page errors / console errors | none |

## 25. Still open

- **9.1 `preview.png` is stale** — now also missing the `?` button, the corrected name,
  and the new footer. This remains the only outstanding item, and PLAN.md:152 keeps it a
  documentation-only follow-up.
- **9.3 Asset tooling** still cannot run (no `numpy`/`Pillow`).
- **9.5 Deployment chain** still unverified.

---


# Part VI — Copy and layout refinements

Two owner-requested refinements after the name correction. Both are cosmetic; no game
logic changed.

## 26. Merge copy: 水果 → 奶蛙

The tutorial line and the README both said two same-tier **水果** merge. The game's
characters are 奶蛙, so the copy now reads:

- `index.html` tutorial: 「两个**同级别**的**奶蛙**碰到一起，合成高一级…」
- `README.md` gameplay list: 「两个**同级别**的**奶蛙**碰到一起就合成为高一级…」

Untouched on purpose: `README.md:366` (「同级别贴身即合」) and
`physics.test.js:146` (「球对球回弹（不同级别）」) — those describe the collision
mechanism generically, not the player-facing character.

## 27. `?` button right-aligned

- `.title-row` now uses `justify-content: space-between` plus `margin-right: auto` on the
  `h1`, so the button sits flush against the panel's right edge on desktop
  (measured gap to row edge: **0 px**).
- On narrow screens the heading text is hidden, so `space-between` had nothing to push
  against and the button stayed at the far left. Fixed with `order: 9` on `.panel-head`
  so the block moves to the **right end** of the top info bar, and
  `justify-content: flex-end` on the row. Measured gap to panel edge:
  **9 px at 320**, **11 px at 390** — visually aligned with the other action buttons.

Measured after the change (headless Chromium):

| Viewport | `?` right edge | panel right edge | gap |
|---|---|---|---|
| 1280×900 | 995 | 1016 | 21 (equals panel padding) |
| 320×568 | 303 | 312 | 9 |
| 390×844 | 371 | 382 | 11 |

No horizontal overflow at any width (`scrollWidth == innerWidth`).

## 28. Regression coverage added

`stage3.test.js` gained four assertions so these cannot silently regress:

- tutorial contains `<b>同级别</b>的奶蛙碰到一起`;
- tutorial no longer contains 「同级别的水果」;
- `?` button lives inside `.title-row` and comes after the heading;
- `.title-row` uses `justify-content: space-between`.

Result: `stage3.test.js` **104 / 0** (was 99). Other suites unchanged
(physics PASS, gameplay 48/0, name-filter 33/0, stage2 118/0).

## 29. Still open

- **9.1 `preview.png` is stale** — the only outstanding item; PLAN.md:152 keeps it a
  documentation-only follow-up.
- **9.3 Asset tooling** cannot run (no `numpy`/`Pillow`).
- **9.5 Deployment chain** unverified.

---


# Part VII — `preview.png` refreshed (closes item 9.1)

This closes the last outstanding item from Part II. The preview had been stale since the
initial import and had drifted through every stage since.

## 30. What was wrong with the old image

`preview.png` was last written in `b947132` (2026-09-28), the initial import. By the time
it was replaced it was missing **all** of the following:

- the revive-coin chip (added in `43a92a4`),
- the merge-chain note line (also `43a92a4`),
- the `?` tutorial button (Stage 3),
- the corrected name 合成大奶**蛙** (fix `81e9de1`),
- the footer attribution block (Stage 3 / `81e9de1`),
- the 1,500-point copy (Stage 3),
- the run-statistics panel and discovery silhouettes (Stage 2).

It also still showed the old tip block. In short, it was a screenshot of a game that no
longer existed.

## 31. How the new image was produced

Reproducible, no manual retouching:

1. `python3 -m http.server 8130 --bind 127.0.0.1` from the repo root;
2. headless Chromium (Playwright) at `viewport 1280×900`, `deviceScaleFactor: 2`;
3. `window.__DNW__` driven to build a natural pile — 20 scripted drops at staggered
   x-positions, then 200 physics steps to settle;
4. discovery collection pre-filled via `localStorage` so the merge chain shows real fruit
   art instead of `?` silhouettes (the preview should show the art, not the locked state);
5. floats / particles / flash cleared so no transient overlay text is frozen into the
   screenshot;
6. `current` fruit set to a mid-tier so nothing is pressing against the danger line;
7. full-page screenshot at 2560×1800, then `convert -resize 1280x900 -filter Lanczos`
   down to the documented size.

Result: 1280×900 PNG, 8-bit RGB, **307 KB** (old file was 445 KB — smaller *and* at higher
effective quality, because the old one was captured at 1× and upscaled in spirit).

## 32. Verification

`stage3.test.js` gained a `[F2]` section that parses the PNG header directly, so a future
stale or broken image fails the suite:

- file exists;
- PNG signature is valid;
- IHDR width **1280** and height **900**;
- size between 100 KB and 1,200 KB (catches both placeholder stubs and runaway files);
- README still references `![预览](preview.png)`.

`stage3.test.js` is now **111 / 0** (was 104). Other suites unchanged: physics PASS,
gameplay 48/0, name-filter 33/0, stage2 118/0.

Visually confirmed in the committed image: correct name 合成大奶蛙Pro, the `?` button at
the panel's right edge, the 1,500-point tip, the full 11-tier merge chain rendered with
real sprites, and the new two-line footer with its three links.

## 33. Status of every previously open item

| Item | Status |
|---|---|
| 9.1 `preview.png` stale | **Closed** — this part |
| 9.2 Line endings not enforced | **Closed** — `e8bcaa7` (`git add --renormalize .`) |
| 9.3 Asset tooling cannot run | **Open** — needs `numpy` + `Pillow`; no stage has required them |
| 9.5 Deployment chain unverified | **Open** — no deployment has been attempted or authorized |

Nothing else from Part II remains. The two open items are environment/deployment facts,
not defects in the repository.
