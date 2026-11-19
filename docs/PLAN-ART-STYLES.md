# Plan: Art styles

Written 19 November 2026 from a read of this repository at `0dc4eea` (three.js r186). It is the
work list for the `/goal` that carries it out. Each phase ships on its own, as AGENTS.md says.
Update the Status table as phases land, and record what the spike and later phases decide in the
*Decision log* at the end.

## Status

| Phase | State |
|---|---|
| 0 — Baseline | done: `tools/style-shots.mjs`, reference set in `tools/out/styles/baseline/` |
| 1 — Spike: the tagged scene pass | done: proven on WebGL 2 (Chromium, Firefox) and WebGPU; see the Decision log |
| 2 — Framework, settings and the Art Style page | done: `src/gfx/styles/`, the settings, the page (reached by `?test=artstyle` until Phase 3) |
| 3 — Light sources and lamps | done: `src/gfx/lights.ts`; Options → Art Style is open to players |
| 4 — Bold Cel | done: banding, colour, outlines (`nodes/edges.ts`); matrix in `tools/out/styles/boldcel/` |
| 5 — Bright Toon | not started |
| 6 — Pixel Art | not started |
| 7 — Ink Wash | not started |
| 8 — Flat Paint | not started |
| 9 — Performance and automatic quality | not started |
| 10 — Docs, CI and hand-off | not started |

## The brief

The owner asked for five looks for the 3D view. Each one can be set for the environment, for the
characters and objects, or for both (mix and match), with an adjustable strength, plus control
over the number of light sources and similar knobs:

| In the game (id) | The owner's reference | The look |
|---|---|---|
| **Bold Cel** (`boldCel`) | cel-shaded like *Jet Set Radio* | thick black outlines on silhouettes and creases; two flat tones with a hard terminator; saturated colour; shadows tinted, not grey |
| **Bright Toon** (`brightToon`) | cel-shaded like *The Legend of Zelda: The Wind Waker* | two tones with a soft terminator; cool blue-violet shadows and warm light; a bright, saturated palette; no black outlines; a little more bloom |
| **Ink Wash** (`inkWash`) | stylized ink shading | brush outlines that wobble and taper; hatching in the shadows that stays on the surfaces; paper grain; muted ink-and-wash colour |
| **Pixel Art** (`pixel`) | pixel art | the view drawn in cells of 2–8 screen pixels; a limited palette with ordered dithering; a one-cell dark outline; crisp edges |
| **Flat Paint** (`flatPaint`) | flat paint shading like *Sable* (the owner named it when setting the goal) | flat colour fields with one or two value steps; thin dark line art; brush-smoothed surfaces (a Kuwahara filter); canvas grain; distance haze in layers |

The reference titles appear in this plan only. The game, its ids, code, lines and commit messages
use the names in the first column. The styles are general techniques (cel and toon shading, ink,
pixel art, flat paint) applied to this game's own art; they never copy another game's characters,
assets or interface.

## What we found

- **Post-processing** (`src/gfx/post.ts`): one TSL `RenderPipeline` per scene. Scene pass →
  SSAO on Ultra (an opaque normal prepass, `prePass.transparent = false`, feeding
  `builtinAOContext`) → bloom → depth of field → `renderOutput` (ACES tone mapping) → grade
  (warmth, tint, contrast, saturation, split toning, vignette, film grain, flash) → SMAA or FXAA.
  It is built by `Stage.init()` (`src/scenes/stage.ts`), `WorldView` (`src/scenes/worldmap.ts`)
  and `src/dev.ts`. WebGL 1 (`three-legacy`, r162) has no node pipeline: `legacyPost` renders
  directly.
- **Materials are shared across what will be layers.** `src/gfx/materials.ts` caches
  `propMaterial()` by its options, and the same instances dress map props, humanoids, monsters,
  weapons and the world map. A material cannot tell the environment from a character, so
  per-layer styling must key on the object. Under `WebGPURenderer` the classic materials
  (terrain's `MeshStandardMaterial`, `MeshBasicMaterial`) run as node materials, so whatever the
  scene pass adds reaches every material.
- **Lights** (`src/gfx/env.ts`): the sun (directional, the only shadow caster), a hemisphere
  fill, a rim light (directional, 0.35) and up to 2, 4 or 8 lamps from map props (Low, Medium,
  higher). A storm's lightning light stays in the scene at intensity 0, because adding or
  removing a light recompiles every lit shader. Fog is linear (`THREE.Fog`: colour, near and far
  per mood). The world map has its own sun, hemisphere and linear fog and no rim
  (`WorldView`). Portraits light their own scene (`src/gfx/portraits.ts`).
- **Overlays that must stay readable**: tile highlights, the cursor, goal and charge markers
  (`tileMaterial`, transparent, `renderOrder` 4); team rings, blob shadows and status badges
  (`src/scenes/unitview.ts`); spell effects and weather (`src/gfx/vfx.ts`). The HUD, menus and
  text are DOM, and nothing here touches them.
- **three r186 has the building blocks**: `pass()` with `mrt()` and per-output blend modes
  (`MRTNode.setBlendMode`); `diffuseColor` as an MRT output; per-object uniforms
  (`uniform().onObjectUpdate`); `getViewPosition`, `getNormalFromDepth`, `luminance`,
  `posterize`, `interleavedGradientNoise`, `mx_noise_float`; `sobel` (`SobelOperatorNode`),
  `bayer16` (`tsl/math/Bayer.js`) and `PixelationNode` (`PixelationPassNode.js`);
  `MeshToonNodeMaterial` and `ToonOutlinePassNode` (which outlines toon materials only). There
  is no Kuwahara filter: write one. `RetroPassNode` (PS1-style) renders the whole scene itself,
  so it can't be limited to a layer.
- **Options** (`src/game/state.ts`): flat keys in `Options` and `DEFAULT_OPTIONS`, cleaned by
  `normalizeOptions` and stored as `fft-fealty-options`. The Options screen
  (`src/ui/menus/system.ts`) is a list in which choosing an item cycles its value. Controller is
  its sub-page (`src/ui/menus/controller.ts`), the pattern to follow. `menu()`'s `onAction` can
  take left and right to step a value.
- **No live preview yet**: the in-game Menu pauses the clock and covers the frozen frame with an
  opaque backdrop, and `Game.frame()` redraws a paused scene only after a resize. Options opened
  from the title sit over the world map.
- **Automatic quality** (`Game.autoQuality`) steps the preset down after about 8 seconds under
  26 fps.
- **Baseline** (Node 22, `0dc4eea`): 150 unit tests, the build and `npm run sim` (72 battles,
  0 stalls, 0 errors) pass. This machine's default Node is 24: run
  `source ~/.nvm/nvm.sh && nvm use 22` first.

## Decisions

1. **Styles are drawn in screen space over a tagged scene pass.** While a style is on, the scene
   pass writes four MRT outputs (`src/gfx/styles/scenePass.ts`): `output` (the colour without
   overlays), `overlay` (interface and effects), `glow` (additive glows) and `data` (√ of the
   albedo's luminance, the layer and a 5-bit object id, a write flag). Every output blends as the
   drawing material does. Normals for outlines come from depth (`getNormalFromDepth`). Each
   style is a set of nodes in `post.ts`'s graph that read them. This covers every material as it is (terrain, water, swaying props,
   monsters), keeps the material cache, needs no material variants or recompiles when a style
   changes, and makes mix and match a per-pixel mask. Toon material variants keyed by layer are
   the fallback, used only if Phase 1 shows that screen-space banding can't look right.
2. **Banded light comes from a ratio.** Light = the colour's luminance ÷ the albedo's, relative
   to the scene's fully lit level (sun plus sky, through Lambert's 1/π). It is quantized into N
   bands with a softness, shadows take the style's tint, and the colour is scaled so its light
   lands on its band (hue and albedo kept). The pass undoes the linear fog before banding and
   reapplies it after (its colour, near and far are known), so distant terrain bands correctly.
   Styles that want no highlights clip the specular part.
3. **Each object carries its layer**: `userData.styleLayer` on a builder's root, inherited by
   its children and read through a per-object uniform. Anything untagged is drawn unstyled, and
   a unit test fails if a scene builder adds an untagged mesh. See *Layers*.
4. **Order in the frame**: scene pass → banding (linear light) → overlays and glows laid over →
   bloom → depth of field → tone
   mapping → colour grade (warmth, tint, contrast, saturation, split toning) → outlines,
   hatching, paint, paper and palette → vignette, grain and flash → anti-aliasing → Pixel Art
   cells (sampled from before anti-aliasing, so they stay crisp). On Low there is no grade
   pass, and its steps drop out.
5. **Frame-wide effects follow the Environment style.** SSAO, depth of field, film grain,
   vignette and bloom changes come from the environment's style. A style on Characters & objects
   alone never changes them.
6. **None costs nothing.** With both layers at None, the pipeline is today's: no MRT outputs and
   no extra nodes. A unit test pins it.
7. **WebGPU and WebGL 2 only.** On WebGL 1, or when the node pipeline falls back, the Art Style
   page shows the styles as unavailable, with the reason.
8. **Everything is made in code.** Paper, canvas, hatching, dither matrices and palettes come
   from TSL noise or code, never from downloaded or committed image files (52in1's rules).
9. **Defaults change nothing.** Both layers start at None, so current players, 52in1 sessions and
   the catalogue covers look as they do today. A style, once chosen, starts at 80% strength (strength moves in tenths).
10. **Portraits stay as they are** in this pass (cached images of their own scene).

## Layers

| Layer | What it covers | Tagged at |
|---|---|---|
| **Environment** | terrain, water, grass, map props and decor, backdrop scenery, sky, stars and moon; the world map's land, sea, forests, roads, towns and clouds | `TerrainView.group`, `Environment` (sky, backdrop, stars), `WorldView` |
| **Characters & objects** | units (humanoids and monsters) with their weapons and shields, crystals and chests, cutscene actors, the world map's party token | `UnitView.root` (including `becomeCrystal`), `WorldView.party.root` |
| **Effects** | spells, hit sparks, weather (they share particle pools) | `Vfx` pools and transients |
| **Interface** | tile highlights, cursor, goal and charge markers, team rings, blob shadows, status badges, the world map's node rings; anything untagged | `Stage` tile meshes; `UnitView` marker, blob and badges; `WorldView` rings |

Effects, interface and every additive glow are *overlays*: they are drawn into the `overlay` and
`glow` outputs, never banded, outlined or painted, and laid over the styled frame. They take only
Pixel Art's cells, when the Environment is Pixel Art. They leave the data of the surface beneath
them alone, so a move highlight on Pixel Art terrain still shows Pixel Art terrain under it.

## The settings

New `Options` keys, flat like the others. `normalizeOptions` cleans them, and unknown or missing
values fall back to the defaults, so old saves load:

| Key | Values | Default |
|---|---|---|
| `styleLinked` | `true` (one style for the whole view) or `false` (a style per layer) | `true` |
| `styleEnv`, `styleActors` | `none`, `boldCel`, `brightToon`, `inkWash`, `pixel`, `flatPaint` | `none` |
| `styleEnvStrength`, `styleActorsStrength` | 0–1 in steps of 0.1 | 0.8 |
| `styleBands` | `auto` (the style's own), 2, 3, 4, 5 | `auto` |
| `styleOutline` | `auto`, `off`, `thin`, `medium`, `thick` | `auto` |
| `lights` | `auto` (the style's own; with None, today's rig: sun and rim on battle maps, the sun alone on the world map), 1 (sun), 2 (sun and rim), 3 (sun, rim and a front fill that follows the camera) | `auto` |
| `lamps` | `auto` (the quality's cap: 2, 4 or 8), 0, 2, 4, 8 | `auto` |

When linked, `styleEnv` and `styleEnvStrength` drive both layers. The URL can override any of
them for one visit without saving, as `?quality=` does: `?style=`, `?styleEnv=`,
`?styleActors=`, `?styleStrength=` (0–100), `?lights=`, `?lamps=`. Screenshots, the e2e suite
and `dev.html` use these overrides.

**The Art Style page** (Options → Art Style, between Graphics quality and Renderer, from the
title and from the in-game Menu):

```
Art Style
  Same style everywhere ........ On
  Style ........................ Bold Cel        <- when linked
  Strength ..................... 75%
  Environment .................. Pixel Art       <- when not linked
  Environment strength ......... 60%
  Characters & objects ......... Bold Cel
  Characters & objects strength  80%
  Shade bands .................. Style's own (2)
  Outlines ..................... Style's own
  Light sources ................ Style's own (1: sun)
  Lamps ........................ Auto (4)
  Reset to defaults
  Back
```

- Choosing an item steps its value forward; left and right step it either way (`onAction`).
  Strength moves in 10% steps.
- Every change shows at once. The panel docks to one side, the scene shows through beside it,
  and the game redraws the paused frame after each change (a `requestFrame()` that clears
  `Game.frame()`'s paused-size check).
- Each style's description says what it does in one sentence. On WebGL 1 the rows are disabled,
  with the reason as their description.
- The lines go in a new catalog, `src/i18n/ui/artstyle.ts`, with notes for translators and
  length limits. The page fits an iPhone SE in portrait and the test languages, right-to-left
  included.
- Light sources switch at once. The rim light is dimmed, not removed. The front fill is added the
  first time it is chosen (one shader rebuild, on the next frame) and only dimmed after that. Lamps change on the next map, as some quality changes already do, because adding or
  removing point lights recompiles every lit shader.

## The styles

What each style does at 100%, and what its Strength scales from 0% (no change) to 100%:

| | Bold Cel | Bright Toon | Ink Wash | Pixel Art | Flat Paint |
|---|---|---|---|---|---|
| Light bands | 2 with a hard edge, plus a highlight band from the specular | 2 with a soft edge | 3, which drive the hatching | 3, then the palette | 2, nearly flat, highlights clipped |
| Shadows | darker, shifted toward blue-violet | cool blue-violet, lifted | ink grey on paper | from the palette | lifted, with a warm/cool shift |
| Outlines | black, 2–5 px, silhouettes and creases | none (thin and coloured if the player sets them) | brush lines of 1–4 px that wobble and taper, anchored to the world | one dark cell on silhouettes | thin, dark line art: a near-black shade of the fill, 1–2 px |
| Surface | saturation +30% | saturation +20%, warm light | cross-hatching in the dark bands (world-space, so it doesn't swim), paper grain, desaturated | cells of 2–8 px, 64 down to 16 colours, 4×4 Bayer dither | Kuwahara brush, canvas grain, distance haze |
| Strength scales | edge hardness, outline width, saturation | terminator softness, shadow tint, saturation | line weight, hatching density, desaturation | cell size, palette size | brush radius, flattening, grain |
| Frame-wide, when on the Environment | no SSAO, no grain | bloom +20%, no SSAO | no SSAO, no depth of field, no grain, light vignette | no SSAO, no depth of field, no grain | grain becomes canvas, light depth of field |
| Its own light sources | 1 | 3 | 1 | 2 | 2 |

Rules every style shares:

- **Outlines**: edges come from depth (scaled for distance), normals and object ids. A boundary
  pixel takes the outline of the nearer surface's layer, so a Bold Cel character gets its black
  silhouette against an unstyled background. Widths are CSS pixels times the pixel ratio.
- **Layer borders**: steps that blur or gather (Kuwahara, hatching, pixel cells) sample only
  pixels of their own layer, so a painted backdrop never smears into a crisp character, and the
  reverse.
- **Pixel Art cells**: a cell belongs to the layer at its centre, so pixel-art characters get
  blocky silhouettes over any background. Interface overlays stay crisp. Some pixel crawl while
  the camera orbits is a known limit.
- **Readability gates**, checked by eye in every phase: units stand out from the terrain and
  from each other; team rings, tile highlights, the cursor and damage numbers stay clear; the
  active unit and the targets are easy to find.

## Phases

### Phase 0 — Baseline

Node 22, `npm ci`, `npm test`, `npm run build`, `npm run sim`. Shoot the reference set in
today's look into `tools/out/styles/baseline/`: `b_galwyn` (a town by day), a night map, an
interior, a storm map, a void map, the world map, one cutscene, and `dev.html?gallery=1` for the
models (find map and battle ids in `src/data/`). These are the None references.

### Phase 1 — Spike: the tagged scene pass

On a branch, prove Decision 1 before building on it:

1. A `tag` MRT output from a per-object uniform, correct on shared materials, in Chromium
   (WebGL 2), Firefox and WebKit, and on WebGPU where a GPU is available.
2. Transparent overlays, water and spell quads leave the tag beneath them intact. Choose
   between MRT blend modes and an opaque-only data prepass.
3. Ratio banding on the reference maps, through fog, water, emissive windows, lava, shadows and
   SSAO.
4. The cost of the extra outputs against None (software GL as a relative measure; WebGPU if
   available), and whether every output can be 8-bit (`UnsignedByteType`, as SSAO's prepass
   is).

Write the results in the *Decision log*. If the banding fails, switch Decision 1 to toon
material variants keyed by layer (`MeshToonNodeMaterial`, the cache key gaining the layer) and
say why. Ship only the code that stays, plus the log.

### Phase 2 — Framework, settings and the Art Style page

- `src/gfx/styles/`: `types.ts` (ids, settings); `resolve.ts`, a pure function from options,
  quality and backend to a *style plan* (MRT outputs, nodes, uniforms, frame-wide overrides);
  `layers.ts` (`setStyleLayer()`, the tag encoding); one file per node (`band`, `edges`,
  `hatch`, `paper`, `kuwahara`, `pixel`, `palette`); `index.ts`, which adds a plan to the
  pipeline.
- Tag every scene builder's roots (see *Layers*).
- `post.ts`: `createPost(scene, camera, plan)`. `PostFX.setStyle(plan)` updates uniforms at
  once and rebuilds the pipeline (not the stage) when the outputs or nodes change. `Stage` and
  `WorldView` get `restyle()`; `dev.ts` reads the URL overrides.
- The `Options` keys, `normalizeOptions` rules and URL overrides; the Art Style page, its
  catalog, the live preview and the WebGL 1 state. The Options row stays hidden until Phase 3
  gives the page something to change. Style rows join it as each style ships.
- Tests: `resolve()` (None/None gives an empty plan; strength 0 means None for that layer;
  WebGL 1 means unavailable; the frame-wide rules); `normalizeOptions` (malformed values, old
  saves); the layer-tag coverage test (build a `TerrainView`, a `UnitView` and the `Vfx` in
  Node, stubbing canvases as `tests/graphics-lifecycle.test.ts` does, and walk them); and
  `e2e/art-style.spec.ts` (open the page from the title and from a test battle's Menu; change
  each row by keyboard, gamepad and touch; values persist across a reload; URL overrides;
  screen-reader roles; the test languages; phones and a tablet without sideways scrolling).

### Phase 3 — Light sources and lamps

`lights` and `lamps` in `Environment` and in the world map's lights, for every mood (day, dawn,
dusk, night, overcast, interior, storm, void). The Art Style row appears in Options with these
two rows. Unit tests for the rig each setting gives; screenshots of each mood at 1, 2 and 3
lights.

### Phases 4–8 — the styles

One style per phase, in this order, because each reuses the nodes before it: **Bold Cel**
(banding, edges) → **Bright Toon** (soft bands, tints) → **Pixel Art** (cells, palette,
dither) → **Ink Wash** (brush edges, world-space hatching, paper) → **Flat Paint** (Kuwahara,
canvas, haze). For each:

1. Build the nodes and the presets, and map Strength as *The styles* says.
2. Check Environment only, Characters & objects only, both, and mixed with every style before it.
3. Shoot the matrix with `tools/style-shots.mjs` (new: it drives `vite preview` with the URL
   overrides and writes `tools/out/styles/<time>/` with an index page). Look at every image
   against the readability gates and the baseline. Check motion with a short frame sequence
   while the camera orbits: outline crawl, hatching or paper swimming, seams at layer borders.
4. Measure the cost (Phase 9's tool once it exists, a frame-time loop until then) against the
   budget.
5. Unit tests for the style's plan; an e2e check that the view changes when the style is set on
   each layer.
6. Ship.

### Phase 9 — Performance and automatic quality

- `tools/style-bench.mjs`: frame time per style and quality on `b_galwyn` with the camera
  orbiting, in Chromium (software GL, as a relative measure) and on WebGPU where a GPU is
  present.
- Budget: a style adds at most 25% to None's frame time at the same quality, Flat Paint at most
  50%. Scaling by quality: the Kuwahara filter at half resolution on Medium and Low, 4-tap
  edges and a single hatching layer on Low.
- Automatic quality lowers a style's own costs before it lowers the preset.
- Record the table in `docs/REPO_AUDIT.md`.

### Phase 10 — Docs, CI and hand-off

- README: an *Art styles* section (the page, layers, strength, light sources, the URL overrides,
  WebGL 1). AGENTS.md: point to this plan's record.
- `docs/REPO_AUDIT.md`: *Pass 5 — Art styles*, with the bugs found on the way.
  `docs/COMPATIBILITY.md`: the styles per engine.
- CI: `e2e/art-style.spec.ts` in the Chromium browser-smoke job, and the page check in the
  Firefox and WebKit job.
- `npm run hub:check` and `npm run hub:harness` pass, since every session round runs the post
  pipeline. The 52in1 package is rebuilt only if the owner asks.
- The Status table says done.

## Working rules

- Ship each phase, or a coherent part of one, as AGENTS.md says: commit, `npm run ship`, and go
  on from an up-to-date `main`. Never leave an open PR, an unmerged branch or a stash.
- Checks before shipping:
  - always `npm test` and `npm run build`;
  - for the page and the styles:
    `E2E_QUALITY=low E2E_WORKERS=2 npx playwright test --project=chromium e2e/art-style.spec.ts e2e/menus.spec.ts e2e/languages.spec.ts e2e/a11y.spec.ts`,
    in headless Chromium (desktop and mobile profiles). Firefox and WebKit run in CI's
    other-browsers job: on this WSLg desktop even `xvfb-run` headed browsers open windows, so
    the owner asked for headless runs only while they work;
  - `npm run hub:check` and `npm run hub:harness` whenever `post.ts`, `Stage`, `WorldView` or
    the options change;
  - `npm run sim` only if battle code changes.
- Look at every screenshot you take. Check the page with `viewport-matrix --engines chromium`
  (phones, foldables, tablets and desktop), one run at a time.
- Every new line a player reads goes through `t()`. Check `?lang=en-XA`, `?lang=zh-XC` and
  `?lang=ar-XB`.
- Never:
  - load anything from other sites, or add image files;
  - put a reference game's title, characters or logos in the game, its ids, code, lines or
    commit messages;
  - change battle logic or determinism;
  - make None/None slower or different from today;
  - write a model name into the repository.
- Fix bugs found along the way, each with a regression test where practical and a line in
  *Pass 5*.

## Definition of done

- [ ] Bold Cel, Bright Toon, Ink Wash, Pixel Art, Flat Paint and None, set for the Environment,
  for Characters & objects, or for both, each layer with its own Strength from 0% to 100%.
- [ ] Shade bands, outlines, light sources (1–3) and lamps adjustable; every change previews
  live, from the title and from the in-game Menu.
- [ ] Settings persist; old option saves load; the URL overrides work.
- [ ] None/None draws today's frame at today's cost (unit test).
- [ ] WebGPU and WebGL 2 in Chromium, Firefox and WebKit; WebGL 1 shows the styles as
  unavailable.
- [ ] The readability gates hold in every style and mix (screenshot review noted in *Pass 5*).
- [ ] The performance budget holds, and automatic quality accounts for the styles.
- [ ] `npm test`, `npm run build`, the e2e checks above, `hub:check` and `hub:harness` pass; CI
  is green on `main`.
- [ ] README, AGENTS.md, `docs/REPO_AUDIT.md` (*Pass 5*) and `docs/COMPATIBILITY.md` describe
  the styles; the Status table says done.

## Needs a person

- Taste: whether each style reads as intended, above all Flat Paint.
- Real hardware: WebGPU on a desktop GPU, a real iPhone in Safari and an Android phone, for the
  look and the cost.
- Whether to shoot new 52in1 covers in a style and send a new package.

## Open questions

The plan's defaults stand until the owner answers.

1. ~~Which game is the Flat Paint reference?~~ Answered: *Sable*. Flat Paint keeps thin dark
   line art on by default.
2. Should spells and weather take more of the styles than pixelation? Default: no.
3. Should portraits follow the Characters & objects style? Default: not in this pass.
4. Pixel Art's palette: per-channel steps (the default), or a fixed retro palette as an extra
   choice?

## Decision log

**2026-11-19 — Phase 0.** `tools/style-shots.mjs` drives the production build into a battle's
first move choice (units, team rings, the move range, the cursor), the title over the world map
and a cutscene, with the style URL overrides. Battles open with dialogue, so it advances it. The
None reference set is in `tools/out/styles/baseline/`.

**2026-11-19 — Phase 1, the spike.** Decision 1 holds, with these changes from the first draft:

- *One tag per object, on shared materials*: a `uniform(vec4).onObjectUpdate()` reads the
  nearest tagged ancestor before each draw. Counting the `data` buffer of `b_galwyn` through
  `readRenderTargetPixelsAsync`: WebGL 2 in Chromium 913,939 environment and 7,661 character
  pixels, WebGPU 914,017 and 7,583, Firefox (WebGL 2, Xvfb) 914,033 and 7,567, the same six unit
  ids in all three, and no interface pixels: the rings, highlights and cursor left the surface
  data beneath them alone. Shared `propMaterial()` instances split correctly by object.
- *Transparent overlays*: per-output blend modes need `OES_draw_buffers_indexed` on WebGL, and a
  premultiplied blend can't clear an overlay behind an opaque wall (alpha 1 turns it black: the
  first try blacked out the canals). So every output now blends as the material does: opaque
  draws overwrite all outputs in both backends (which also hides overlays behind walls), overlays
  write zero into `output` and flag 0 into `data`. Additive glows go to their own `glow` output,
  so they add over the styled frame instead of darkening it.
- *Four outputs*, the WebGL 2 minimum: albedo is only its luminance (the banded colour is the lit
  colour times a factor, so per-channel albedo isn't needed), and normals come from depth.
- *Ratio banding* reads right on the town by day (water, highlights), the storm (fog, rain), the
  void (additive vortex, torches) and the interior. Fog is undone and redone; light above fully
  lit becomes a highlight band, or is kept, or clipped, per style.
- *Cost* (`tools/style-bench.mjs`, `b_galwyn` deployment, Medium, software rendering): None
  113 ms a frame, the tagged pass with banding 148 ms (+31%) on WebGL 2; 123 and 164 ms (+33%)
  on WebGPU. Software rendering is bound by pixels written, which is what the extra outputs add;
  Phase 9 sets the budget against these numbers.
- *Testing limits found*: headless screenshots can't capture a WebGPU canvas here (the tool
  writes blank frames), so WebGPU is checked by buffer read-back and frame time; WebKit on this
  host doesn't reach a battle's deployment in 150 s even at None, so WebKit runs through
  `./tools/browser-test.sh` (Docker) and CI's Playwright image.
- *Flat Paint*: the owner named *Sable* when setting the goal, so its thin dark line art is on by
  default.

**2026-11-19 — Phase 2.** The framework is in `src/gfx/styles/`: `types.ts` (ids, settings, URL
overrides), `resolve.ts` (settings → a style plan, pure), `presets.ts` (one entry per style, filled
in by Phases 4–8), `graph.ts` (the post graph's three stages), `current.ts` (the plan in force, the
change listeners, `?styleDebug=layer|id|albedo|overlay`). Decisions taken on the way:

- A plan's *key* names its steps per layer and the frame-wide switches (SSAO, depth of field, Pixel
  Art overlays). `PostFX.setStyle()` takes a plan with the same key as uniforms; another key goes
  through `restylePost()`, which builds a new pipeline with the old grade and focus and disposes the
  old one. Restyles of a scene are serialized, and one that loses a race with a scene change
  disposes its result.
- With no style, `createPost()` gets no plan and builds today's graph: no MRT, no extra uniforms
  (the e2e check reads `stage.post.styleKey === 'off'`).
- URL overrides apply until the player changes something on the page; from then the stored
  settings count. The page shows what the view shows, overrides included.
- Strength is stored in tenths, so the default is 80%, not 75%.
- Line ids are lowercase: a style id maps to its line id with `styleLineId()` (`boldCel` → `bold_cel`).
- The page docks left (right in right-to-left languages), or to the bottom half on a phone in
  portrait, over a shade that leaves the scene visible; `Game.requestFrame()` redraws the paused
  frame after each change.

**2026-11-19 — Phase 3.** `LightRig` (`src/gfx/lights.ts`) serves the battle maps (sun and rim
today) and the world map (the sun alone today): 1 dims the rim, 2 keeps or adds it, 3 adds a front
fill that follows the camera, a mix of the sun's and the sky's colours at a quarter of the sun's
strength and never below 0.5, so it also lifts units at night and indoors. The lamp count is read
when a map is built (Auto is the quality's 2, 4 or 8, as before). With no style and Auto, every
scene gets today's rig. Options → Art Style sits between Graphics quality and Renderer; the
language sweep covers the page. The first time the front fill is added, the shaders rebuild on the
next frame, without the loading indicator: a moment's pause on the page, once.

**2026-11-19 — Phase 4, Bold Cel.** Outlines are two passes (`nodes/edges.ts`): a one-pixel mask
from the Laplacian of 1/depth (zero on any plane, so silhouettes and creases but no slopes) and a
change of layer or object id, each edge owned by the nearer surface's layer; then a ring of 25
samples draws each owner's width, so the two layers can have different lines. The display stage
gained a colour step (saturation, contrast, a wash toward a tint). A layer whose outline width is
0 (Outlines: None) has no outline passes at all. Grass blades made speckles at the first crease
threshold, so it was raised. By night Bold Cel's black lines barely show against the dark ground,
and units stand out by their team rings, as they do without a style.
