# 52in1 tools

Pinned copies of the public files 52in1 serves at <https://52in1.com/lib/hub/>, so the
game can be checked the way 52in1 checks it, offline and in CI.

| File | What it is | SHA-256 |
|---|---|---|
| `session.js` | AI Hub Session Protocol v1 client 1.4.0. `index.html` carries it unmodified as its first script (a unit test compares them). | `6ab6be43898e2db069bc21a94757d77d9c3f2a0cb76f01186490d3bd88d8717a` |
| `harness.html` | the session harness: plays the hub for 1–4 copies of the game | `2f2004bbc32839a9dfe6abc44f8de577a55011edf4588a5a564b32207b368061` |
| `bridge.js` | the harness's simulated network | `1c98dca8faabb5d2a2ed82a6e147ba1aa29a9c5e0bcd2143e29d15a97a5f0380` |
| `round.js` | the harness's round logic and timings | `4990f4640deac6281d0ccace59086885ebb21f4c99a03bd52730219428a0f6b9` |
| `catalogue-check.mjs` | the AI Hub Catalogue v1 checker | `f9b9fb190827902a9baa0034b94c2250cd44e2d8e5b103d4450560e81bf5c8e7` |

Copied on 18 November 2026 from `michaelcrosato/52in1` at `fdc2dd62`; each file was
byte-identical to the one 52in1.com served that day. The specs they implement:
[Session Protocol](https://52in1.com/lib/hub/README.md),
[Catalogue](https://52in1.com/lib/hub/catalogue.md),
[Languages](https://52in1.com/lib/hub/languages.md).

To refresh them, download each file again and update this table and the client in
`index.html` (`tests/hub.test.ts` fails until the two match):

```bash
for f in session.js harness.html bridge.js round.js catalogue-check.mjs; do curl -fsSo tools/hub/$f https://52in1.com/lib/hub/$f; done
sha256sum tools/hub/*.js tools/hub/*.html tools/hub/*.mjs
```

## Scripts

- `npm run covers` (`tools/covers.mjs`) takes the three cover frames from `dist/` into
  `tools/out/covers/`: the title, a battle's move range and a story scene. Look at each one.
- `npm run package` builds the 52in1 package (`tools/package.mjs`): `package/games/<folder>/`
  and `package/covers/<slug>/0–2.jpg`, then runs the checker on it and zips it as
  `package.zip`. For the hand-off build, pass the credit:
  `npm run package -- --model "…" --effort … --harness "Claude Code"`.
- `npm run hub:check` does the same as a draft, as CI does: offline, unzipped, and passing when
  the only errors are the credit and covers that come at hand-off.
- `npm run hub:harness` (`run-harness.mjs`) serves the built game beside `harness.html` and
  plays the scenarios 52in1 plays when a game joins: parallel and moments at 1 and 2
  players on a poor network, a player leaving, then the game outside a session.
