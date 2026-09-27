# Compatibility and bug sweep — September 2026

The browser suite uses the production bundle, with desktop Chromium, Firefox and
WebKit plus Android-phone, iPhone, small-phone, landscape-phone and tablet profiles.
These are browser/device emulations, not physical-device certification.

## Reproducible browser environment

The host's WebKit installation lacked shared libraries. `tools/browser-test.sh`
uses Microsoft's official Playwright image matching the installed Playwright
version, Xvfb and software Mesa. It caches dependencies and build output outside
`/tmp`, mounts source read-only, and saves reports in `tools/out/compatibility/`.
It leaves global Docker credentials and the host's Node installation unchanged.

```bash
./tools/browser-test.sh --probe       # actual-game WebGL 1/2 rendering probes
E2E_WORKERS=2 ./tools/browser-test.sh  # complete browser/device matrix
npm run build
npm test
npx vite-node tools/simcampaign.ts
```

Installed image: `mcr.microsoft.com/playwright:v1.63.0-noble`, verified digest
`sha256:eff16c30e6f3f4af0a03fa4b706120d5e9b0891c344a27d64559aff5900a4a27`.
Browser versions: Chromium 153.0.8010.12, Firefox 155.0, WebKit 26.6.
The container includes Node 24; the production build and unit suite were also
checked on the project's declared Node 22 runtime.

The runner follows the [official Playwright Docker instructions](https://playwright.dev/docs/docker).
The test server refuses an occupied port so a different local project cannot
silently satisfy the readiness check. Output/report paths are configurable to
keep host and container evidence separate.

## Bugs corrected

| Area | Correction | Regression coverage |
| --- | --- | --- |
| Saves | Denied storage access and malformed save state no longer crash title/save menus; failed writes do not claim a new save timestamp. | State tests and browser storage-denial flow. |
| Returning companions | Legacy defaults are restored for away companions as well as the active company. | Save/load/return round trips. |
| Errands | EXP rewards apply level growth immediately; missing dispatch parties cannot collect rewards. | Level-up, cap, duplicate-reward and empty-party cases. |
| Recruitment | Permanent Invite ownership is kept separate from temporary Charm; results report actual recruits and defections. | Battle-result ownership cases. |
| Encounters | Negative relative levels use valid offsets rather than strings such as `+-1`. | Generated encounter and spawn checks. |
| Combat previews | Elemental Throw, Gravity and boosted healing previews use the rules applied by resolution. | Preview-versus-hit comparisons. |
| Magic supports | Iaido and Geomancy respect magic attack/defense supports while remaining usable under Silence. | Modifier and usability cases. |
| Arithmeticks | Revival can select fallen units; support AI evaluates the selected spell. | Calculated Raise, damage exclusion and cure decisions. |
| Reactions and AI | Counter Tackle uses Rush; MP-only attacks participate in AI decisions; Mimic copies charged spells when they resolve. | Reaction, AI and delayed-resolution cases. |
| Interrupted actions | Disabling conditions stop subsequent actions/movement, and stale plans cannot use exhausted items. | Mid-turn status and inventory cases. |
| Camera | Held zoom stops when focus is lost or the page is hidden; disposal removes its listeners. | Browser blur/hide interruption checks. |
| Mixed input | Menus react to mouse movement, so a stationary cursor cannot steal keyboard/gamepad selection when a menu appears beneath it. | Reproduced in WebKit; stationary-enter and real-movement regression. |
| Cutscenes | A single Skip finishes a typing line, respects choices, and remains effective while a portrait loads; actors return to idle. | Typing, choice and portrait-boundary browser cases. |

## Verification scope

The rendering probe verified all six combinations of three browser engines and
WebGL 1/2: the requested backend was selected, the title rendered, frames advanced,
and no application exception was reported. The production build, content validator
and all 85 unit/regression tests passed.

The script-aware simulator completed all 72 campaign/side-battle runs with zero
stalls and zero exceptions (31 bot victories, 41 bot defeats).
An independent save round-trip audit also passed for all 50 named characters
(active and away), 59 monster jobs, 20 generic jobs at level 99, and all 85 story
boundaries.

Browser tests also exercise menus, new games, typed names, gamepad input, battle
camera controls, a complete move/wait/facing turn, reference scrolling, storage
denial, graphics fallback, and orientation changes. Detailed run results are in
the generated HTML report and logs under `tools/out/compatibility/`.

The complete final rerun passed **161 browser tests**, with **15 expected skips**
and **zero failures** (176 cases, 20.2 minutes):

| Profile | Passed | Expected skips |
| --- | ---: | ---: |
| Chromium desktop | 22 | 0 |
| Firefox desktop | 22 | 0 |
| WebKit desktop | 22 | 0 |
| Android phone | 19 | 3 |
| iPhone | 19 | 3 |
| Small phone | 19 | 3 |
| Landscape phone | 19 | 3 |
| Tablet | 19 | 3 |

The skipped cases are mouse-only checks and the desktop-only gamepad form test
on touch profiles. Every profile ran the complete battle-turn interaction,
graphics fallback, storage denial, resizing, zoom interruption and cutscene tests.

The initial matrix exercised normal automatic graphics quality and exposed the
menu defect and automation issues described above. Its evidence remains in
`default-matrix-results/`, `default-matrix-report/` and `full-matrix.log`. After
repairs, the complete rerun used `E2E_QUALITY=low` to reduce software graphics cost
while checking every interaction again. Final evidence is in `docker-report/`,
`docker-results/` and `final-matrix.log`; no application tests were removed.

Hardware WebGPU, real iOS Safari and physical controllers remain separate checks.
The campaign simulator uses fixed bot parties and scripted battle effects: a bot
defeat is not by itself evidence that a battle is unwinnable by a player.

The mobile WebKit emulator retained the previous CSS layout width after
`setViewportSize` changed the screen size (reproduced on a blank page without any
game code: `innerWidth` became 375 while `clientWidth` remained 402). The resize
test reparses the unchanged viewport meta declaration, then asserts both widths
before checking layout. This is an emulator workaround, not a product CSS change
or a claim about physical Safari rotation. See Playwright's
[viewport/screen API](https://playwright.dev/docs/api/class-page#page-set-viewport-size).
