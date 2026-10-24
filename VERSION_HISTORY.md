# Version History

Human-readable list of this repository's **substantive functional updates and fixes**.

## Format

```
Stage X-AAAAAAA-AAAAAAA
```

- `X` — the major functional Stage this update belongs to. It only increments when a
  new major functional Stage begins; small changes and maintenance never increment it.
- `AAAAAAA` — the seven-character abbreviated Git commit hash of the commit that
  introduced the update. History entries use the **same hash in both positions**, because
  an entry represents exactly one substantive commit.
- The two-hash form with **different** hashes (`Stage X-AAAAAAA-BBBBBBB`) is only used to
  describe the *current repository state*: first hash = latest pushed commit (functional or
  not), second hash = latest pushed **substantive** commit. See "Current version" below.

**Only substantive functional changes get an entry here.** Documentation-only,
plan-only, feedback-only, and other nonfunctional commits are excluded — they can advance
the current version's first hash, but they never add or rewrite a history entry. Old
entries are never rewritten to reflect later nonfunctional pushes.

## Current version

```
Stage 3-83f6c45-7ae3c31
```

- `83f6c45` — latest pushed commit at the time of writing (a plan-only change).
- `7ae3c31` — latest pushed substantive commit (see the Stage 3 entry below).

This string is documentation only. The game UI does not display a version label, and this
task intentionally did not add one.

## Entries

### Stage 1-3c1a7bc-3c1a7bc — 2026-10-23

Repository layout migration and site cleanup. Moved the active game from `v1/` to the
repository root (6 application files plus 25 assets, recorded by Git as 100% renames), made
root `index.html` the real game page, and turned `v1/index.html` into a compatibility
redirect that preserves the query string and hash. Removed the stale canonical URL and all
direct-play links. Disabled the online leaderboard completely behind an `ONLINE_ENABLED`
switch: no reads, no score submissions, no retries, zero network requests, with the dialog
showing 「正在完善中，敬请期待」; both `leaderboard.js` and `leaderboard.min.js` were kept.
Anchored all four asset scripts to the repository root via `__file__` and repointed the test
loaders at the root layout. Gameplay rules and balance were not changed.

### Stage 2-a671b4c-a671b4c — 2026-10-23

Additive gameplay update, six features on the existing drop/physics/merge/survival loop:

- **Cascade detection** — a newly created fruit merged again within 600 ms with no player
  drop in between extends the chain; unrelated merges restart at 1; a top-tier pair clear
  ends the chain without counting.
- **Run statistics** — highest cascade, highest tier reached, top-tier clears, danger
  recoveries, revives used, shown as a compact two-column summary on the game-over panel
  and reset each run.
- **Cascade feedback and bonus** — `×N 连锁` float capped at `×5+`, scoring
  `min(len-1, 5) × 5` (max +25) through a dedicated path that does not grant revive coins.
- **Danger-line recovery** — a fruit that accumulates 0.5 s above the line and then falls
  back or is merged away earns +30, once per fruit, capped at 3 per run, no revive coins.
- **Optional drop-direction finesse** — `Shift+←/→` (±20 per press) and touch flick over the
  final 120 ms, clamped to ±60 px/s against a 130 px/s drop velocity, with a cue arrow;
  aim position is provably unaffected and `FINESSE_ENABLED` disables it.
- **Two-tier revive** — 1 coin clears the top fruit plus everything above the line; 2 coins
  clears the top three plus everything above the line, unioned so nothing is removed twice;
  the wider tier is disabled with an explanation when the balance is short.

Also added the merge discovery collection (`danaiwa.discovery.v1`, silhouettes for locked
tiers, persists across runs, cosmetic only).

### Stage 3-ed0b245-ed0b245 — 2026-10-24

Product identity and onboarding update:

- **Removed the sponsor feature entirely** — settlement-screen button, sponsor dialog,
  `sponsor.js`, `assets/sponsor-qr.jpg`, and all sponsor-only CSS.
- **Revive coin threshold 2,000 → 1,500 points**, with cumulative and multi-boundary
  behaviour preserved and boundary tests added.
- **Renamed the game to 合成大奶娃Pro** across the title, iOS web-app title, description,
  canvas label, and heading; added a `?` tutorial button with an accessible dialog
  (nine sections, Escape/backdrop close, focus moved in and returned on close, scrollable
  at 320 px).
- **Footer attribution** with owner and original-author links using
  `target="_blank"` + `rel="noopener noreferrer"`.
- **Fixed a pre-existing input bug** surfaced by the tutorial work: the global keydown and
  pointer handlers did not check for an open dialog, so pressing Space or clicking the board
  with the tutorial or leaderboard open dropped fruit behind the overlay.

### Stage 3-81e9de1-81e9de1 — 2026-10-24

Name correction and footer rewrite. The game had been misnamed 合成大奶**娃** since the
initial import; corrected to 合成大奶**蛙** in 20 places (title, metadata, accessibility
labels, heading, footer sentence, source-file headers, the `v1/` compatibility page, the
README, and the test suite). Replaced the footer with the owner-specified two-line wording
and made the three names links to the original-author repository, the author's site, and
this repository respectively.

### Stage 3-7ae3c31-7ae3c31 — 2026-10-24

Copy and layout refinements. Changed the merge copy from 「两个同级别的水果」 to
「两个同级别的奶蛙」 in the tutorial and README. Right-aligned the `?` button: on desktop
via `space-between` plus `margin-right: auto` on the heading, and on narrow screens by
moving the block to the end of the top info bar with `order` plus `justify-content: flex-end`
(the heading is hidden there, so `space-between` had nothing to push against). Added four
regression assertions so neither change can silently revert.

## Excluded commits (for reference)

Two commits change files that look functional but are not, so neither gets an entry:

- `e8bcaa7` (统一仓库行尾为 LF) touches `game.js`, `index.html`, `style.css` and others,
  but every file was verified to differ **only in line endings** — the CR-stripped blobs are
  identical. No behaviour changed.
- `45406af` (刷新 preview.png) replaces the README screenshot and adds assertions to
  `stage3.test.js`; it changes no application logic, markup, or styling.

Everything before `3c1a7bc` (roughly 40 commits, from the initial import `b947132` onward)
predates Stage 1 and is intentionally not listed: the version format is keyed to Stage
numbers, and those commits do not belong to any Stage.

## Maintenance rule for future work

Any future substantive implementation plan must append an entry here for each substantive
functional update or fix, using the form `Stage X-<hash>-<same hash>`. Nonfunctional
commits do not add entries.
