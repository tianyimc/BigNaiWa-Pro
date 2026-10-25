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

### 9.5 Deployment chain unverified

It is still unknown whether pushing `origin/main` publishes a site, and which repository is
canonical. `origin` is `tianyimc/BigNaiWa-Pro`; the historically referenced Pages URL was
`yhsome.github.io/BigNaiWa/`. A live check earlier in this project confirmed the `yhsome`
site served the old redirect page; nothing proves it redeploys from this repository.
Marked **未确定**.

This is consistent with the pinned rule in `PLAN.md`: hosting status is unverified and a Git
push is not evidence of deployment. No deployment has been attempted or authorized.

---

---

## Action required by the Planning Agent — archive completed plan content

`PLAN.md` still carries the full Stage 4 plan text (both the base task and the second-phase
task) in its active section. All of it is now implemented, tested and pushed, so per the
pinned lifecycle rule the Planning Agent should:

1. **Move the completed Stage 4 content into `PLAN_ARCHIVED.md`** with a dated/status
   heading, following the existing archive convention. Do not overwrite earlier entries.
2. **Keep the pinned section in `PLAN.md`** — it is never archived.
3. **Update the plan text where the owner overrode it.** Specifically, `PLAN.md` §B of the
   second-phase plan still says the hidden grant "must not fill or alter the other item
   inventories", but the owner directed that it fill **all four** items (hammer 2, magnet 2,
   fan 2, shield 1, with shield skipped once used). Any re-issued plan should state the
   current behaviour, not the superseded one.
4. **Reflect the closing task** in the archive entry: the top-tier clear bonus is now
   **800** points (was 500), the run statistic previously called 「顶级清场」 is now
   「合成神奶蛙」 and renders one ⭐ per clear after the score, and the narrow-screen HUD was
   adjusted for the extra star row.
5. Replace the active section with the next authorized task, or leave `PLAN.md` with only
   the pinned section if nothing is queued.

The Execution Agent cannot perform any of the above: `PLAN.md` and `PLAN_ARCHIVED.md` are
Planning Agent files.

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
