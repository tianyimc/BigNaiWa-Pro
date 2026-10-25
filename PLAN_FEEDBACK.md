# PLAN_FEEDBACK — Active Feedback

Feedback for the currently active plan. Written by the Execution Agent.

**Scope rule:** only unresolved/open items and the current work record live in this file.
Closed items are appended to `PLAN_FEEDBACK_ARCHIVED.md` with a dated heading. The archive
now holds the pre-execution review, Stage 1–3 records, the pinned-rule resolution, and the
**complete Stage 4 record** (base, follow-up, second phase, closing task).

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

---

---

## Action required by the Planning Agent — pinned section is now outdated

The Planning Agent already archived the Stage 4 plan content in `18c51b3`
("Archive Stage 4 as accepted"), so items 1 and 5 of the previous request are done. What
remains is a **stale rule in the pinned section**.

### The pinned deployment bullet contradicts reality

`PLAN.md` pinned section, 「Project identity and constraints」, currently says:

> Do not add direct-play URLs or claim that the game is deployed. Hosting status is
> unverified; a Git push is not evidence of deployment.

That is no longer true. The owner confirmed the project is public at
**<https://naiwa.tianyimc.com/>**, and it was verified from this host:

- DNS resolves;
- `GET /` returns **HTTP 200**, no redirect;
- the served page is this repository's current build (`<title>合成大奶蛙Pro</title>`,
  chain note 「换 800 分 + 一枚复活币」, footer `v4-19fa`).

The Execution Agent therefore added the live URL to `README.md` and to the game page footer,
which the pinned bullet forbids. The bullet should be rewritten to something like:
"The game is deployed at `https://naiwa.tianyimc.com/`; documentation may reference that URL.
Deployment configuration itself lives outside this repository."

### Still pending from the previous request

- **§B of the second-phase plan text** (now archived) said the hidden grant "must not fill
  or alter the other item inventories". The owner overrode this: the grant fills **all four**
  items (hammer 2, magnet 2, fan 2, shield 1, shield skipped once used). Any future plan
  quoting that behaviour should use the current rule.

---

## Stage 4 closing task — execution note

Owner-directed closing work for Stage 4. All three items are implemented.

### 1. Top-tier clear bonus 500 → 800

- `MAX_BONUS` changed from `500` to `800` in `game.js`.
- The on-page chain note now reads
  「✨ 两个神奶蛙撞在一起会一起炸掉，换 **800 分** + **一枚复活币**」.
- The existing +500 float text is derived from `MAX_BONUS`, so it now shows `+800`
  automatically; no separate literal needed changing.
- Revive-coin grant and the clear's other effects are unchanged.

### 2. 「合成神奶蛙」counter and score stars

- The run statistic previously labelled 「顶级清场」 is now labelled **「合成神奶蛙」** on the
  end-of-run panel; its value is the same `state.stats.topClears` counter, which increments
  once per top-tier pair clear.
- A new `paintStars()` renders **one ⭐ per clear** immediately after the score. It updates
  both the live sidebar score (`#scoreStars`) and the end-of-run score (`#finalStars`), so
  four clears in a run shows ⭐⭐⭐⭐ in both places.
- Stars reset on a new run along with the rest of the run statistics.
- Styling keeps the stars smaller than the score and allows them to wrap, so a long run
  cannot push the layout sideways.

### 3. Feedback archiving

- The three Stage 4 execution records were moved into `PLAN_FEEDBACK_ARCHIVED.md` under
  `## Archived 2026-10-25 — Stage 4 complete (all three sub-phases) — CLOSED`.
- This file now contains only the two unresolved items (9.3, 9.5), the Planning Agent
  action item above, and this record.

### Verification actually performed

| Command / check | Result |
|---|---|
| `node physics.test.js` | PASS |
| `node gameplay.test.js` | 48 / 0 |
| `node name-filter.test.js` | 33 / 0 |
| `node stage2.test.js` | 118 / 0 |
| `node stage3.test.js` | 114 / 0 |
| `node stage4.test.js` | 108 / 0 |
| `node stage4-followup.test.js` | 74 / 0 |
| `node stage4-phase2.test.js` | **170 / 0** (was 157; star and bonus assertions added) |
| Browser 1280×900 | chain note shows 800; 4 clears → ⭐⭐⭐⭐ after score; panel label 「合成神奶蛙」 reads 4 |
| Browser 320×568 | stars visible, stats render on one column without truncation, footer not overlapped, `scrollWidth == 320` |
| Browser 390×844 | same, `scrollWidth == 390` |
| Browser: page/console errors | none |
| Browser: external network requests | **0** |

### Deviations and judgement calls

1. **Narrow-screen stats switched to a single column.** With the star row added, the two-column
   statistic grid at 320 px clipped values (「×1」 rendered as 「×」). One column per row keeps
   all five values readable; this is a layout fix forced by the new content, not a redesign.
2. **`--topbar` raised from 104 px to 122 px** so the extra star row does not push the board
   into the footer.
3. **Old assertions updated rather than deleted.** `gameplay.test.js` and `stage3.test.js`
   asserted `MAX_BONUS === 500`; they now assert `800` with a note that the owner raised it.
4. **`stage4-phase2.test.js` gained section [O]** covering the counter, the star rendering in
   both locations, reset behaviour, and a real two-神奶蛙 collision to prove the increment is
   driven by actual gameplay rather than a manual counter write.

### Version

Footer is `v4-<hash>` pointing at this task's substantive commit; `VERSION_HISTORY.md`
carries the matching `v. Stage 4-<hash>` entry at the top of the newest-first list. Stage
stayed **4**.

---

## Deployment announcement — documentation update

The owner confirmed the project is publicly playable at **<https://naiwa.tianyimc.com/>**.
Documentation was updated to match.

### Verified before editing

| Check | Result |
|---|---|
| DNS for `naiwa.tianyimc.com` | resolves |
| `GET https://naiwa.tianyimc.com/` | **HTTP 200**, no redirect |
| Served `<title>` | 合成大奶蛙Pro |
| Served chain note | 「换 800 分 + 一枚复活币」 |
| Served footer version | `v4-19fa` |

So the deployment serves this repository's current build, not an older snapshot.

### Files changed

- **`README.md`** — replaced the 「本项目目前没有对外公布的线上地址」 bullet with a new
  「🎮 在线玩」 section carrying the live URL, and reworded the deployment note under 「运行」.
- **`index.html`** — added an 「在线玩」 link to the page footer beside the author and
  repository links, using the same `target="_blank"` + `rel="noopener noreferrer"` +
  `aria-label` pattern as the other footer links.

### Note on the pinned rule

This change deliberately contradicts the pinned bullet that forbids direct-play URLs. The
owner's direct instruction takes precedence, and the bullet is now factually wrong — see the
"Action required by the Planning Agent" section above for the requested rewrite.

### Verification performed

| Check | Result |
|---|---|
| `node physics.test.js` | PASS |
| `node gameplay.test.js` | 48 / 0 |
| `node name-filter.test.js` | 33 / 0 |
| `node stage2.test.js` | 118 / 0 |
| `node stage3.test.js` | 114 / 0 |
| `node stage4.test.js` | 108 / 0 |
| `node stage4-followup.test.js` | 74 / 0 |
| `node stage4-phase2.test.js` | 170 / 0 |
| Browser 1280×900 / 320×568 | footer shows the 在线玩 link, no horizontal overflow |
