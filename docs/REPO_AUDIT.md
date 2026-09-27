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
