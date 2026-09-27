# Final Fealty Tactics — *The Chronicle of the Twelve Braves*

A complete, low‑poly tactical RPG for the browser, built with **three.js (r186)** and rendered with
**WebGPU** (falling back to **WebGL 2** and **WebGL 1**). A spiritual successor to the great isometric
war‑drama tactics games of the late '90s: a youngest son of a noble house and his low‑born best friend,
a war of succession between two Lions, a Church that burns heretics, and demons sleeping in holy stones.

Story, dialogue, maps and models are generated in code. This **internal, non-commercial test build**
uses third-party **Final Fantasy Tactics audio placeholders**. See the complete asset catalogue below.

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
src/audio/      file playback engine and the single audio manifest
public/audio/   bundled Final Fantasy Tactics audio placeholders
docs/DESIGN.md  naming bible, story outline, content conventions
tools/          content validator, campaign simulator, screenshot helpers
```

Checks: `npm run typecheck`, `npm test`, `npm run validate` (content cross-references),
`npm run sim` (AI-vs-AI simulation of every battle, including scripted events; fails on a stall or exception).
GitHub Actions (`.github/workflows/ci.yml`) runs these and a Chromium boot smoke test on every push to
`main` and every pull request. Use Node 22 (`.nvmrc`), the version Vercel builds with.
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


## Placeholder audio (internal testing)

All audio is selected through [`src/audio/manifest.json`](src/audio/manifest.json). Its `music` and
`sfx` maps preserve stable gameplay cue names; `assets` records local paths and exact provenance.
There are no external audio requests at runtime and no synthesized fallback. Unknown SFX use the
manifest's `fallbackSfx` cue. Music streams from local MP3 files; short effects are decoded and
cached after the first user gesture. Music crossfades, volume controls, ducking, pan, pitch,
background suspension and the dev audition page remain available.

Audio requests include their manifest checksum in the URL. Vercel caches these versioned
files for a year in the browser; replacing a file changes its cache key automatically.
Unversioned URLs and the entry HTML still revalidate so updated content is not hidden by caching.

All 24 music files are already compressed to 128 kbps stereo MP3. Only the requested music
is streamed, and scene changes do not wait for a full track download or PCM decode.

The music and five reward stings come from **Final Fantasy Tactics (PlayStation, 1997)** via
[Zophar’s Domain](https://www.zophar.net/music/playstation-psf/final-fantasy-tactics).
The UI and event effects come from **Final Fantasy Tactics: The Ivalice Chronicles (PC, 2025)** via
The Sounds Resource’s [User Interface pack](https://sounds.spriters-resource.com/pc_computer/finalfantasytacticstheivalicechronicles/asset/488628/)
and [Atmospheric Sounds pack](https://sounds.spriters-resource.com/pc_computer/finalfantasytacticstheivalicechronicles/asset/488629/).
Both Sounds Resource packs were uploaded by **Dark_Ansem**.
These are temporary third-party assets, not original or permissively licensed project audio.
Square / Square Enix retain their rights. Soundtrack composers: Hitoshi Sakimoto and Masaharu Iwata.
Replace these files with cleared original audio before public or commercial distribution.

The available remaster effects are deliberately reused across some battle cues: for example,
`fire` and `ice` share the magic event, and `hitHeavy` and `meteor` share the Worker 8 attack.
These are functional stand-ins, not a claim of exact original-game cue matching. `roar` pitches
the chocobo effect down; `textBlip` selects its first 30 ms. The manifest records these adjustments.
Music retains the source tracks' fade tails, so whole-track looping includes that fade rather than
claiming seamless original sequence loops. The table lists **every bundled audio file**, including
all the cues that share it, the exact archive member or soundtrack filename, and its source links.

To replace placeholders without editing gameplay or playback code:

1. Put replacement browser-compatible MP3/WAV files in `public/audio/` (other supported formats
   also work). Retain cue names in `music`/`sfx`; change their `asset` references as needed.
2. Edit only the JSON manifest: set each asset's `src` relative to `public/`, title, game/project,
   source/credit information, processing notes, duration in seconds and SHA-256. `source.sha256`
   identifies the original downloaded file or extracted archive member; `sha256` identifies the
   bundled file. For your own audio, use your source repository/asset URL and original master hash.
   Compute a file hash with `sha256sum path/to/file`; read duration with `ffprobe`.
3. Adjust cue `gain`, music `loop`, and SFX `pitch`, `gapMs`, `offset`/`duration` in the same manifest.
   Remove unused old asset entries and files. No call-site changes are necessary.
4. Run `npm run audio:catalog`, then `npm run build` and `npm test`. The build checks file hashes,
   missing references, stray audio files and README catalogue drift. A rebuild picks up JSON changes.
   Audition the replacements at `audio-test.html` using `npm run dev`.

Audio-specific browser checks:

```bash
npm run audio:verify -- http://127.0.0.1:5173/  # use the actual running dev-server URL
# Decodes all 61 assets, checks every effect excerpt, plays all 24 tracks through
# the real mixer, and stresses SFX cleanup. Results: tools/out/audio-verification/.
E2E_QUALITY=low ./tools/browser-test.sh e2e/audio.spec.ts
# Checks production playback in desktop and emulated mobile browser profiles.
```

<!-- audio-catalogue:start -->
| Bundled placeholder | Cue(s) | Original source file / archive member | Source | Processing |
|---|---|---|---|---|
| `public/audio/fft/ost-101.mp3` | `music.title` | 101 Bland Logo ~ Title Back.mp3 | [Source](https://www.zophar.net/music/playstation-psf/final-fantasy-tactics) · [Download](https://fi.zophar.net/soundfiles/playstation-psf/final-fantasy-tactics/101%20Bland%20Logo%20~%20Title%20Back.mp3) | Full track; MP3 128 kbps stereo; source fade retained. |
| `public/audio/fft/ost-102.mp3` | `music.prologue` | 102 Backborn Story.mp3 | [Source](https://www.zophar.net/music/playstation-psf/final-fantasy-tactics) · [Download](https://fi.zophar.net/soundfiles/playstation-psf/final-fantasy-tactics/102%20Backborn%20Story.mp3) | Full track; MP3 128 kbps stereo; source fade retained. |
| `public/audio/fft/ost-109.mp3` | `music.battle1` | 109 Trisection.mp3 | [Source](https://www.zophar.net/music/playstation-psf/final-fantasy-tactics) · [Download](https://fi.zophar.net/soundfiles/playstation-psf/final-fantasy-tactics/109%20Trisection.mp3) | Full track; MP3 128 kbps stereo; source fade retained. |
| `public/audio/fft/ost-112.mp3` | `music.battle2` | 112 Unavoidable Battle.mp3 | [Source](https://www.zophar.net/music/playstation-psf/final-fantasy-tactics) · [Download](https://fi.zophar.net/soundfiles/playstation-psf/final-fantasy-tactics/112%20Unavoidable%20Battle.mp3) | Full track; MP3 128 kbps stereo; source fade retained. |
| `public/audio/fft/ost-113.mp3` | `music.victory` | 113 Mission Complete.mp3 | [Source](https://www.zophar.net/music/playstation-psf/final-fantasy-tactics) · [Download](https://fi.zophar.net/soundfiles/playstation-psf/final-fantasy-tactics/113%20Mission%20Complete.mp3) | Full track; MP3 128 kbps stereo; source fade retained. |
| `public/audio/fft/ost-114.mp3` | `music.heroic` | 114 Hero's Theme.mp3 | [Source](https://www.zophar.net/music/playstation-psf/final-fantasy-tactics) · [Download](https://fi.zophar.net/soundfiles/playstation-psf/final-fantasy-tactics/114%20Hero%27s%20Theme.mp3) | Full track; MP3 128 kbps stereo; source fade retained. |
| `public/audio/fft/ost-115.mp3` | `music.church` | 115 A Chapel.mp3 | [Source](https://www.zophar.net/music/playstation-psf/final-fantasy-tactics) · [Download](https://fi.zophar.net/soundfiles/playstation-psf/final-fantasy-tactics/115%20A%20Chapel.mp3) | Full track; MP3 128 kbps stereo; source fade retained. |
| `public/audio/fft/ost-117.mp3` | `music.worldmap` | 117 World Map.mp3 | [Source](https://www.zophar.net/music/playstation-psf/final-fantasy-tactics) · [Download](https://fi.zophar.net/soundfiles/playstation-psf/final-fantasy-tactics/117%20World%20Map.mp3) | Full track; MP3 128 kbps stereo; source fade retained. |
| `public/audio/fft/ost-118.mp3` | `music.town` | 118 Shop.mp3 | [Source](https://www.zophar.net/music/playstation-psf/final-fantasy-tactics) · [Download](https://fi.zophar.net/soundfiles/playstation-psf/final-fantasy-tactics/118%20Shop.mp3) | Full track; MP3 128 kbps stereo; source fade retained. |
| `public/audio/fft/ost-121.mp3` | `music.formation` | 121 Team Making.mp3 | [Source](https://www.zophar.net/music/playstation-psf/final-fantasy-tactics) · [Download](https://fi.zophar.net/soundfiles/playstation-psf/final-fantasy-tactics/121%20Team%20Making.mp3) | Full track; MP3 128 kbps stereo; source fade retained. |
| `public/audio/fft/ost-123.mp3` | `music.tavern` | 123 Pub.mp3 | [Source](https://www.zophar.net/music/playstation-psf/final-fantasy-tactics) · [Download](https://fi.zophar.net/soundfiles/playstation-psf/final-fantasy-tactics/123%20Pub.mp3) | Full track; MP3 128 kbps stereo; source fade retained. |
| `public/audio/fft/ost-128.mp3` | `music.boss` | 128 Decisive Battle.mp3 | [Source](https://www.zophar.net/music/playstation-psf/final-fantasy-tactics) · [Download](https://fi.zophar.net/soundfiles/playstation-psf/final-fantasy-tactics/128%20Decisive%20Battle.mp3) | Full track; MP3 128 kbps stereo; source fade retained. |
| `public/audio/fft/ost-130.mp3` | `music.somber` | 130 Remnants.mp3 | [Source](https://www.zophar.net/music/playstation-psf/final-fantasy-tactics) · [Download](https://fi.zophar.net/soundfiles/playstation-psf/final-fantasy-tactics/130%20Remnants.mp3) | Full track; MP3 128 kbps stereo; source fade retained. |
| `public/audio/fft/ost-132.mp3` | `music.tension` | 132 Tension 1.mp3 | [Source](https://www.zophar.net/music/playstation-psf/final-fantasy-tactics) · [Download](https://fi.zophar.net/soundfiles/playstation-psf/final-fantasy-tactics/132%20Tension%201.mp3) | Full track; MP3 128 kbps stereo; source fade retained. |
| `public/audio/fft/ost-133.mp3` | `music.defeat` | 133 Game Over.mp3 | [Source](https://www.zophar.net/music/playstation-psf/final-fantasy-tactics) · [Download](https://fi.zophar.net/soundfiles/playstation-psf/final-fantasy-tactics/133%20Game%20Over.mp3) | Full track; MP3 128 kbps stereo; source fade retained. |
| `public/audio/fft/ost-136.mp3` | `music.romance` | 136 Ovelia's Theme.mp3 | [Source](https://www.zophar.net/music/playstation-psf/final-fantasy-tactics) · [Download](https://fi.zophar.net/soundfiles/playstation-psf/final-fantasy-tactics/136%20Ovelia%27s%20Theme.mp3) | Full track; MP3 128 kbps stereo; source fade retained. |
| `public/audio/fft/ost-139.mp3` | `music.battle3` | 139 Run Past Through the Plain.mp3 | [Source](https://www.zophar.net/music/playstation-psf/final-fantasy-tactics) · [Download](https://fi.zophar.net/soundfiles/playstation-psf/final-fantasy-tactics/139%20Run%20Past%20Through%20the%20Plain.mp3) | Full track; MP3 128 kbps stereo; source fade retained. |
| `public/audio/fft/ost-210.mp3` | `music.campfire` | 210 Under the Stars.mp3 | [Source](https://www.zophar.net/music/playstation-psf/final-fantasy-tactics) · [Download](https://fi.zophar.net/soundfiles/playstation-psf/final-fantasy-tactics/210%20Under%20the%20Stars.mp3) | Full track; MP3 128 kbps stereo; source fade retained. |
| `public/audio/fft/ost-219.mp3` | `music.umbral` | 219 The Impure.mp3 | [Source](https://www.zophar.net/music/playstation-psf/final-fantasy-tactics) · [Download](https://fi.zophar.net/soundfiles/playstation-psf/final-fantasy-tactics/219%20The%20Impure.mp3) | Full track; MP3 128 kbps stereo; source fade retained. |
| `public/audio/fft/ost-226.mp3` | `music.finalBoss` | 226 Ultema, the Perfect Body.mp3 | [Source](https://www.zophar.net/music/playstation-psf/final-fantasy-tactics) · [Download](https://fi.zophar.net/soundfiles/playstation-psf/final-fantasy-tactics/226%20Ultema%2C%20the%20Perfect%20Body.mp3) | Full track; MP3 128 kbps stereo; source fade retained. |
| `public/audio/fft/ost-227.mp3` | `music.chapter` | 227 Fanfare.mp3 | [Source](https://www.zophar.net/music/playstation-psf/final-fantasy-tactics) · [Download](https://fi.zophar.net/soundfiles/playstation-psf/final-fantasy-tactics/227%20Fanfare.mp3) | Full track; MP3 128 kbps stereo; source fade retained. |
| `public/audio/fft/ost-229.mp3` | `music.credits` | 229 Staff Credit.mp3 | [Source](https://www.zophar.net/music/playstation-psf/final-fantasy-tactics) · [Download](https://fi.zophar.net/soundfiles/playstation-psf/final-fantasy-tactics/229%20Staff%20Credit.mp3) | Full track; MP3 128 kbps stereo; source fade retained. |
| `public/audio/fft/ost-903.mp3` | `sfx.victory` | 903 Award 1 - Completed.mp3 | [Source](https://www.zophar.net/music/playstation-psf/final-fantasy-tactics) · [Download](https://fi.zophar.net/soundfiles/playstation-psf/final-fantasy-tactics/903%20Award%201%20-%20Completed.mp3) | Full track; MP3 128 kbps stereo; source fade retained. |
| `public/audio/fft/ost-904.mp3` | `sfx.defeat` | 904 Award 2 - Unlucky.mp3 | [Source](https://www.zophar.net/music/playstation-psf/final-fantasy-tactics) · [Download](https://fi.zophar.net/soundfiles/playstation-psf/final-fantasy-tactics/904%20Award%202%20-%20Unlucky.mp3) | Full track; MP3 128 kbps stereo; source fade retained. |
| `public/audio/fft/ost-905.mp3` | `sfx.jobUp` | 905 Job Level Up S.mp3 | [Source](https://www.zophar.net/music/playstation-psf/final-fantasy-tactics) · [Download](https://fi.zophar.net/soundfiles/playstation-psf/final-fantasy-tactics/905%20Job%20Level%20Up%20S.mp3) | Full track; MP3 128 kbps stereo; source fade retained. |
| `public/audio/fft/ost-911.mp3` | `sfx.levelUp` | 911 Level Up S.mp3 | [Source](https://www.zophar.net/music/playstation-psf/final-fantasy-tactics) · [Download](https://fi.zophar.net/soundfiles/playstation-psf/final-fantasy-tactics/911%20Level%20Up%20S.mp3) | Full track; MP3 128 kbps stereo; source fade retained. |
| `public/audio/fft/ost-915.mp3` | `sfx.learn` | 915 Job Change.mp3 | [Source](https://www.zophar.net/music/playstation-psf/final-fantasy-tactics) · [Download](https://fi.zophar.net/soundfiles/playstation-psf/final-fantasy-tactics/915%20Job%20Change.mp3) | Full track; MP3 128 kbps stereo; source fade retained. |
| `public/audio/fft/ost-969.mp3` | `music.ending` | 969 Epilogue.mp3 | [Source](https://www.zophar.net/music/playstation-psf/final-fantasy-tactics) · [Download](https://fi.zophar.net/soundfiles/playstation-psf/final-fantasy-tactics/969%20Epilogue.mp3) | Full track; MP3 128 kbps stereo; source fade retained. |
| `public/audio/fft/ost-980.mp3` | `music.dungeon` | 980 Deep Dungeon.mp3 | [Source](https://www.zophar.net/music/playstation-psf/final-fantasy-tactics) · [Download](https://fi.zophar.net/soundfiles/playstation-psf/final-fantasy-tactics/980%20Deep%20Dungeon.mp3) | Full track; MP3 128 kbps stereo; source fade retained. |
| `public/audio/fft/ui-031.wav` | `sfx.cursor` | FFTIC UI Sounds/sound_enhanced_ui#31 (sound_enhanced_ui-se_ui_world_cursor_stick).wav | [Source](https://sounds.spriters-resource.com/pc_computer/finalfantasytacticstheivalicechronicles/asset/488628/) · [Download](https://sounds.spriters-resource.com/media/assets/473/488628.zip?updated=1760875568) | PCM WAV mono 22050 Hz; full effect. |
| `public/audio/fft/ui-001.wav` | `sfx.confirm` | FFTIC UI Sounds/sound_enhanced_ui#1 (sound_enhanced_ui-se_ui_com_decision_mini).wav | [Source](https://sounds.spriters-resource.com/pc_computer/finalfantasytacticstheivalicechronicles/asset/488628/) · [Download](https://sounds.spriters-resource.com/media/assets/473/488628.zip?updated=1760875568) | PCM WAV mono 22050 Hz; full effect. |
| `public/audio/fft/ui-034.wav` | `sfx.cancel` | FFTIC UI Sounds/sound_enhanced_ui#34 (sound_enhanced_ui-se_ui_sortie_cancel_unit).wav | [Source](https://sounds.spriters-resource.com/pc_computer/finalfantasytacticstheivalicechronicles/asset/488628/) · [Download](https://sounds.spriters-resource.com/media/assets/473/488628.zip?updated=1760875568) | PCM WAV mono 22050 Hz; full effect. |
| `public/audio/fft/ui-054.wav` | `sfx.error` | FFTIC UI Sounds/sound_enhanced_ui#54 (sound_enhanced_ui-se_ui_battle_map_display_warning_signs).wav | [Source](https://sounds.spriters-resource.com/pc_computer/finalfantasytacticstheivalicechronicles/asset/488628/) · [Download](https://sounds.spriters-resource.com/media/assets/473/488628.zip?updated=1760875568) | PCM WAV mono 22050 Hz; full effect. |
| `public/audio/fft/ui-044.wav` | `sfx.menuOpen` | FFTIC UI Sounds/sound_enhanced_ui#44 (sound_enhanced_ui-se_ui_battle_menu_open).wav | [Source](https://sounds.spriters-resource.com/pc_computer/finalfantasytacticstheivalicechronicles/asset/488628/) · [Download](https://sounds.spriters-resource.com/media/assets/473/488628.zip?updated=1760875568) | PCM WAV mono 22050 Hz; full effect. |
| `public/audio/fft/ui-101.wav` | `sfx.turn` | FFTIC UI Sounds/sound_enhanced_ui#101 (sound_enhanced_ui-se_ui_battle_active_turn).wav | [Source](https://sounds.spriters-resource.com/pc_computer/finalfantasytacticstheivalicechronicles/asset/488628/) · [Download](https://sounds.spriters-resource.com/media/assets/473/488628.zip?updated=1760875568) | PCM WAV mono 22050 Hz; full effect. |
| `public/audio/fft/ui-006.wav` | `sfx.textBlip` | FFTIC UI Sounds/sound_enhanced_ui#6 (sound_enhanced_ui-se_ui_com_value_input).wav | [Source](https://sounds.spriters-resource.com/pc_computer/finalfantasytacticstheivalicechronicles/asset/488628/) · [Download](https://sounds.spriters-resource.com/media/assets/473/488628.zip?updated=1760875568) | PCM WAV mono 22050 Hz; full effect. |
| `public/audio/fft/ui-055.wav` | `sfx.step` | FFTIC UI Sounds/sound_enhanced_ui#55 (sound_enhanced_ui-se_ui_battle_map_chara_walk).wav | [Source](https://sounds.spriters-resource.com/pc_computer/finalfantasytacticstheivalicechronicles/asset/488628/) · [Download](https://sounds.spriters-resource.com/media/assets/473/488628.zip?updated=1760875568) | PCM WAV mono 22050 Hz; full effect. |
| `public/audio/fft/ui-009.wav` | `sfx.jump` | FFTIC UI Sounds/sound_enhanced_ui#9 (sound_enhanced_ui-se_ui_formation_unit_hold).wav | [Source](https://sounds.spriters-resource.com/pc_computer/finalfantasytacticstheivalicechronicles/asset/488628/) · [Download](https://sounds.spriters-resource.com/media/assets/473/488628.zip?updated=1760875568) | PCM WAV mono 22050 Hz; full effect. |
| `public/audio/fft/ui-010.wav` | `sfx.land` | FFTIC UI Sounds/sound_enhanced_ui#10 (sound_enhanced_ui-se_ui_formation_unit_down).wav | [Source](https://sounds.spriters-resource.com/pc_computer/finalfantasytacticstheivalicechronicles/asset/488628/) · [Download](https://sounds.spriters-resource.com/media/assets/473/488628.zip?updated=1760875568) | PCM WAV mono 22050 Hz; full effect. |
| `public/audio/fft/ui-108.wav` | `sfx.hit` | FFTIC UI Sounds/sound_enhanced_ui#108 (sound_enhanced_ui-se_ui_battle_display_attack_result).wav | [Source](https://sounds.spriters-resource.com/pc_computer/finalfantasytacticstheivalicechronicles/asset/488628/) · [Download](https://sounds.spriters-resource.com/media/assets/473/488628.zip?updated=1760875568) | PCM WAV mono 22050 Hz; full effect. |
| `public/audio/fft/ui-107.wav` | `sfx.miss` | FFTIC UI Sounds/sound_enhanced_ui#107 (sound_enhanced_ui-se_ui_battle_display_attack_result_out).wav | [Source](https://sounds.spriters-resource.com/pc_computer/finalfantasytacticstheivalicechronicles/asset/488628/) · [Download](https://sounds.spriters-resource.com/media/assets/473/488628.zip?updated=1760875568) | PCM WAV mono 22050 Hz; full effect. |
| `public/audio/fft/ui-017.wav` | `sfx.block` | FFTIC UI Sounds/sound_enhanced_ui#17 (sound_enhanced_ui-se_ui_myset_set_equip).wav | [Source](https://sounds.spriters-resource.com/pc_computer/finalfantasytacticstheivalicechronicles/asset/488628/) · [Download](https://sounds.spriters-resource.com/media/assets/473/488628.zip?updated=1760875568) | PCM WAV mono 22050 Hz; full effect. |
| `public/audio/fft/ui-083.wav` | `sfx.item`, `sfx.chest` | FFTIC UI Sounds/sound_enhanced_ui#83 (sound_enhanced_ui-se_ui_item_get).wav | [Source](https://sounds.spriters-resource.com/pc_computer/finalfantasytacticstheivalicechronicles/asset/488628/) · [Download](https://sounds.spriters-resource.com/media/assets/473/488628.zip?updated=1760875568) | PCM WAV mono 22050 Hz; full effect. |
| `public/audio/fft/ui-077.wav` | `sfx.crystal`, `sfx.stone` | FFTIC UI Sounds/sound_enhanced_ui#77 (sound_enhanced_ui-se_ui_bravestory_sacredstone_cursor_stick).wav | [Source](https://sounds.spriters-resource.com/pc_computer/finalfantasytacticstheivalicechronicles/asset/488628/) · [Download](https://sounds.spriters-resource.com/media/assets/473/488628.zip?updated=1760875568) | PCM WAV mono 22050 Hz; full effect. |
| `public/audio/fft/ui-104.wav` | `sfx.gil` | FFTIC UI Sounds/sound_enhanced_ui#104 (sound_enhanced_ui-se_ui_battle_display_result_reward_money).wav | [Source](https://sounds.spriters-resource.com/pc_computer/finalfantasytacticstheivalicechronicles/asset/488628/) · [Download](https://sounds.spriters-resource.com/media/assets/473/488628.zip?updated=1760875568) | PCM WAV mono 22050 Hz; full effect. |
| `public/audio/fft/ui-078.wav` | `sfx.bell` | FFTIC UI Sounds/sound_enhanced_ui#78 (sound_enhanced_ui-se_ui_trophy_notice).wav | [Source](https://sounds.spriters-resource.com/pc_computer/finalfantasytacticstheivalicechronicles/asset/488628/) · [Download](https://sounds.spriters-resource.com/media/assets/473/488628.zip?updated=1760875568) | PCM WAV mono 22050 Hz; full effect. |
| `public/audio/fft/ui-018.wav` | `sfx.steal` | FFTIC UI Sounds/sound_enhanced_ui#18 (sound_enhanced_ui-se_ui_item_delete).wav | [Source](https://sounds.spriters-resource.com/pc_computer/finalfantasytacticstheivalicechronicles/asset/488628/) · [Download](https://sounds.spriters-resource.com/media/assets/473/488628.zip?updated=1760875568) | PCM WAV mono 22050 Hz; full effect. |
| `public/audio/fft/ui-048.wav` | `sfx.ko` | FFTIC UI Sounds/sound_enhanced_ui#48 (sound_enhanced_ui-se_ui_battle_notice_estrangement).wav | [Source](https://sounds.spriters-resource.com/pc_computer/finalfantasytacticstheivalicechronicles/asset/488628/) · [Download](https://sounds.spriters-resource.com/media/assets/473/488628.zip?updated=1760875568) | PCM WAV mono 22050 Hz; full effect. |
| `public/audio/fft/ui-116.wav` | `sfx.buff` | FFTIC UI Sounds/sound_enhanced_ui#116 (sound_enhanced_ui-se_ui_battle_ramza_jobrank_lvup).wav | [Source](https://sounds.spriters-resource.com/pc_computer/finalfantasytacticstheivalicechronicles/asset/488628/) · [Download](https://sounds.spriters-resource.com/media/assets/473/488628.zip?updated=1760875568) | PCM WAV mono 22050 Hz; full effect. |
| `public/audio/fft/ui-040.wav` | `sfx.status` | FFTIC UI Sounds/sound_enhanced_ui#40 (sound_enhanced_ui-se_ui_battle_mark_on).wav | [Source](https://sounds.spriters-resource.com/pc_computer/finalfantasytacticstheivalicechronicles/asset/488628/) · [Download](https://sounds.spriters-resource.com/media/assets/473/488628.zip?updated=1760875568) | PCM WAV mono 22050 Hz; full effect. |
| `public/audio/fft/ui-005.wav` | `sfx.dance` | FFTIC UI Sounds/sound_enhanced_ui#5 (sound_enhanced_ui-se_ui_com_sort_execute).wav | [Source](https://sounds.spriters-resource.com/pc_computer/finalfantasytacticstheivalicechronicles/asset/488628/) · [Download](https://sounds.spriters-resource.com/media/assets/473/488628.zip?updated=1760875568) | PCM WAV mono 22050 Hz; full effect. |
| `public/audio/fft/event-016.wav` | `sfx.swing`, `sfx.arrow`, `sfx.throw`, `sfx.wind` | FFTIC Novel/sound_enhanced_event#16 (sound_enhanced_event-FID_SOUND_EV0880_RUSH_WAV).wav | [Source](https://sounds.spriters-resource.com/pc_computer/finalfantasytacticstheivalicechronicles/asset/488629/) · [Download](https://sounds.spriters-resource.com/media/assets/473/488629.zip?updated=1760875717) | PCM WAV mono 22050 Hz; full effect. |
| `public/audio/fft/event-010.wav` | `sfx.hitHeavy`, `sfx.crit`, `sfx.earth`, `sfx.explosion`, `sfx.meteor` | FFTIC Novel/sound_enhanced_event#10 (sound_enhanced_event-FID_SOUND_EV5025_WORKER8_ATTACK_WAV).wav | [Source](https://sounds.spriters-resource.com/pc_computer/finalfantasytacticstheivalicechronicles/asset/488629/) · [Download](https://sounds.spriters-resource.com/media/assets/473/488629.zip?updated=1760875717) | PCM WAV mono 22050 Hz; full effect. |
| `public/audio/fft/event-017.wav` | `sfx.gun`, `sfx.gunshot`, `sfx.bolt`, `sfx.thunderclap` | FFTIC Novel/sound_enhanced_event#17 (sound_enhanced_event-FID_SOUND_EV1280_GUNSHOT_WAV).wav | [Source](https://sounds.spriters-resource.com/pc_computer/finalfantasytacticstheivalicechronicles/asset/488629/) · [Download](https://sounds.spriters-resource.com/media/assets/473/488629.zip?updated=1760875717) | PCM WAV mono 22050 Hz; full effect. |
| `public/audio/fft/event-002.wav` | `sfx.magic`, `sfx.fire`, `sfx.ice`, `sfx.poison`, `sfx.debuff` | FFTIC Novel/sound_enhanced_event#2 (sound_enhanced_event-FID_SOUND_EV1940_MAGIC_WAV).wav | [Source](https://sounds.spriters-resource.com/pc_computer/finalfantasytacticstheivalicechronicles/asset/488629/) · [Download](https://sounds.spriters-resource.com/media/assets/473/488629.zip?updated=1760875717) | PCM WAV mono 22050 Hz; full effect. |
| `public/audio/fft/event-004.wav` | `sfx.charge`, `sfx.summon`, `sfx.holy` | FFTIC Novel/sound_enhanced_event#4 (sound_enhanced_event-FID_SOUND_EV1880_MAGICSTART_WAV).wav | [Source](https://sounds.spriters-resource.com/pc_computer/finalfantasytacticstheivalicechronicles/asset/488629/) · [Download](https://sounds.spriters-resource.com/media/assets/473/488629.zip?updated=1760875717) | PCM WAV mono 22050 Hz; first 2.5s with 80 ms fade-out. |
| `public/audio/fft/event-009.wav` | `sfx.water` | FFTIC Novel/sound_enhanced_event#9 (sound_enhanced_event-FID_SOUND_ENV_WATER_FALL_01_WAV).wav | [Source](https://sounds.spriters-resource.com/pc_computer/finalfantasytacticstheivalicechronicles/asset/488629/) · [Download](https://sounds.spriters-resource.com/media/assets/473/488629.zip?updated=1760875717) | PCM WAV mono 22050 Hz; first 2s with 80 ms fade-out. |
| `public/audio/fft/event-003.wav` | `sfx.dark`, `sfx.time`, `sfx.demon` | FFTIC Novel/sound_enhanced_event#3 (sound_enhanced_event-FID_SOUND_EV1880_DEZONE_WAV).wav | [Source](https://sounds.spriters-resource.com/pc_computer/finalfantasytacticstheivalicechronicles/asset/488629/) · [Download](https://sounds.spriters-resource.com/media/assets/473/488629.zip?updated=1760875717) | PCM WAV mono 22050 Hz; full effect. |
| `public/audio/fft/event-001.wav` | `sfx.heal`, `sfx.song` | FFTIC Novel/sound_enhanced_event#1 (sound_enhanced_event-FID_SOUND_EV1960_SYNCRONICITY_WAV).wav | [Source](https://sounds.spriters-resource.com/pc_computer/finalfantasytacticstheivalicechronicles/asset/488629/) · [Download](https://sounds.spriters-resource.com/media/assets/473/488629.zip?updated=1760875717) | PCM WAV mono 22050 Hz; full effect. |
| `public/audio/fft/event-015.wav` | `sfx.door` | FFTIC Novel/sound_enhanced_event#15 (sound_enhanced_event-FID_SOUND_EV1700_DOOR_WAV).wav | [Source](https://sounds.spriters-resource.com/pc_computer/finalfantasytacticstheivalicechronicles/asset/488629/) · [Download](https://sounds.spriters-resource.com/media/assets/473/488629.zip?updated=1760875717) | PCM WAV mono 22050 Hz; full effect. |
| `public/audio/fft/event-005.wav` | `sfx.kweh`, `sfx.roar` | FFTIC Novel/sound_enhanced_event#5 (sound_enhanced_event-FID_SOUND_EV0700_CHOCOBO_GO_WAV).wav | [Source](https://sounds.spriters-resource.com/pc_computer/finalfantasytacticstheivalicechronicles/asset/488629/) · [Download](https://sounds.spriters-resource.com/media/assets/473/488629.zip?updated=1760875717) | PCM WAV mono 22050 Hz; full effect. |
<!-- audio-catalogue:end -->
