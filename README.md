# Final Fealty Tactics — *The Chronicle of the Twelve Braves*

A complete, low‑poly tactical RPG for the browser, built with **three.js (r186)** and rendered with
**WebGPU** (falling back to **WebGL 2** and **WebGL 1**). A spiritual successor to the great isometric
war‑drama tactics games of the late '90s: a youngest son of a noble house and his low‑born best friend,
a war of succession between two Lions, a Church that burns heretics, and demons sleeping in holy stones.

Everything — story, dialogue, maps, models, music and sound — is original and generated procedurally
in code. No external art or audio files.

## Running

```bash
npm install
npm run dev        # http://localhost:5173  (development)
npm run build      # production bundle in dist/
npm run preview    # serve dist/ at http://localhost:4173
```

Renderer selection is automatic: **WebGPU → WebGL 2 → WebGL 1**. Force one with
`?renderer=webgpu|webgl2|webgl1`, and quality with `?quality=ultra|high|medium|low`
(or in Options). Desktop class GPUs default to *ultra* (SSAO, bloom, depth of field, SMAA,
4K shadow maps); phones default to *medium/low*.

## What's in the game

* **Full campaign** — Prologue + 4 chapters, ~54 story battles, 150+ cutscenes with full dialogue,
  chapter cards, a narrated epilogue and credits.
* **Side content** — the colliery quest (Beorn & the dragon Rhosyn), the ancient automaton, the
  otherworld swordsman, the ten-floor **Midnight Deep** dungeon, rare battles, 50+ tavern errands,
  50+ rumours, artefacts, the thirteen Zodiac Stones, the Chronicle (events, persons, artefacts, stones, records).
* **Battle system** — CT-based turn order, charge times, height/jump/leaps, facing & evasion, Brave/Faith,
  zodiac compatibility, 35+ status effects, reactions/supports/movement abilities, crystals & chests,
  permadeath (or Gentle mode), Move-Find treasure, knockback, poaching, inviting monsters.
* **20 generic jobs** in the classic job tree + 16 unique character jobs + boss classes, ~575 abilities,
  ~290 items, 48 monsters across 16 families (+ bosses), monster eggs.
* **World map** of Ivaldis with towns (outfitter, soldier office, tavern, fur shop), random encounters,
  a calendar and errands.
* **Save slots** (8, incl. autosave), options, "How to Play".

## Controls

| | Keyboard | Mouse / Touch | Gamepad |
|---|---|---|---|
| Move cursor | Arrows / WASD | hover / tap | D-pad / stick |
| Confirm | Enter / Space / Z | click / tap again | A |
| Back | Esc / Backspace / X | right-click | B |
| Rotate camera | Q / E | drag | LB / RB |
| Zoom | + / − | wheel / pinch | LT / RT |
| High angle | R | | |
| Turn order | Tab | | Select |
| Fast-forward | hold Shift | | |

## Project layout

```
src/battle/     headless battle engine (CT loop, formulas, statuses, reactions, AI) — deterministic
src/data/       all content as typed data (jobs, abilities, items, monsters, cast, maps, battles, scenes, story)
src/game/       game state, saves, battle setup, story flow, world travel
src/gfx/        renderer bootstrap, post-processing (TSL), terrain, props, models, animation, VFX, portraits
src/scenes/     battle stage, unit views, battle controller, cutscene runner, world map
src/ui/         DOM UI: widgets, battle HUD, menus (formation, town, chronicle, options)
src/audio/      Web Audio synthesizer, sequencer, original score and sound effects
docs/DESIGN.md  naming bible, story outline, content conventions
tools/          content validator, campaign simulator, screenshot helpers
```

Checks: `npm run typecheck`, `npm test`, `npm run validate` (content cross-references),
`npx vite-node tools/simcampaign.ts` (AI-vs-AI simulation of every battle, including scripted events).

Debug URLs. The `?test=`, `auto`, `autoplay` and `quickwin` hooks start throwaway parties that overwrite the
autosave, so they only work on the dev server or a local `npm run preview` (localhost); a deployed site ignores
them. `dev.html` and `audio-test.html` are dev-server pages and are not part of the production build.

| Parameter | Effect |
|---|---|
| `?renderer=webgpu\|webgl2\|webgl1&quality=ultra\|high\|medium\|low` | force a backend / quality preset |
| `?test=battle&id=b_galwyn&lv=8&auto=1` | play one battle (auto = AI controls your side too) |
| `?test=scene&id=sc_pro_alazar` | play one cutscene |
| `?test=side&id=sq_rare_monks&lv=38` | play one side-quest step |
| `?test=campaign&autoplay=1&quickwin=1` | run the whole story unattended (quickwin skips the fighting) |
| `dev.html?map=orvelle_court&jobs=knight,wizard` | map / model viewer |
| `audio-test.html` | audition every music track and sound effect |
