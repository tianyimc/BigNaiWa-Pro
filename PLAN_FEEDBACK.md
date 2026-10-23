# PLAN.md — Pre-Execution Review & Feedback

Status: review only; no plan work started. Based on inspection of commit `8998423`
(`main`, clean tree) plus a live-site check on 2026-10-24 (Asia/Hong_Kong).

This file records gaps, risks, and concrete suggestions for `PLAN.md`. It does not
replace the plan; the plan's priorities and guardrails are taken as given unless a
question below says otherwise.

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
