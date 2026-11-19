# Repository audit — 27 September 2026

Scope: gameplay logic, save/preferences handling, graphics resource ownership, pause timing,
dependencies and unused code, build output, and Vercel's public delivery behavior.

## Bugs corrected

| Finding | Impact | Correction and regression coverage |
| --- | --- | --- |
| Portrait render/readback errors left GPU state changed and failed requests cached | The main view could render into the portrait target; the same portrait would never retry | Always restore the target, clear colour/alpha and tone mapping before awaiting readback; always release the model and pending request. Render-failure and rejected-readback tests cover restoration and retry. |
| Portrait PNGs accumulated for every newly generated enemy | Memory grew through long sessions and random encounters | Retain the 256 most recently used completed portraits; regenerate evicted entries when needed. An eviction test checks that recently used images survive. |
| Replaced status badges and collected crystals were detached without releasing their resources | Old textures, materials and geometry could remain allocated | Release their owned resources; retain Three.js's shared sprite quad. Lifecycle tests verify disposal and shared-geometry preservation. |
| Unit tweens ignored Menu pause; travel could jump after a pause without animation frames | Jump/knockback movement could advance while paused or skip ahead on resume | Use the pause-aware gameplay clock for unit tweens and world travel. Tests cover nested pauses and a paused interval with no frame samples. |
| Saved options accepted arbitrary JSON values | Zero/negative speeds could stall playback; malformed preferences reached rendering/UI code | Normalize known fields, enums, booleans and finite numeric ranges while preserving valid settings and blocked-storage support. |
| AI valued Invite against protected targets | Orators wasted turns on bosses, wards and named characters that always refuse | Share the engine's recruitment eligibility check with AI scoring. The regression first reproduced the wasted Invite, then verified ordinary and protected targets. |

## Easy optimizations and cleanup

- Portrait colour conversion now uses a 256-entry lookup table instead of repeating the
  curve calculation for all 129,024 RGB channels of every portrait.
- Removed `@fontsource/im-fell-english`, which had no CSS or source references.
- Removed obsolete `tools/winshot.sh` and `tools/winplay.sh`. They depended on untracked
  external Windows scripts and hardcoded workstation paths. The portable screenshot,
  Playwright and Docker compatibility tools remain.
- Removed unreferenced helper functions and re-exports after checking source, tests, dev
  pages, CLI entrypoints and content glob registration.
- End-to-end npm scripts rely on Playwright's existing production-build step, avoiding a
  duplicate Vite build.
- Deleted 756 MiB of obsolete failed-run artifacts from the previous transition work;
  retained final reports and original audio masters. These artifacts were already ignored
  by Git and Vercel, so this is local disk cleanup, not a deployment-size claim.
- Kept the existing Unicode-range font imports: browsers already request only the subsets
  used by the page, and dropping them would reduce support for player-entered names.
  See [Fontsource's subset guidance](https://fontsource.org/docs/getting-started/subsets).

`knip.json` records dev pages, diagnostic tools and fixtures as real entrypoints. The two
remaining font dependencies are imported from CSS and are explicitly accounted for.
Unused-file/dependency checks can be repeated with an installed Knip CLI:

```bash
knip --include files,dependencies,unlisted,unresolved
```

## Vercel delivery

> **Retired on 18 November 2026.** The Vercel project no longer exists, and `vercel.json`,
> `.vercelignore` and the `?v=` audio cache rule are gone. 52in1 is the game's public home
> (`npm run package`, `tools/hub/README.md`). The notes below are kept as history.

The production baseline already served hashed JavaScript with Brotli and one-year immutable
caching. HTML correctly required revalidation. Audio supported byte ranges and CDN hits,
but browser requests still required revalidation.

Audio URLs now include the manifest's SHA-256 as `?v=...`. A conditional `vercel.json` header
gives these versioned URLs one-year immutable browser caching. Replacing an audio file
changes its cache key. Unversioned URLs keep their revalidation policy, and HTML stays fresh
across deployments. Music remains the existing 128 kbps MP3 streams; no lossy re-encoding
or additional backend service was introduced.

The static build contains application bundles, fonts and the referenced audio assets.
It does not contain source maps, TypeScript sources, dev pages or browser reports. All audio
files remain referenced by the validated manifest. The Vercel build still runs unit tests,
TypeScript checks and content/audio validation before publishing `dist/`.

Header behavior follows [Vercel's cache guidance](https://vercel.com/docs/caching/cache-control-headers)
and [conditional header configuration](https://vercel.com/docs/project-configuration/vercel-json#headers).
Live verification checks versioned and unversioned audio separately, including a 206 range
response, and confirms HTML revalidation and hashed-JavaScript compression/caching.

## Verification and scope

The audit uses the production build and unit suite, deterministic AI-vs-AI simulation of
72 battles, a dependency advisory audit, configured unused-file/dependency analysis, and
browser checks for audio, portraits/formation, complete battle turns, blocked storage,
WebGL 1 fallback and pausing. Exact final results and deployment checks are recorded in the
pull request accompanying this report.

Local checks passed: production build and 81 unit tests on Node 22.22.3; 40 browser checks
across desktop Chromium/Firefox/WebKit and Android/iPhone profiles; 72 simulated battles
with zero stalls or errors; zero dependency advisories; and no unused files/dependencies
in the configured entrypoint scan.

The campaign simulation checks execution and progression, not balance or guaranteed wins.
Browser device profiles are emulations. Physical phones and real WebGPU hardware are not
certified by these tests. Private Vercel account usage/billing settings were unavailable in
the connected session; deployment verification uses the repository configuration, GitHub
deployment checks and actual public HTTP responses.

# Audit pass 3 — 27 September 2026

Scope: battle engine and AI, story/world flow and saves, battle and menu input, graphics
lifetimes, audio, start-up loading, and repository tooling. Each fix below has a regression
test unless noted; `npm test` covers the engine, state, audio, texture and input cases.

## Bugs corrected

| Area | Finding | Correction |
| --- | --- | --- |
| AI / Reflect | Previews ignored Reflect, so AI casters bounced spells onto themselves | Previews show the bounce onto the caster, as resolution does |
| AI / Teleport | A failed Teleport still ran the planned attack from up to 7 tiles away | `doAction` rejects targets out of reach; the AI re-plans from where it stands |
| AI / performers | AI Bards and Dancers restarted their song every turn; it never resolved | Performers hold while performing and never re-cast a performance |
| AI previews | Death previewed KO on undead (it heals) and on KO-immune units; Raise previewed reviving fallen undead; talk skills previewed hits on monsters without Beast Speech | Previews follow the actual rules (0% for talk without Beast Speech) |
| AI / water | Plans used skills from deep water, where only Attack works | Positions in deep water only consider Attack |
| Engine | Hitting a fallen unit re-knocked it out and reset its KO counter; a performer knocked out mid-song kept a leftover charge; Charm ignored the charmer's side in three-sided battles; Invite could not recruit a foe charmed onto the party's side; Vampire had no effect; EXP ran past 99 at level 99 in battle | Fixed at the source; Vampire now behaves like Confuse |
| World map | Input stayed live for up to 100 ms after a location action finished (stale menus, duplicate story steps); opening the menu of the field you stand on could trigger an ambush; the node `rate` was ignored | Input stays blocked once the map has a result; ambushes roll only after travel, at the node's rate (unchanged 28%) |
| Saves | New Game silently replaced the previous tale's autosave; autosave failures were silent; every ambush victory added a permanent flag; a transient egg list was written into saves | Confirmation before New Game replaces an autosave; one toast on failure; ambush flags are no longer written and are removed from old saves |
| Errands | 30 of 57 errands (PA, MA, Speed) scored every soldier as a flat 60 | Scored from displayed stats on Brave's scale; the tavern shows the favoured stat |
| Battle scripts | Mid-battle script gains of items and gil were overwritten by the victory results (no current content uses them) | They go through the battle's own stock and purse |
| Input | A pinch during facing or deployment ended the turn / placed a unit; the second click of a double-click on a menu item landed on the map; toolbar buttons kept focus so Enter pressed them again; IME conversion keys reached the game | Shared tap detection (`src/ui/taps.ts`) ignores pinches, drags, stray releases and double-click repeats; toolbar buttons don't take focus on click; composition keys are ignored |
| Menus | M / Start / Y did nothing in battle; toasts from the Game Menu's Options were hidden behind it; story choices could sit under the last dialogue line; Esc with a menu open in Game Mode also left Game Mode | The Menu key opens the Game Menu wherever its button shows (cutscenes keep it for Skip); toasts show inside the open menu; choices stack as prompts; an open dialog keeps Escape |
| Game Mode | The edge-swipe guard ate taps on the phone camera buttons; `:modal` threw on browsers older than Chrome 105 / Firefox 103 / Safari 15.6 | Controls near the edge keep their taps; `:modal` has a fallback |
| Graphics | Water used a world-space normal where view space is required (washed-out, camera-dependent shading); weapons and shields ignored status tints; enemy portraits showed the player palette and froze their side's colour; low quality and WebGL 1 had no screen flashes | View-space water normal; held gear tinted; portraits built like the battle model, keyed by side; overlay flash fallback |
| Pause | Spell effects, damage numbers, charge sparks and thunder kept running behind the Game Menu | They run on the pause-aware game clock |
| Audio | Hiding the tab while a track was starting left music silent until the next click; a missing effect was fetched again on every play | The wanted track restarts on return; failures are retried after 10 s |
| Loading | On a busy page the loader could still be fading in (opacity 0.997) when the next screen swapped in | The loader waits until it is fully opaque (browser suite: world-map/title swaps) |

## Loading and performance

- **Start-up textures** — 16 procedural textures are painted before the title. Hashed noise
  lattices and cell points are now computed once per texture instead of per pixel:
  about 2.6× faster (≈680 ms → ≈265 ms on an idle desktop CPU; phones are several times slower),
  pixel-identical (checked by hash in `tests/textures.test.ts`).
- **Parallel downloads** — start-up imported the renderer, node materials, monster models and
  the title flow one after another. The build now adds `modulepreload` links for these chunks
  and `preload` links for the four Latin title fonts, so they download alongside the entry bundle.
  Post-processing effects for the current quality download in parallel while textures paint.
- **Paused frames** — the Game Menu no longer re-renders the full post pipeline 60 times a
  second behind its opaque backdrop; one frame is drawn, and again after a resize.
- **World map** — no longer builds an unused particle system (six pools, seven canvases) on
  every visit, and reuses its cached land geometry instead of cloning 6.7 MB each time.
- **AI** — Arithmetician plans score each attribute/divisor/spell combination once, not once
  per candidate tile: about 4× faster for a unit with every Arithmeticks skill (≈100–200 ms →
  ≈40 ms per turn on a loaded desktop CPU).
- Gamepad polling drops to 4 checks a second until a controller appears; damage numbers
  animate with transforms only; WebGL probe contexts are released after detection.

## Compatibility

- `max-height` rules that used bare `dvh` now use the `--vh` fallback variable.
- Minimum browsers implied by the code: Safari/iOS 15.4, Chrome/Edge 93, Firefox 98
  (`<dialog>`, `Object.hasOwn`, `Array.prototype.at`). Safari 15.4–16.3 cannot parse the node
  renderer's class static blocks and uses the WebGL 1 fallback (see COMPATIBILITY.md).

## Repository operations

- `.github/workflows/ci.yml`: unit tests, type check, content/audio validation, build and the
  campaign simulation on every push to `main` and every pull request, then a Chromium boot smoke test.
- `npm run sim` runs the simulation and now exits non-zero on a stall or exception.
- `tools/validate.ts` rejects duplicate content ids, unknown reward items, forced characters,
  event-watched units, story `moveTo`/`join` targets and errands posted where there is no tavern.
- `.nvmrc` pins Node 22 (the `engines` version); `.gitattributes` keeps text files LF.
- `vite.config.ts` is typed for Vitest instead of `as any`.

## Verification

- `npm run build` (type check, content/audio validation, bundle) and 99 unit tests on
  Node 24; the new engine, state, audio, input and texture tests fail on the previous code.
- `npm run sim`: 72 battles, 0 stalls, 0 exceptions (30 bot victories, 42 defeats; previously
  31/41 — enemy AI no longer wastes turns on reflected, impossible or self-cancelling actions).
- Browser suite, `E2E_QUALITY=low`: host Chromium 42/42; Docker Firefox and WebKit desktop
  84/84; Docker Android, iPhone, small-phone, landscape-phone and tablet profiles 185 passed with
  25 expected skips; WebGL 1 and WebGL 2 probes pass in all three engines.
- The startup test's loader screenshot is now evidence only: host headless Chromium could not
  capture it during full parallel runs on `main` as well, while its assertions still pass.
- Water shading was compared in before/after screenshots of the training-ground pond and the
  title's sea (software WebGL 2).

## Known, not changed

- Transient spell meshes and status badges are disposed after each use, so their GPU
  pipelines are rebuilt the next time (a few ms per effect). Pooling them is the next
  performance step, together with merging each unit's ~25 meshes into one skinned mesh.
- Portraits encode PNGs synchronously (`toDataURL`) and rebuild their pipelines per unit.
- Point stars render at 1 px on the node renderer (WebGPU/WebGL 2 ignore point size).
- Automatic quality stepping changes only pixel ratio until the next map.
- M / Start still skip a cutscene; keyboard hints assume QWERTY; menus are not yet exposed
  to screen readers.
- The repository is public and ships third-party Final Fantasy Tactics audio placeholders
  marked for internal testing only.

# Pass 4 — 52in1 (November 2026)

The work list is `docs/PLAN-52IN1.md`. Each entry below says what changed and how it is checked.

## Vercel retired

`vercel.json`, `.vercelignore` and the versioned audio cache rule are gone; the Vercel project no
longer existed. 52in1 is the game's public home, and `npm run package` builds what it imports.
`git grep -i vercel` now finds only this dated history, the dated plan (`docs/PLAN-52IN1.md`), and
52in1's own tools in `tools/hub/`, kept unmodified (a `.vercel` folder in the checker's list of secret
folders, and the harness's `serverCell`).

## Original music and sound

| Change | Checked by |
| --- | --- |
| All 61 third-party placeholder files (Final Fantasy Tactics music and The Ivalice Chronicles effects), their manifest, catalogue and checks are removed. The build shrinks from 65 MB to under 5 MB. | `e2e/audio.spec.ts` asserts no audio file is requested. |
| A synthesizer replaces file playback: oscillator voices for sustained instruments, procedurally rendered samples for plucked, struck and percussion ones, a look-ahead sequencer, rooms (convolution reverb), a limiter. The engine's API is unchanged. | `tests/audio.test.ts`: scheduling, crossfades, once-songs, 52in1 volumes, ducking, voice limits, low quality. |
| An original score: 24 cues on five leitmotifs, written in a small notation. Loops are seamless intro-plus-body forms instead of fade tails. | Each note's timing, range and velocity; every cue the code names; slicing time never drops or doubles a note; the body repeats exactly. |
| 58 original sound effects, each its own design (the placeholders shared one sound across up to five cues). No voices: the dialogue blip is gone and creature calls are non-vocal. | Every effect renders finite, normalized and deterministic; plucked strings are in tune within 5 cents. |
| Inside 52in1 the music and effects volumes multiply by `AIHubSettings.music` and `.effects`, and follow its `change` event; the engine never applies a master volume of its own over 52in1's, and resumes only on a gesture or a returning page. | `tests/audio.test.ts`. |
| Phones and the lowest graphics preset use lighter synthesis (one voice per note, no vibrato, no reverb). Fast notes never get unison or vibrato, and fixed filters are shared per part. | `npm run audio:verify`: a 45 s battle cue renders in ~3 s (high) and ~1 s (low) in headless Chromium. |
| Scene scripts' sound words (`sword`, `scream`, `thunder`…) map to effects in one table the validator also uses; the validator rejects unknown music and effects. | `npm run validate`. |
| The credits roll names the original score instead of the placeholders. | — |

`npm run audio:verify` renders every cue through the real engine and checks clipping, loudness,
DC offset, loop seams and render cost; the audition page measures any single cue.

## Languages (AI Hub Languages v1)

| Change | Checked by |
| --- | --- |
| `t()` with blanks, plurals and `{key:action}` tags; the three test languages; right-to-left isolates; a typewriter that reveals whole letters (whole words in Arabic script); language-aware numbers, dates, lists and sorting. | `tests/i18n.test.ts` |
| Every UI line lives in a catalog under `src/i18n/ui/` (with notes and length limits): the battle HUD, camera, title, world map, results, reference, Options, Chronicle, Menu, Game Mode, How to Play, the field manual, towns, formation, Controller, sessions and versus. | `tests/i18n.test.ts`: every id used exists, no id has two texts. |
| The battle engine's own words (pop-ups, guard words, HP-change reasons, why an action is unusable, preview effects) go through `t()`. Code compares a stable `guardKind` instead of the shown word. | `tests/engine-lines.test.ts`: the same blows land the same in English and in a stubbed translation. `npm run sim` is unchanged (30 wins, 42 losses). |
| Content (jobs, abilities, items, characters, maps, battles, scenes, story, the Chronicle, status names and descriptions) is swapped in place at start-up from the lines block; zodiac signs come from one helper. | `tests/i18n.test.ts`, `tests/engine-lines.test.ts` |
| The build writes all 8,000-odd lines into the page's `game-lines` block. A Language menu on the title appears once there are two languages and the address chose none. | `npm run build` fails on an id with two texts. |
| Menus in right-to-left languages mirror the glove and the values. | `e2e/languages.spec.ts` |
| Sweeps in the three test languages over the title, a new game, Options and Controller, a cutscene, a battle turn with the Game Menu, and the Chronicle: in en-XA no text outside the lines' brackets (names and key labels aside), in zh-XC no row, panel or page overflowing, in ar-XB menus and dialogue right to left. | `e2e/languages.spec.ts` |
| The formation's rename used `prompt()`; it is an in-game field now, which takes IME, touch and gamepad. | — |

## Controllers and the DualSense

| Change | Checked by |
| --- | --- |
| The PS button (16) and Create + Options together belong to 52in1: the game leaves them alone. Options alone opens the Menu; Create alone shows the turn order when let go; a touchpad press shows it too. | `tests/dualsense.test.ts` |
| Button prompts follow the controller in hand (✕ ○ □ △ for PlayStation) or one chosen kind. | `tests/dualsense.test.ts` |
| Haptic patterns for hits, heavy blows, critical hits, knockouts, spells, level-ups and landings, scaled by a Vibration setting. | — |
| A DualSense's light bar (side colour, reddening and pulsing as the unit weakens; moods for the world map, towns, victory and defeat), adaptive zoom triggers, gyro camera and touchpad gestures: through `window.AIHubSettings.dualsense` inside 52in1, or over WebHID on a page of its own. The 52in1 package compiles WebHID out. | `tests/dualsense.test.ts` (report bytes from 52in1's own vectors; the facade only uses what the player allows). |
| **Options → Controller** holds all of it. Inside 52in1 there is no Game Mode prompt or option: 52in1 owns the window. | — |
| The facade follows 52in1's `change` event: Options hears it, and the light bar is sent again after the player changes a setting. | `tests/dualsense.test.ts` |
| Every screen on a controller alone, with a simulated DualSense and an Xbox pad: title, Options, Controller, How to Play, the Language menu, deployment, a battle turn (menus, tile picking, facing, the Game Menu, turn order), results, game over, formation, equipment and renaming, shop, tavern, world map and its menu, the Chronicle, a cutscene with a choice, and the versus hand-over. | `e2e/controller.spec.ts` |

## 52in1 catalogue, sessions and versus

| Change | Checked by |
| --- | --- |
| The `hub:*` head tags, woff2-only fonts, and `npm run package` (≤100 files, ≤95 MiB, no source maps, no WebHID). `npm run hub:check` builds a draft package and runs 52in1's checker: every check passes but the credit (`hub:model`, written only into the packaged page) and the covers, which come at hand-off. | CI |
| `tools/covers.mjs`: the three 640×480 cover frames (title, a battle's move range, a story scene). | Looked at by eye. |
| The session client 1.4.0 is the page's first script, unmodified. In a session the game opens straight into the dealt round, readies with no key press, counts down on the hub's clock, reports, and freezes on `end`; no Return to Title; `AIHub.fail()` when no renderer starts. | `tests/hub.test.ts`; `npm run hub:harness` (parallel and moments at 1 and 2 players, host leaving, outside a session). |
| Trials: five fixed battles for parallel rounds. | `npm run sim:trials`: the company wins 70–100% AI against AI, in a median 21–42 turns. |
| Moments: five one-turn puzzles. | `tests/moments.test.ts`: each has 1–2 plays (of 37–438) that clear it on every seed, and none clears by standing still. |
| Hot-seat versus on the title, with a hand-over screen between players. | `e2e/versus.spec.ts` |
| The hand-off package (with its credit) passes all 128 checks against the wall with no warning; it is recognised as build 2 of `github-fft-2`. The draft CI builds is missing only the credit (`hub:model`, `hub:effort`, `hub:harness`), which `npm run hub:check` allows. | `npm run package`, `npm run hub:check` |
| Console output: on the title, in a battle and in a scene the game itself logs no warning or error; the only lines are the browser's (a software GL driver's notes and, in headless Chrome, no WebGPU adapter). Every e2e spec fails on a console error, a page error or a request to another site. | `e2e/helpers.ts` (`watchErrors`) |
| Start-up: in a session the game says hello at once and is ready about 4.4 s later at low quality in software rendering (a moment's fresh load: about 4 s), well inside the hub's 20 s; the hub's harness shows it. Outside a session the title is up in about 3 s on the same software renderer (`e2e/boot.spec.ts`). Nothing needed lazy-loading. | `npm run hub:harness` |

## Hand-off

| Change | Checked by |
| --- | --- |
| The import into 52in1 rehearsed on a copy of its working tree (2026-11-18), with the real clone left untouched: the old build out, the catalogue check (128 checks, no warning), `ingest` of the unzipped package (the zip itself would land as `games/package/`), the old date, the `overrides.json` entry removed (it overrode the new description, controls and tags), the package's covers over the old strip, then `check-pages`, `hub-check --draws-only`, `fill.mjs --play` (fills wide, ultra-wide and square) and 52in1's 726 tests. The import's session gate played 11 rounds and passed them all: parallel 1 and 2 players and a host leaving, moments 1 and 2 players and a host leaving, shared-world versus with 2 players, a host leaving and a server copy, the game alone, and the static checks. Translation is the owner's step. Before the merge, the whole Chromium suite passed in one run on the final tree (75 of 75, two workers). CI's Chromium job passed on its one re-run: on the first, three scene-heavy tests timed out on a slow runner, and the same tests took the same time on `main` and on the branch locally. | the plan's import steps (`docs/PLAN-52IN1.md`, Phase 9) |

## Online versus (Phase 8)

| Change | Checked by |
| --- | --- |
| `shared-world versus 2`: two players command the blue and red companies of one battle, each on their own device, in lockstep (`src/game/online.ts`). Each copy, the host's and a server's included, builds the same battle from the hub's seed; on each turn only the owning copy acts, recording its move, action and facing at the engine's three doors, and the others play it back as the battle controller plays an AI's turn. Each side follows its player's colour in 52in1. Each turn carries a hash of the field it began on, and the host's turns that field too: a copy compares before it plays the turn back (both copies at the same point, before anything moves) and takes the host's field if it drifted. The relay drops what a tab misses while its connection is down, so each copy's beat (once a second) names a turn it is still waiting for, and the copy that played it sends it again from a short log; a turn that arrives twice is played once. The host finishes with the standings when the battle ends, a player leaves or time is up; a server copy runs the battle with no player of its own. | `tests/online.test.ts` (two copies stay identical to the end; a drifted copy mends from the host's field and keeps in step; standings when a player leaves); `npm run hub:harness` (2 players, host leaving, server copy); a long round on the harness's poor network (150 ms, jitter, 5 % loss) with both sides on auto-battle: 21 turns between two copies, and 28 among three with a server copy, the fields equal at the start of every turn, nothing mended. |
| Online versus, found in review before it shipped: the first version compared the field hashes at different points (the sender's after its turn, the receiver's after the clock had moved on to the next), so the host would have sent its field after nearly every guest turn, and a guest that had already moved would have lost the move; and a player leaving handed the win to the player who left. Both fixed before release, with the tests above. | `tests/online.test.ts` |

## Fixes and small improvements

| Change | Checked by |
| --- | --- |
| Gentle mode reaches the battle through `setupBattle({ gentle })` instead of a write past the battle's read-only field (and an unused `(state as any).__gentle` read). | `tests/gentle.test.ts` |
| `game.ts`: the dead `r === heroU ? false : false`, the `void THREE; void rinfo; …` line and its unused imports are gone; `runBattle`'s comment no longer promises `'retreat'`. | `npx tsc` |
| The action preview could overlap the target's unit card when the card ran taller than the fixed offset (seen at 960×720). It now moves up above the card. | Cover frame at 960×720. |
| Screen readers: menus are list boxes with `aria-selected` rows, and a polite live region speaks the row in focus and each line of dialogue and narration. | `e2e/a11y.spec.ts` |
| Spell impacts rumble by element (fire swells, ice snaps, lightning crackles, earth rumbles low…), on any pad that rumbles. | `tests/dualsense.test.ts` |
| Choosing *Connect a DualSense…* with a controller's button no longer tries to open the browser's device list (browsers allow it only for a click, tap or key): a note says to choose it by hand. | — |
| Letter-key hints (M, Q, E, R, F) show the keyboard's own layout where the browser gives it (`navigator.keyboard.getLayoutMap`). | — |
| Items can carry `noInvite`: a wearer refuses Invite and Tame from either side (`BattleUnit.recruitable`), so the AI skips them and the preview shows "Refused". The Nightshade Armlet (sold from tier 6) and the Barrette carry it, their descriptions say so, and the shop's item panel lists it under *Immune to* (docs/TODO.md). | `tests/recruit-defect-deploy.test.ts` › invite-proof gear |
| New battle-script command `['defect', id, team]` (`Battle.scriptDefect`): moves a unit to another side for good, lifts Charm and emits `teamChange`; a foe who joins fights as an AI guest. It works in the game's battle hooks, the cutscene runner and the simulators (docs/TODO.md). | `tests/recruit-defect-deploy.test.ts` › the defect script command |
| `BattleDef.heroAt` fixes the hero's starting cell: `deployCells()` puts it first, the deploy screen keeps the hero on it and others off it, and the simulators follow it. The validator (`tools/battle-checks.ts`) rejects a hero cell that isn't a standable deploy cell, and a `defect` naming an unknown unit or team (docs/TODO.md). | `tests/recruit-defect-deploy.test.ts` › a fixed hero cell |
| Preview stat changes read "PA +2" (not "pa +2"), weapon requirements "Needs Sword or Knight Sword" (not "Needs sword/knightSword"). | `tests/engine-lines.test.ts` |

## Correctness review (Phase 7, item 8)

`npm run sim:fuzz` (`tools/fuzzbattles.ts`) plays every story and side battle AI against AI over two
seeds, and again with half the turns taking a random usable action (`CHAOS=1`), checking the engine's
invariants after every move, action and turn: HP and MP in range, KO units at 0 HP with no stray
statuses, Critical following HP, charges and performances paired, one unit per tile on standable
ground, teams changed only by Charm, pickups only of crystals and chests. It found four faults, now
fixed, and CI runs it both ways.

| Change | Checked by |
| --- | --- |
| Silence cancelled a song's or dance's charge but left the performer "Performing": it never sang again and, as the AI saw nothing to do, stood idle for the rest of the battle. Songs and dances are not spells: Silence now leaves a performance going (Stop, Sleep and the rest still end it). In the campaign sim one battle changes (`b_barrowvale`, where a silenced enemy performer used to stand idle; now 29 wins, 43 losses). | `tests/engine-regressions.test.ts` › performances and Silence |
| A level-up mid-battle raised max HP without re-checking Critical, so the status (the kneel, Critical-only reactions, the AI's healing order) could stay on a unit no longer in danger. | `tests/engine-regressions.test.ts` › level-ups mid-battle |
| A unit knocked out by a counter during its own action still levelled up from it, and the level-up's HP growth left it KO'd with HP. It now stays at 0 HP until revived. | `tests/engine-regressions.test.ts` › retreats and levels while down |
| A unit that retreated by script mid-charge kept its Charging status with no charge behind it. | `tests/engine-regressions.test.ts` › retreats and levels while down |

Reviewed and left as they are: a performer's next repeat is held as a charge without the Charging
status by design (Performing already makes it unable to dodge). Saves are validated field by field
and migrated on load (`tests/state-regressions.test.ts`); input and the screens are covered by the
controller, language and menu e2e above.

## Late-game winnability

`VETERAN=1 npm run sim` plays every story and side battle with a careful player's party (8 levels
up, a shop tier up) over three seeds: 86 wins and 130 losses of 216, with no stalls or errors,
against 30 of 72 for the default party. Foes' levels are relative to the party's, so levels alone
change little; the 29 battles the veterans never win are mostly Chapter IV bosses and the Midnight
Deep, where the bot party (no healing priorities, the hero in the front line) is worn down. The
quickest loss, `b_deep10` (9 turns), is the optional last floor of the Deep: Ophion at +8 levels
with four times the HP, two Tiamats and a Dark Behemoth, by design. The spot checks found no
scripting fault or impossible objective, so nothing was rebalanced (Pass 4 tunes only clear
outliers). A better bot for the player's side would make this a sharper tool.

## Known, not changed (Pass 4)

- Terrain-changing script commands, decor offsets, held props and riding animations (docs/TODO.md's
  optional list) stay open: no content needs them.
- The third-party audio placeholders noted above are gone (Pass 4, *Original music and sound*).
- Spell meshes and status badges are still rebuilt per use; portraits still encode synchronously.
  Neither shows in a session round (a few ms per effect), so they wait for a performance pass.
- Point stars stay 1 px on the node renderer, and automatic quality stepping still changes only the
  pixel ratio until the next map.
- M / Options still skip a cutscene: the Menu button doubles as Skip while a scene plays, as the Skip
  button in the corner shows.
- The game reads keys by their place (`KeyboardEvent.code`), so the keys sit in the same places on
  every layout. Hints for the letter keys now use the keyboard's own names where the browser gives
  its layout (Chrome and Edge: Q shows as A on AZERTY); elsewhere, and for the movement keys in
  the manual's prose (WASD, Z, X), they keep QWERTY's names.
