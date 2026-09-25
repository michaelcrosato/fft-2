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
4K shadow maps); phones default to *medium/low*. With quality on *Auto*, the game steps the preset down if frames
stay slow. If the GPU device is lost (driver reset, mobile tab reclaimed) the game offers a reload, and falls back to
WebGL 2 for the rest of the session if it happens twice.

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

| | Keyboard | Mouse / Touch | Gamepad (Xbox layout) |
|---|---|---|---|
| Move cursor | Arrows / WASD | hover / tap | D-pad / left stick |
| Confirm | Enter / Space / Z | click / tap (info lists: tap to select, tap again to choose) | A |
| Back | Esc / Backspace / X | right-click, the ✕ on menus, the **‹ Back** button | B |
| Menu | M | ☰ Menu button | Start / Y |
| Orbit camera | Q / E (90° steps) | drag (settles on a corner) · ⟲ ⟳ buttons | right stick (free) · LB / RB (90°) |
| Tilt | R (high angle) | drag up/down · tilt button | right stick up/down · L3 |
| Zoom | + / − | wheel · trackpad pinch · two-finger pinch · hold 🔍 buttons | LT / RT (analog) |
| Pan | arrows when no menu is open (enemy turns) | right-drag · Shift+drag · two-finger drag | — (follows the cursor) |
| Recenter | F / Home | ◎ button | R3 |
| Turn order | Tab | | View / Back |
| Fast-forward | hold Shift | | hold X |

The round camera buttons sit at the bottom of the battlefield (right edge on phones). The camera stays under your
control for the whole battle, including enemy turns. Controllers are detected on connect (standard mapping; PlayStation
and Switch pads work in the equivalent positions) and rumble on heavy hits where the browser supports it.

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

Cross-browser / mobile end-to-end tests (Playwright; builds, then serves `dist/` on port 4173):

```bash
npm run test:e2e           # everything: desktop Chromium, Firefox, WebKit (Safari's engine) + phones/tablet
npm run test:e2e:desktop   # chromium, firefox, webkit at 1280×720
npm run test:e2e:mobile    # Pixel 10 (Chromium), iPhone 17 Pro, iPhone SE, landscape iPhone, iPad Pro (WebKit)
npx playwright test --project=mobile-safari -g gamepad    # one project / one test
npx playwright show-report e2e-report                     # screenshots, traces of failures
```

They cover boot and rendering, the new-game flow, battle camera controls (buttons, mouse, a simulated gamepad),
the HUD layout on every screen size (no overlaps, nothing off-screen, no sideways scrolling), and console errors.
Headless Chromium renders WebGL 2 with software GL (set `E2E_RENDERER=webgpu` on a machine whose headless Chrome has a
working GPU). Real iOS Safari can't run on Linux/Windows: the WebKit iPhone/iPad profiles are the closest automated
check; use a real device for the final word.

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
