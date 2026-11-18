# Final Fealty Tactics — *The Chronicle of the Twelve Braves*

A complete, low‑poly tactical RPG for the browser, built with **three.js (r186)** and rendered with
**WebGPU** (falling back to **WebGL 2** and **WebGL 1**). A spiritual successor to the great isometric
war‑drama tactics games of the late '90s: a youngest son of a noble house and his low‑born best friend,
a war of succession between two Lions, a Church that burns heretics, and demons sleeping in holy stones.

Story, dialogue, maps, models, music and sound are all made for this game, in code: there are no
recordings, images or other third-party assets.

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

The Chronicle also includes a **48-species bestiary** with arts, resistances, recruitment,
poach rewards and known habitats, plus an **atlas** of unlocked places and their services.
Optional quest milestones, character biographies and Zodiac Stone records fill in as you
progress. See [content reference notes](docs/CONTENT_SOURCES.md) for the research sources,
access limitations and adaptation choices behind the expanded content.

## Controls

Every **New Game**, **Continue**, and saved-game load asks whether to enable **Fullscreen Game Mode**.
Choose **Enable Game Mode** for fullscreen, edge-swipe/overscroll protection and a screen wake lock
where supported, or **Play in Browser** to continue normally. The choice is never remembered or forced.
Switch it on or off from the **Menu** (**Fullscreen** / **Exit Fullscreen**), or use **Esc** or **Options → Game Mode**;
returning to the title also turns it off. Fullscreen covers both the battlefield and all game menus.

**Menu** sits in the top-right corner during deployment, battles, cutscenes and world-map travel
(**M**, **Start** or **Y** open it too); **Skip** appears in the top-left corner while a scene plays.
In battles, cutscenes and during travel, Menu pauses the action while you change Options, read How to Play,
or return to the title (with confirmation before discarding unsaved progress). Resume returns to
the same point. On the idle world map, Menu retains the party, chronicle, save and load actions.
**Skip** uses an opaque background and a full-size touch target.

Browsers retain their own escape controls and devices can still handle system gestures (such as Home,
app switching, or OS back swipes). If fullscreen is unsupported or denied, Game Mode keeps the available
gesture protections and explains the limitation. Gamepad-only activation may need a tap or keyboard
press through Options to enter fullscreen. Screen wake lock is optional and released in the background.

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
| Skip a cutscene | M | Skip ⏭ button | Start / Y |

The round camera buttons sit at the bottom of the battlefield (right edge on phones). On touch screens a tile is
chosen with two taps (the first shows it, the second confirms), and so is a place on the world map; Back from the
facing step returns to the command menu. The camera stays under your
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
src/audio/      the synthesizer: instruments, sequencer, the original score (score/) and sound effects
docs/DESIGN.md  naming bible, story outline, content conventions
tools/          content validator, campaign simulator, audio verification, 52in1 package and checks (hub/)
```

Checks: `npm run typecheck`, `npm test`, `npm run validate` (content cross-references),
`npm run sim` (AI-vs-AI simulation of every battle, including scripted events; fails on a stall or exception).
GitHub Actions (`.github/workflows/ci.yml`) runs these and a Chromium boot smoke test on every push to
`main` and every pull request. Use Node 22 (`.nvmrc`).
Every commit ships immediately: `npm run ship` pushes and merges it into `main` (see `AGENTS.md`).

See the [repository audit](docs/REPO_AUDIT.md) for recent bug fixes, cleanup and deployment checks.

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

On Linux or WSL with Docker, the compatibility runner supplies the browsers, their native libraries,
and a virtual X display from the [official Playwright image](https://playwright.dev/docs/docker).
The image version matches the installed Playwright package (currently 1.63.0). Xvfb plus software
Mesa makes WebGL available in Firefox and WebKit even when the host's headless setup cannot provide it.
No GUI is required. Audio playback tests additionally use a userspace `pulseaudio` binary;
the runner creates a private null sink and removes it on exit. This supplies the output device
Firefox needs to advance its Web Audio clock without playing sound on the host desktop.

```bash
./tools/browser-test.sh --probe       # boot the game in all 3 engines, in both WebGL 2 and WebGL 1
./tools/browser-test.sh               # full desktop + phone/tablet suite
./tools/browser-test.sh --project=webkit -g 'boots to the title'
npx playwright show-report tools/out/compatibility/docker-report
```

Run `npm install` first and keep the Docker daemon running. The runner installs locked dependencies
inside a cache beneath `~/.cache/final-fealty-tactics/` (`XDG_CACHE_HOME` is respected), with separate
build output so it does not replace the host's `dist/` or `node_modules/`. Its anonymous Docker config
also avoids broken Windows credential helpers on WSL. Screenshots, traces and reports are written to
`tools/out/compatibility/`; one container run per project can use that output at a time. Tests use one
worker by default; set `E2E_WORKERS=2` to increase concurrency. These runs verify software-rendered
WebGL and emulated mobile layouts; WebGPU, physical controllers and actual iOS Safari still need
hardware checks.

Startup, title/world-map changes, cutscene maps, deployment and battle starts show a
loading overlay with an animated indicator and a description of the current step.
It stays up through scene construction and the first complete rendered frames; cutscenes
place their opening actors and camera before revealing the scene. Menu and Game Mode exit
remain accessible while loading. Reduced-motion preferences stop the spinner animation,
and preparation failures offer a reload instead of leaving an unexplained black screen.
Entering fullscreen also keeps open menus and their Exit control above the canvas in Safari.
The world map reuses its fixed terrain data on subsequent visits, and loading no longer
warms an unused rendering path before preparing the actual post-processing output.

For faster interaction regression runs after the default-quality graphics sweep, use
`E2E_QUALITY=low E2E_WORKERS=2 ./tools/browser-test.sh`. Without that override, tests retain
their normal automatic quality selection.

Debug URLs. The `?test=`, `auto`, `autoplay` and `quickwin` hooks start throwaway parties that overwrite the
autosave, so they only work on the dev server or a local `npm run preview` (localhost); a deployed site ignores
them. `dev.html` and `audio-test.html` are dev-server pages and are not part of the production build.

| Parameter | Effect |
|---|---|
| `?renderer=webgpu\|webgl2\|webgl1&quality=ultra\|high\|medium\|low` | force a backend / quality preset |
| `?test=battle&id=b_galwyn&lv=8&auto=1` | play one battle (auto = AI controls your side too) |
| `?test=scene&id=sc_pro_alazar` | play one cutscene |
| `?test=side&id=sq_rare_monks&lv=38` | play one side-quest step |
| `?test=chronicle` | browse the Chronicle with a fresh throwaway party |
| `?test=campaign&autoplay=1&quickwin=1` | run the whole story unattended (quickwin skips the fighting) |
| `dev.html?map=orvelle_court&jobs=knight,wizard` | map / model viewer |
| `audio-test.html` | audition every music track and sound effect |


## Music and sound

Everything the game plays is synthesized in the browser; nothing is downloaded. There are no voices:
dialogue is text, and creature calls are wings and rumbles.

- **The score** (`src/audio/score/`): 24 cues composed for this game on five leitmotifs — the
  Chronicle (the main theme), Fealty (Rhen and Delan), the Sanctum (the Church's chant), the Banner
  (war) and Oriane. Each cue is written as notes and chords in a small notation (`score/dsl.ts`); the
  audition page lists each one's key, tempo and room.
- **The instruments** (`src/audio/instruments.ts`): sustained voices (strings, choir, flute, reed,
  horn, brass, organ, bass) are oscillators with their own spectra, filters and vibrato; plucked,
  struck and percussion instruments (harp, lute, pizzicato, dulcimer, bells, timpani, drums) are
  short samples rendered once at start-up from the procedures in `dsp.ts`.
- **The sequencer** (`src/audio/sequencer.ts`) schedules a quarter of a second ahead from each cue's
  timeline, so an intro leads into a body that loops seamlessly.
- **Sound effects** (`src/audio/sfx.ts`): 58 effects, each its own design, rendered on first use.
- **The mix**: music and effects buses, a reverb per room and a limiter. Crossfades, ducking under
  stings, panning, pitch and background suspension all work as before. Phones and the lowest
  graphics preset use lighter synthesis (one voice per note, no reverb).
- **In 52in1** the player's music and effects volumes (`window.AIHubSettings`) multiply the game's
  own; 52in1 applies its master volume itself.

Audition everything at `audio-test.html` on `npm run dev`, with a *Measure* button per cue.

```bash
npm run audio:verify            # renders every cue offline in Chromium: clipping, loudness, DC, loop seams, render cost
npm run audio:verify -- --low   # the same with the phones' lighter synthesis
```
