# Plan: Final Fealty Tactics on 52in1

Written 18 November 2026 from a read of this repository and of `michaelcrosato/52in1`
at commit `fdc2dd62`. It is the work list for the `/goal` that carries it out. Each phase
ships on its own, as AGENTS.md says.

## Status (carried out)

| Phase | State |
|---|---|
| 0 — Baseline and 52in1 tools | done |
| 1 — Retire Vercel | done |
| 2 — Original music and sound, no voices | done (`npm run audio:verify`) |
| 3 — Languages v1 (building) | done: every line through `t()` or content; test languages in e2e |
| 4 — Catalogue v1 | done: `npm run hub:check` passes but the hand-off's credit and covers |
| 5 — Controllers and the DualSense | done: Options → Controller |
| 6 — 52in1 sessions | done: Trials, Moments, hot-seat versus; `npm run hub:harness` passes |
| 7 — Bugs and low-hanging fruit | done, or deferred with a reason in `docs/REPO_AUDIT.md` (*Pass 4*) |
| 8 — Stretch: online versus | not started (the plan starts it only after 9) |
| 9 — Docs, CI, screenshots, hand-off | done; the package is built at hand-off with the credit |

## The goal

1. Retire everything Vercel.
2. Replace all third-party music and sound effects with original audio made for this
   game. No voices.
3. Meet 52in1's three standards:
   [AI Hub Catalogue v1](https://52in1.com/lib/hub/catalogue.md),
   [AI Hub Session Protocol v1](https://52in1.com/lib/hub/README.md) and the *Building*
   part of [AI Hub Languages v1](https://52in1.com/lib/hub/languages.md).
4. Support the PlayStation 5 DualSense and its extras, switched on and tuned from the
   game's Options.
5. Fix the bugs and glitches found along the way, and take the low-hanging improvements.

## What we found

- **52in1 already has an old build of this game**: `games/github-fft-2`, imported on
  13 October from this repo's 27 September build. It has 143 files and 65 MB, most of it
  the placeholder audio. Its details on the wall come from `data/overrides.json`: genre
  RPG; tags 3d, isometric, turn-based, story and gamepad; source Final Fantasy Tactics;
  series Final Fantasy.
- **Today's build fails the catalogue checker with 13 errors**: 143 files (the limit is
  100); the icon comes after a script or style; no `hub:catalogue`, `hub:type`,
  `hub:genre`, `hub:tags`, `hub:controls`, `hub:model` or `hub:session`; no `game-lines`
  block; no screenshots. Warnings: the formation menu calls `prompt()`, a browser dialog
  52in1 forbids; no `hub:effort` or `hub:harness`.
- **Vercel is already gone outside the repo.** The connected Vercel team has no
  projects, and `fft-2` returns 404. The last Vercel status on GitHub is from
  27 September (PR #6). 52in1 itself moved from Vercel to Cloudflare Workers on
  3–5 November because Vercel cost too much. What is left here is config and docs:
  `vercel.json`, `.vercelignore`, the `?v=<sha256>` audio cache rule, and mentions in
  README.md, AGENTS.md, `.github/workflows/ci.yml` and `docs/REPO_AUDIT.md`.
- **Audio today**: 24 music cues and 59 SFX cues in `src/audio/manifest.json`, played
  from 61 third-party files in `public/audio/fft/` (the Final Fantasy Tactics soundtrack
  and effects from The Ivalice Chronicles). The credits roll in `src/game/flow.ts`
  credits them. Call sites use `audio.playMusic(id, opts)` and `audio.sfx(id, opts)`.
  `victory`, `defeat`, `ending`, `credits` and `chapter` play once; the rest loop.
- **Text**: about 6,800 player-facing content strings (about 470,000 characters,
  including 2,669 dialogue and narration lines in 181 scenes) and about 600 string
  literals in `src/ui`, `src/game` and `src/scenes`. Keys are already read by
  `event.code`. Lines reach the screen through `textContent`, except `input.hint()`,
  which returns `<kbd>` HTML.
- **Controllers**: standard mapping with Xbox labels only. Triangle and Options open the
  Menu, and Create shows the turn order. Nothing stops Create and Options held together
  from acting, though 52in1 keeps that pair, and the PS button, for its own bar. Rumble
  uses `dual-rumble`. There are no PlayStation glyphs and no DualSense extras.
- **52in1 has a tested WebHID DualSense driver** in its own repo:
  `assets/js/ui/dualsense.js`, whose pure functions are pinned by
  `scripts/dualsense.test.mjs`. It builds output reports for USB (0x02) and Bluetooth
  (0x31, with CRC-32), packs adaptive-trigger effects in Sony's formats (as Nielk1's MIT
  TriggerEffectGenerator packs them) and reads the gyroscope, accelerometer and touchpad
  with calibration. Inside 52in1 a game must not use WebHID: it gets the extras from
  `window.AIHubSettings.dualsense`.
- **Baseline (18 November, Node 22)**: 99 unit tests pass and the build passes.
  `npm run sim` runs 72 battles with 0 stalls and 0 errors: 30 bot wins and 42 losses.
  The bot party wins only 3 of the 22 Chapter IV story battles.

## Decisions

1. **No Vercel.** 52in1 (on Cloudflare) becomes the game's public home, and
   `npm run preview` serves the standalone build locally. Add no other host unless the
   owner asks; GitHub Pages would be the free option.
2. **Original audio, synthesized in the browser.** Every cue becomes an original
   composition or effect, generated by code at runtime: a small instrument bank rendered
   at start-up, a sequencer, and procedural sound effects. No audio files ship. The
   reasons: 52in1's limits of 100 files and 95 MiB, start-up time in hub rounds,
   ownership (nothing third-party, nothing sampled), and the repo's own approach, since
   maps, models, textures and portraits are already made in code.
3. **No voices.** The game has no voice acting, and dialogue stays text. The
   typewriter's `textBlip` goes: 52in1 counts such chirps as voices. Creature calls
   (`kweh`, `roar`) become non-vocal effects.
4. **Ready for translation, not translated.** The build writes every player-facing line
   into a `game-lines` block, and the game reads a `game-translations` block when one is
   present. 52in1 translates a game when it imports it, so this repo ships English plus
   the three test languages.
5. **Sessions**: parallel *Trials* (short fixed skirmishes, raced against the clock),
   *moments* (one-turn tactical puzzles), and *hot-seat versus* on one device. Online
   versus (a shared world) is a stretch phase.
6. **DualSense**: one facade with two back ends. Inside 52in1 it uses
   `AIHubSettings.dualsense`; on a standalone page it uses WebHID, ported from 52in1's
   driver. The WebHID back end is compiled out of the 52in1 package, so the package never
   mentions `navigator.hid`.
7. **Package folder `github-fft-2-v2`**, so 52in1 imports it as a new build of the game it
   already has (slug `github-fft-2`), unless the owner chooses otherwise.
8. **Model credit only at hand-off.** `hub:model`, `hub:effort` and `hub:harness` are
   passed to `npm run package` when the hand-off package is built. The repository never
   hard-codes a model name.

## Working rules

- Read the three 52in1 pages, plus `retrofit-settings.md` and `retrofit-moments.md`
  beside them, before starting. This plan summarizes them; where it is unclear, the
  pages decide.
- Ship each phase, or a coherent part of one, as AGENTS.md says: commit, run the checks,
  push, open a PR, merge it into `main` with a merge commit, then continue from an
  up-to-date `main`. If `npm run ship` cannot run (no usable `gh`), push the branch and
  open and merge the PR with the GitHub tools, then delete the branch. Never leave an
  open PR, an unmerged branch or a stash.
- Checks before shipping:
  - always `npm test` and `npm run build`;
  - `npm run sim` for engine, AI or battle-content changes;
  - Playwright for UI changes: `E2E_QUALITY=low E2E_WORKERS=2 npx playwright test --project=chromium …`,
    plus Firefox and WebKit where they can run;
  - from Phase 4 on, `npm run hub:check`; from Phase 6 on, `npm run hub:harness`.
- You have authority to fix bugs, problems and glitches, and to make low-hanging
  improvements. Each gets a regression test where practical and a line in
  `docs/REPO_AUDIT.md`, under a new section *Pass 4 — 52in1*. Don't rewrite the story or
  rebalance broadly: tune only clear outliers, with before-and-after numbers.
- Never:
  - copy, transcribe or imitate existing music, Final Fantasy Tactics' included, or
    add third-party audio or art;
  - load anything from other sites at runtime;
  - call `alert`, `confirm` or `prompt`;
  - write a model name into the repository;
  - translate the game.
- From Phase 3 on, all new player-facing text goes through `t()`.
- Keep README.md, AGENTS.md and the docs current, in the same commits as the changes
  they describe. Independent sweeps (string extraction, SFX designs, cue compositions)
  may be split across subagents with narrow briefs.

## Phase 0 — Baseline and 52in1 tools

- `npm ci`, then confirm the baseline above.
- Copy the public 52in1 files into `tools/hub/`: `session.js` (client 1.4.0),
  `harness.html`, `bridge.js`, `round.js` and `catalogue-check.mjs`. Take them from
  `https://52in1.com/lib/hub/`, or from `lib/hub/` in a clone of
  `michaelcrosato/52in1` if the site is unreachable. Record each file's source, date and
  SHA-256 in `tools/hub/README.md`, with how to refresh them. Copy nothing else from that
  repository: it is private.
- `tools/hub/run-harness.mjs` (npm `hub:harness`): a Playwright runner that serves the
  package and the harness from one origin and plays the scenarios 52in1's own check
  plays:
  - parallel and moments at 1 and 2 players, a shared world (if any) at 2, each with
    `&latency=150&jitter=50&loss=5&auto=1`;
  - once more with `&scenario=host-leave`;
  - a shared world once more with `&players=2&scenario=server`;
  - then the game opened outside a session, to see it still runs.

  It passes when every run ends with `window.__hubCheck.pass === true` and
  `document.body.dataset.complete === 'true'`. Software rendering is slow, so use low
  quality and generous timeouts.
- Skeletons for `npm run package` (filled in Phase 4) and `npm run hub:check` (package,
  then `catalogue-check.mjs`, with `--offline` in CI).

Done when the baseline is recorded and the three scripts run.

## Phase 1 — Retire Vercel

- Delete `vercel.json` and `.vercelignore`.
- Remove the Vercel wording from:
  - README.md: the Node-version line and the audio-caching paragraph;
  - AGENTS.md: "Vercel deploys `main`" and "Vercel's version";
  - the header comment of `.github/workflows/ci.yml`.
- In `docs/REPO_AUDIT.md`, keep the history and add a dated note that Vercel was retired.
  The `?v=<sha256>` audio URLs disappear with Phase 2.
- Keep Node 22 (`.nvmrc`, `engines`) for CI and local work.
- Hosting: 52in1 is the public home and `npm run preview` the local standalone build.
  Add nothing else unless the owner asks.
- For the owner, outside the repo and optional: if the Vercel GitHub App still has
  access to this repository, remove it under GitHub → Settings → Applications. No
  Vercel project is left to delete.

Done when `grep -ri vercel` matches only the dated history in `docs/REPO_AUDIT.md`.

## Phase 2 — Original audio, no voices

**Remove**:
- `public/audio/`, `src/audio/manifest.json` and `src/audio/manifest.ts`;
- `tools/audio-assets.ts` and `tools/audio-catalog.ts`;
- the README's placeholder-audio section and audio catalogue;
- the credits lines that name the placeholders (`src/game/flow.ts`, `credits()`).

Rewrite `tools/verify-audio.mjs`, `tests/audio.test.ts` and `e2e/audio.spec.ts` for the
new engine.

**Engine** (`src/audio/`): keep the API the game calls, so call sites don't change:
`playMusic`, `stopMusic`, `currentMusic`, `sfx`, `duck`, `setVolumes`, `getVolumes`,
`unlock`, `unlocked`, `attachUnlock` and `available`, plus what the audition page uses
(`trackIds`, `sfxIds`, `analyser`, `debug`).
- One `AudioContext`, unlocked by a gesture (iOS included) and suspended while the page
  is hidden.
- A music bus and an effects bus, a reverb send and a limiter.
- Music crossfades and ducking under stings. Panning and pitch for effects.
- Each bus multiplies the game's own volume by `window.AIHubSettings.music` or
  `.effects`, each 1 when absent, and re-applies on `change`. Never apply a master
  volume: the hub does.
- Resume only on a gesture or when the page returns, never on a timer: 52in1's
  companion suspends the game's contexts while its cards are up.
- Low quality uses fewer voices and no reverb. Budgets: at most about 24 music voices;
  the instrument bank renders in at most about 150 ms on a desktop, in chunks that never
  block a frame; memory at most about 20 MB.

**Instrument bank**: procedural samples rendered into `AudioBuffer`s at start-up, with
loop points for sustained notes:
- strings ensemble, pizzicato, harp (Karplus–Strong), lute;
- flute, reed, horn and brass;
- a choir pad (formant synthesis) and organ;
- bells and celesta;
- contrabass;
- timpani, toms, snare, frame drum and cymbal;
- a night ambience.

**Sequencer**: a look-ahead scheduler (notes about 150 ms ahead) with tempo, meter,
swing and dynamics. Each cue is an intro plus a seamless loop body, which fixes today's
fade-tail loops. A small pattern notation keeps scores readable as data in
`src/audio/score/`.

**Score**: original compositions for all 24 music cues, built on five new leitmotifs so
the score holds together:

- **A, Chronicle**: noble and sorrowful, modal; the main theme.
- **B, Fealty**: Rhen and Delan; warm, later tragic.
- **C, Sanctum**: the Church, chant-like and Phrygian; it distorts into the Umbral music.
- **D, Banner**: war, built on a dotted martial cell.
- **E, Oriane**: lyrical, in a major key.

| Cue | Material | Tempo and mode | Instruments | Form |
|---|---|---|---|---|
| title | A in full | 72, D Dorian | strings, harp, horn, soft timpani | intro + ~90 s loop |
| prologue | A in fragments | 66, A Aeolian | flute over harp, low strings | ~75 s loop |
| chapter | A as a fanfare | 92, D major | brass, timpani | once, ~12 s |
| worldmap | new travelling tune quoting B | 96, G Mixolydian | lute, pizzicato, flute | ~120 s loop |
| town | new | 108, F major | dulcimer, pizzicato, light drum | ~90 s loop |
| tavern | new jig | 132 in 6/8, D Dorian | reed lead, lute, frame drum | ~75 s loop |
| formation | D, light | 88, C Lydian | harp, soft strings, brushes | ~90 s loop |
| battle1 | D | 132, D minor | ostinato strings, brass stabs, timpani, snare | ~90 s loop |
| battle2 | D varied | 120, C minor | low brass, choir pad, strings | ~90 s loop |
| battle3 | D with B | 144, E minor | driving strings, toms | ~90 s loop |
| boss | D against C | 150, B minor | full percussion, low brass, choir | ~100 s loop |
| umbral | C distorted | 100 in 7/8, Locrian | low choir, metallic bells, detuned drones | ~100 s loop |
| finalBoss | C inverted, A transformed | 160, C minor | organ, choir, everything | ~150 s loop |
| victory | D resolving into A | 120, D major | brass, timpani | once, ~10 s |
| defeat | B in minor | 60, D minor | reed, strings | once, ~10 s |
| somber | B in minor | 60, E minor | strings, solo reed | ~90 s loop |
| tension | C fragments over a pulse | 90, A minor | tremolo low strings, ticking percussion | ~80 s loop |
| church | C as chant | 70, E Phrygian | organ, choir pad | ~90 s loop |
| heroic | A on brass | 112, D major | brass, strings, timpani | ~75 s loop |
| romance | E | 76, F major | harp, flute, strings | ~90 s loop |
| campfire | B on lute | 70, G major | lute, night ambience | ~80 s loop |
| dungeon | new | 84, D Phrygian | echoing bells, drones, sparse drums | ~90 s loop |
| ending | A and B together | 70 rising to 84, D major | strings, choir, harp | once, as long as the epilogue |
| credits | A, B, D and E as a medley | 96, D major | everything | once, as long as the credits roll |

The five stings (`victory`, `defeat`, `levelUp`, `jobUp`, `learn`) quote the matching
motif. Melodies are composed fresh: no transcription or imitation of any existing tune.

**Sound effects** (`src/audio/sfx.ts`): every SFX cue gets its own original design,
generated and cached on first use. The old placeholders shared one sound across up to
five cues; that sharing ends. Groups:

- **UI**: cursor, confirm, cancel, error, menuOpen, turn, bell, gil, item, chest,
  crystal, stone.
- **Movement and world**: step, jump, land, door, wind, water.
- **Combat**: swing, hit, hitHeavy, crit, miss, block, arrow, throw, gun, gunshot,
  steal, ko, earth, explosion, meteor.
- **Magic**: magic, fire, ice, bolt, thunderclap, poison, holy, dark, time, heal,
  buff, debuff, status, charge, summon, demon.
- **Performance**: song and dance, as instrumental flourishes.
- **Creatures, non-vocal**: kweh (wing flutter) and roar (low rumble and thud).
- **Removed**: `textBlip`, so the typewriter is silent.

**Checks and tools**:
- `tools/validate.ts` fails on any `playMusic`, `['music', …]`, `music:` or `sfx()` id
  that the score or the SFX registry lacks.
- Unit tests cover scheduler timing (no drift), loop seams and envelopes.
- `npm run audio:verify` renders every cue through an `OfflineAudioContext` in headless
  Chromium and writes a report. It fails on:
  - a peak above −1 dBFS;
  - loudness outside its class target (music about −18 LUFS, effects set by class);
  - NaN, DC offset or a click at a loop seam;
  - slower than real time on the CI runner.
- `audio-test.html` becomes the audition page for every cue, showing its tempo, key and
  length.

**Docs**: the README's audio section describes the procedural engine, and the credits
say the music and sound were made for this game.

Done when:
- no audio file ships;
- nothing in `src/`, README.md or the credits names a third-party audio source;
- every cue resolves;
- the verify report passes;
- the rewritten audio tests pass.

The old placeholder files remain in git history; see *Needs a person*.

## Phase 3 — Languages v1, *Building*

**Core** (`src/i18n/`), as in the languages page's example:
- `t(id, values)` with:
  - named blanks;
  - plural forms through `Intl.PluralRules` (`zero` honoured);
  - numbers through `Intl.NumberFormat`;
  - `{key:action}` control tags through `controlLabel()`;
  - Unicode isolates around filled values in right-to-left languages.
- `pickLanguage()` checks, in order: `?lang`, the choice saved under `lang:` plus the
  page's path, `navigator.languages`, then `en`.
- The test languages `en-XA`, `zh-XC` and `ar-XB`, chosen only by `?lang`.
- Helpers `languageName()`, `pieces()` and `width()`.
- **Critical**: a missing or broken translation shows the original line.

**UI lines**: `src/i18n/en.ts` maps ids to English, with notes and a `max` for tight
labels.
- Move every player-visible string in `src/ui`, `src/game`, `src/scenes`, `src/main.ts`
  and the loading text in `index.html` (through `data-line` and `fillPage()`) into it.
- Whole sentences with blanks, never glued pieces.
- Plural forms where a number counts something (souls lost, soldiers who left, items
  obtained).
- `input.hint()` returns DOM or text, not HTML.

**Content lines**: one extraction schema (`src/i18n/content.ts`) lists the
player-facing fields of every content kind:
- names and descriptions of jobs, abilities, items, characters, places and battles;
- battle hints and objectives;
- scene `say`, `narrate`, `title` and `choice` text;
- errands, rumours, chronicle entries, artefacts, Zodiac Stones, bestiary and atlas
  text, and the field manual.

Ids:
- They come from content ids, made lowercase snake_case and checked for collisions,
  e.g. `item.phoenix_down.name`.
- Dialogue ids add the speaker and a short hash of the English, e.g.
  `scene.sc_pro_alazar.alazar_k3f9a`, so inserting a line never shifts the others.

The build (a Vite plugin) writes the block into `<head>`:
- right after the catalogue tags, with every `<` written as `<`;
- `notes`: generated for dialogue (speaker, listener, scene, `{hero}` explained) and
  hand-written where needed;
- `names`: characters, places, factions, Zodiac Stones, Umbral Lords, kwehbo, the
  Germaine Scriptures and the like;
- `brief`: hand-written. Cover the setting, the earnest slightly archaic register, each
  main character's voice, a male hero whose name the player may change, nobles' and
  commoners' forms of address, and the Church's terms.

**Runtime**: after `pickLanguage()`, one pass over the same schema swaps translated text
into the content registry in place, or runs the test-language transform. The UI uses
`t()`. The `{hero}` blank is filled when shown, as now. Saves keep ids and values, not
sentences (check `SlotInfo.objective`).

**Language menu** on the title screen, only when there is no `?lang` and more than one
language is available. A choice saves it and reloads.

**Drawing text**:
- Lines go in as `textContent` only.
- The typewriter reveals graphemes with `Intl.Segmenter`, or whole words in Arabic
  script. It takes the original line's time, at its length divided by the speed, and
  draws the revealed part in one string.
- Right to left: set `dir` on dialogue boxes, menus and panels. Menus may mirror; the
  world does not.
- Chinese, Japanese and Thai wrap correctly (CSS `overflow-wrap`, `line-break`).
- Boxes grow, wrap or scroll.
- Fonts fall back to the device's fonts for scripts the bundled ones lack.
- `toLocaleUpperCase` wherever JS makes capitals.
- `Intl.DateTimeFormat` for save dates.
- The in-game calendar date is a line with blanks.

**Tests**:
- `t()`, plurals, fallbacks, test languages and language matching.
- Extraction completeness: every schema field is covered, ids are unique and valid,
  and the block passes `linesProblems()` from `catalogue-check.mjs`.
- e2e sweeps of title, new game, a cutscene, a battle turn, menus and the Chronicle:
  - `?lang=en-XA`: no visible text outside `[…]`, apart from player-typed and generated
    unit names;
  - `?lang=zh-XC`: no overflow or clipping;
  - `?lang=ar-XB`: dialogue and menus right to left.

Done when the block passes the checker, the three sweeps pass, and no player-visible
string bypasses `t()` or the schema.

## Phase 4 — Catalogue v1, 52in1 rules and the package

**`<head>` order**: `<meta charset>`, then the session client, then the catalogue tags,
then `game-lines`, then the rest. Values:

| Tag | Value |
|---|---|
| `<html lang>` | `en` |
| `<title>` | `Final Fealty Tactics — The Chronicle of the Twelve Braves` |
| `description` | one or two plain sentences, at most 200 characters |
| `theme-color` | `#c9a24a`, the game's gold |
| `icon` | the existing SVG data URI, moved ahead of every script and style |
| `hub:catalogue` | `1` |
| `hub:type` | `Game` |
| `hub:genre` | `RPG` |
| `hub:tags` | `3d, isometric, turn-based, story, gamepad` |
| `hub:controls` | keys first, at most 160 characters; the checker's keycap warning clean |
| `hub:source` | `Final Fantasy Tactics` |
| `hub:series` | `Final Fantasy` |
| `hub:players` | `1-2` |
| `hub:multiplayer` | `parallel 1-4, moments 1-4, hot-seat versus 2`, plus `shared-world versus 2` only if Phase 8 lands |
| `hub:dualsense` | `light bar, adaptive triggers, haptics, motion, touchpad` |
| session tags and `hub:moment` | Phase 6 |
| `hub:model`, `hub:effort`, `hub:harness` | flags of `npm run package` at hand-off |

**Fonts**: only `woff2` and only the subsets the game needs, through hand-written
`@font-face` rules over the `@fontsource` files. Today 32 `woff` and 32 `woff2` files
ship. Every other script falls back to the device's fonts.

**`npm run package`**:
- Build with `HUB_PACKAGE=1`, which compiles out the WebHID back end.
- Assemble `package/games/github-fft-2-v2/` and `package/covers/<slug>/0.jpg` to
  `2.jpg`.
- Enforce at most 100 files (aim for 60 or fewer) and 95 MiB, no file over 25 MiB, and
  no source maps, `.env`, `.git` or `node_modules`.
- Write `--model`, `--effort` and `--harness` into the packaged page only.
- Run the checker, then zip the result. `package/` is git-ignored.

**52in1's runtime rules**:
- No `alert`, `confirm` or `prompt`: the formation rename gets an in-game text field,
  which works with IME, touch and gamepad.
- No `window.open` and no navigating away.
- Storage keys stay under `fft-fealty-` (plus the languages page's `lang:` key). Never
  `clear()`; never touch `ai-hub:` keys.
- Nothing from other sites: assert it in e2e with a network listener.
- No console errors while loading and playing: assert it in e2e.
- The picture fills the window at 1600×900, 2100×900, 1200×900 and phone sizes.
- Inside 52in1 (`window.AIHubSettings` present) or in a session, skip the Game Mode
  prompt, since 52in1 owns the window. Fullscreen and wake-lock refusals stay silent.
- Unknown query parameters are ignored.

Done when `npm run hub:check` passes with no errors and every warning is explained in
`docs/REPO_AUDIT.md`.

## Phase 5 — Controllers and the DualSense

**Every screen on any controller**, by the standard mapping:
- **Screens**: title, name entry, language, formation and equipment, shops and tavern,
  world map, deployment, battle (menus, tile picking, facing), cutscenes and choices,
  results, game over, the Game Menu, Options, the Chronicle, How to Play, and the
  versus hand-over.
- **Buttons**:
  - D-pad and left stick move; Cross confirms; Circle goes back;
  - Options opens the Game Menu everywhere: in cutscenes the Menu holds Skip, which
    ends the "M / Start skips a cutscene" conflict in REPO_AUDIT;
  - Triangle also opens the Menu, Square holds fast-forward, Create shows the turn
    order;
  - L1 and R1 rotate, L2 and R2 zoom by `value`, L3 tilts, R3 recenters.
- **52in1's buttons**: leave PS (button 16) alone. Give Create and Options held
  together no meaning: Create acts on release, and only if Options was not pressed
  while it was held.

**Button prompts**:
- Glyphs follow the device: PlayStation (✕ ○ □ △ L1 R1 L2 R2 L3 R3 Create Options),
  Xbox, keyboard (`navigator.keyboard.getLayoutMap()` where available) or touch.
- Auto-detect PlayStation pads from `gamepad.id` (`054c`, `DualSense`, `DualShock`).
- An Options override: Auto, PlayStation or Xbox.
- Help bars, How to Play, camera-button titles and `{key:…}` tags all use them.

**Vibration**: an Options setting (Off, Low, High) scales every rumble. 52in1 scales it
again by the player's level.

**DualSense facade** (`src/ui/dualsense/`): `light(colour | null)`,
`trigger(which, effect | null)`, `motion()`, `touches()` and capability flags, with
three back ends:
- **52in1**: `window.AIHubSettings.dualsense`. Use each extra only while its flag is
  true, re-check on `change`, and never open the device.
- **WebHID**, standalone only and compiled out of the package:
  - Options → DualSense → *Connect…* calls `requestDevice` on a click or key, never on a
    pad button, and reconnects through `getDevices()`.
  - Port the pure functions (`outputReport`, `triggerBytes`, `inputOf`,
    `calibrationOf`, `crc32`) and their test vectors from 52in1's
    `assets/js/ui/dualsense.js`, crediting Linux's hid-playstation and Nielk1's MIT
    TriggerEffectGenerator as it does.
  - USB and Bluetooth; light bar, the first player light, triggers, gyroscope,
    accelerometer and touchpad.
- **None**.

**What the extras do**. Each adds to a control that already works on its own:

- **Light bar**: the active unit's team colour, shading to red as its HP falls and
  pulsing at critical HP. Gold on victory, dim red on defeat. Amber on the world map.
  Given back (`light(null)`) on the title screen.
- **Haptics**, on any pad that rumbles: short, distinct `dual-rumble` pulses for a hit,
  a heavy hit or critical, a KO (two pulses), spell impacts by element, a level-up, and
  landing from Jump.
- **Adaptive triggers**: L2 and R2 zoom with a light `resist` that stiffens near the
  zoom limits, so the end stop is felt. Let go when zooming ends and on leaving the
  battle view.
- **Motion camera**: gyroscope yaw orbits and pitch tilts, added to the right stick.
  It has its own Options toggle and sensitivity. Inside 52in1 it starts on when
  `dualsense.aim` is on; on a standalone page it starts off.
- **Touchpad**:
  - swipe left or right to rotate 90°, swipe up or down to tilt;
  - pinch to zoom, tap to recenter;
  - its click (button 17) shows the turn order.
- **Speaker and microphone**: not used. The game has no use for them.

**Options → Controller**:
- Button prompts and Vibration.
- DualSense status: "connected through 52in1", "connected (USB / Bluetooth)", or
  "not connected" with *Connect…* on a standalone page. Inside 52in1, when not
  connected, a line says the DualSense is set up in 52in1's Settings.
- Light bar, Trigger effects, Motion camera with its sensitivity, and Touchpad
  gestures.
- Whatever players see says 52in1, never AI Hub.

**Tests**:
- report bytes from the ported vectors;
- the facade against a mocked `AIHubSettings`, `change` events included;
- the Create + Options rule and glyph selection;
- e2e with simulated PlayStation and Xbox pads through every screen listed above.

Done when all of these pass.

## Phase 6 — 52in1 sessions

**Client and tags**: paste `tools/hub/session.js` unmodified as the first script, right
after `<meta charset>`. A unit test asserts it is byte-identical to the copy. Then the
tags:

| Tag | Value |
|---|---|
| `hub:session` | `1` |
| `hub:session-players` | `1-4` |
| `hub:session-mode` | `parallel` |
| `hub:session-goal` | at most 60 characters |
| `hub:session-howto` | at most 80 characters |
| `hub:session-minutes` | about 6 |
| `hub:session-goal-moments`, `hub:session-howto-moments` | the moments' own card |
| `hub:moment` | one tag per moment |

**The session start**:
- When `AIHub.active`, skip the title, the language menu, the Game Mode prompt, the
  story and all menus.
- `await AIHub.connect({ mode: ['parallel', 'moments'], seats: [1, 4] })`. With `null`,
  run the normal game.
- Build the round, present its first frame, then call `ready()` with no key press.
- Show a countdown synced to `AIHub.time()`, and take input from 0.
- On `end`: stop input and sound and freeze.
- In a session, the Game Menu keeps Resume, Options and How to Play only: no save,
  load or return to the title.
- Call `AIHub.fail(message)` when no renderer can start.

**Parallel: Trials**. Add five or six new battles in `src/data/battles/trials.ts`, on
existing small maps:
- a preset company of four at a fixed level, with set jobs, gear and abilities;
- four to six foes;
- fixed deployment, no crystals and no game-over screen;
- winnable in 4 to 8 minutes.

`AIHub.rng('deal')` picks the trial and `AIHub.rng('battle')` seeds the engine.
Reporting:
- `progress({ score, label })` about once a second. The score counts foes defeated,
  then foe HP removed. The label is translated, e.g. "{count} of {total} foes down".
- A win reports `result({ time: AIHub.time(), stats })`, with stats such as Turns,
  Foes defeated, Damage dealt and Allies standing.
- A defeat or `time-up` reports `result({ score, stats })` at once.
- Default battle speed 1.5× in sessions.

**Moments**: at least three, aim for five. One-turn tactical puzzles in
`src/data/battles/moments.ts`, each opened straight from `info.moment`, set up from
`AIHub.rng(info.moment)`, reported once with `result({ won, time })`, and decided at
`time-up` by its goal. Candidates:

- `archer-strike defeat 20` "Knock out the enemy archer this turn";
- `spell-break defeat 25` "Defeat the wizard before his spell lands";
- `bell-tower reach 20` "Climb to the bell tower in one move";
- `hold-the-gate defend 30` "Keep the wounded ward standing until time runs out";
- `last-chest collect 20` "Grab the treasure before it fades".

**Hot-seat versus** (`hot-seat versus 2`): a title-menu entry.
- Pick a Trial map and two preset companies; players alternate by unit turn.
- A hand-over screen names whose turn it is whenever control changes hands, and the
  teams wear player colours.
- Victory and defeat screens, Rematch and Exit.
- Covered by e2e.

**Harness**: `npm run hub:harness` passes for parallel and moments at 1 and 2 players,
for host-leave, and with the game opened outside a session. Add a parallel run with one
player to CI.

Done when the harness and the e2e pass.

## Phase 7 — Bugs, glitches and low-hanging fruit

Known items. Fix each, or defer it with a reason in `docs/REPO_AUDIT.md`.

1. The formation rename uses `prompt()`. Phase 4 replaces it.
2. **Gentle mode** works by a workaround. `setupBattle` reads `(state as any).__gentle`,
   which nothing sets (`src/game/setup.ts`), and `src/game/game.ts` overwrites the
   battle's read-only `gentle` afterwards. Pass the option through `setupBattle`
   instead.
3. Leftovers in `src/game/game.ts`:
   - the dead ternary `disabled: r === heroU ? false : false`;
   - `runBattle`'s doc comment, which promises `'retreat'`;
   - the `void THREE; void rinfo; …` line keeping unused imports.
4. REPO_AUDIT's *Known, not changed*:
   - pool transient spell meshes and status badges;
   - encode portraits asynchronously (no synchronous `toDataURL`);
   - stars drawn as 1 px points on the node renderer;
   - automatic quality stepping changes only the pixel ratio until the next map: apply
     the whole preset;
   - the M / Start skip (Phase 5) and QWERTY hints (Phases 3 and 5);
   - menus and dialogue hidden from screen readers: add ARIA menu roles, `aria-selected`
     and a polite live region for dialogue.
5. `docs/TODO.md`: invite-immunity accessories. If cheap: the `defect` scene command and
   a fixed hero deploy cell. Terrain-changing scripts, decor offsets, held props and
   riding animations only if time allows.
6. **Late-game winnability**. Add a veteran-party profile to the simulator (levels,
   jobs, abilities and gear a careful player would have by each chapter), run it over
   several seeds, and report win rates per battle. Look into every battle the veteran
   party never wins, `b_necropolis` included (305 turns): scripting faults, impossible
   objectives, AI exploits. Fix only clear faults.
7. **Start-up**: measure the time to `ready()` in a session and to the title outside
   one. If it is slow, lazy-load data a round never needs, such as story scenes.
8. **A correctness review** of `src/`: battle engine, flow, saves, input and UI. Fix
   each confirmed bug with a regression test.
9. Fix any console error or warning the e2e runs show.

## Phase 8 — Stretch: online versus

Start this only once Phases 0–7 and 9 pass.

- `shared-world versus 2`, in lockstep over `AIHub.send`:
  - the host's copy runs the authoritative battle;
  - the other copy sends its commands (move, act, end turn, facing);
  - the host checks them and broadcasts the ordered command log, reliably;
  - both apply it deterministically, seeded by `AIHub.rng('battle')`.
- A state hash every few commands catches desyncs; the host then sends a snapshot.
- Server mode (a host with no player of its own) runs the battle and relays.
- `AIHub.finish({ standings })` ends the round.

Name it in `hub:multiplayer` only when the harness passes `&mode=shared-world&how=versus`,
`&scenario=server` and host-leave. Otherwise delete the code.

## Phase 9 — Docs, CI, screenshots and hand-off

- **README**: rewrite the sections the work changed:
  - Running and What's in the game, with sessions, versus, languages and the DualSense;
  - Controls, with PlayStation glyphs and the extras;
  - Project layout (`src/i18n`, `src/audio`, `tools/hub`);
  - Checks (package, hub check, harness, audio verify);
  - Audio (original, synthesized);
  - Hosting (52in1).
- **AGENTS.md**: no Vercel; run the package and hub checks before shipping anything 52in1
  sees.
- **CI**: add `npm run hub:check -- --offline`, the parallel harness run, the i18n
  checks and the audio verify, and keep the simulator.
- **Screenshots**: `tools/covers.mjs` uses Playwright with a 960×720 viewport, device
  scale factor 2/3 and JPEG quality 58 (baseline). It takes, in English and outside a
  session, with nothing over the game:
  - `0.jpg`: the title screen;
  - `1.jpg`: a battle in action;
  - `2.jpg`: the world map or a cutscene.

  Look at each image before handing it in: not loading, blank or debug, and no two
  alike.
- **Hand-off**:
  1. Build the final package with
     `npm run package -- --model "<the model's name as its maker writes it>" --effort <level if known> --harness "Claude Code"`.
  2. Run every check.
  3. Send the zip to the owner with the import steps below.
  4. Don't push to `michaelcrosato/52in1` from this goal.

Import steps for the owner, in a clone of `michaelcrosato/52in1`. Its
`docs/adding-a-game.md` is the authority.

1. `git rm -r games/github-fft-2`, and delete its lines in `data/added.json` and
   `data/source-dates.json`.
2. `node lib/hub/catalogue-check.mjs PACKAGE`, then `pnpm ingest PACKAGE --dry-run` and
   `pnpm ingest PACKAGE`.
3. Give the new build the old one's date in `data/added.json`.
4. Trim the `github-fft-2` entry in `data/overrides.json` to what the tags don't say.
5. Translate: `node scripts/translate.mjs --games games/github-fft-2-v2/index.html` and
   `node scripts/translate.mjs --catalogue github-fft-2`.
6. Add a PATCH-NOTES line, run `pnpm test`, commit and push.

## Definition of done

- [ ] No Vercel config or wording is left, apart from dated history in `docs/REPO_AUDIT.md`.
- [ ] No third-party audio in the tree or the build. Every music and SFX cue is an
      original synthesized composition or effect, there are no voices, and
      `npm run audio:verify` passes.
- [ ] `npm test`, `npm run build` and `npm run sim` (0 stalls, 0 errors) pass, and so
      does Playwright in Chromium, plus Firefox and WebKit where they can run.
- [ ] `npm run package` makes at most 100 files and 95 MiB, and `catalogue-check` shows
      no errors. Each warning is explained, and the screenshots have been looked at.
- [ ] `npm run hub:harness` passes for every online mode `hub:multiplayer` names, and the
      game still runs outside a session.
- [ ] The `game-lines` block passes the checker, and the `en-XA`, `zh-XC` and `ar-XB`
      sweeps pass.
- [ ] Every screen works on a controller. Create + Options and PS are left to 52in1.
      PlayStation glyphs show for PlayStation pads. The DualSense extras work through a
      mocked `AIHubSettings`, and the WebHID report bytes match the ported vectors.
- [ ] Phase 7's items are each fixed or deferred with a reason, and REPO_AUDIT's
      *Pass 4 — 52in1* lists every fix.
- [ ] README.md, AGENTS.md and the docs describe the new state.
- [ ] Everything is merged into `main`, with no open PR, branch or stash.
- [ ] The final package has been sent to the owner with the import steps.

## Needs a person

- A real DualSense, over USB and Bluetooth, in Chrome or Edge on a standalone page and
  inside 52in1, plus real iPhone and Android devices. The automated checks only emulate
  them.
- Listening to the score. Automated checks measure levels and seams, not taste.
- Importing the package into 52in1, which happens in that repository under its own
  rules.
- Purging the old placeholder audio from this public repository's git history. That
  rewrites history and needs a force-push, so do it only if the owner asks.
- Optional:
  - a public standalone host (GitHub Pages);
  - removing the Vercel GitHub App's access if it is still installed.
