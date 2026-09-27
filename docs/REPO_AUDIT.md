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
