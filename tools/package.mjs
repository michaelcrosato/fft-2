#!/usr/bin/env node
// Builds the 52in1 package (AI Hub Catalogue v1, *The package*) and checks it:
//   package/games/<folder>/index.html …   the game, built with HUB_PACKAGE=1 (no WebHID code)
//   package/covers/<slug>/0.jpg 1.jpg 2.jpg   the screenshots tools/covers.mjs took
// then runs tools/hub/catalogue-check.mjs on it and zips it as package.zip.
//
// Usage: node tools/package.mjs [--folder github-fft-2-v2] [--offline] [--no-build] [--no-zip]
//                               [--model "…"] [--effort low|medium|high|xhigh|max|ultra] [--harness "…"]
// The credit (--model, --effort, --harness) is written into the packaged page only, never into the repo.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { slugOf, EFFORTS } from './hub/catalogue-check.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'package');
const BUILD = path.join(ROOT, 'tools', 'out', 'package-build');
const COVERS = path.join(ROOT, 'tools', 'out', 'covers');
const MiB = 1024 * 1024;
const LIMITS = { files: 100, bytes: 95 * MiB, file: 25 * MiB };
/** Leftovers of a build that never go in a package (catalogue, *The package*). */
const NEVER = /(^|\/)(\.env[^/]*|\.git|node_modules|\.DS_Store|[^/]*\.map)(\/|$)/;

function args(argv) {
  const out = { folder: 'github-fft-2-v2', offline: false, build: true, zip: true, model: '', effort: '', harness: '' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const value = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${a} needs a value`);
      return v;
    };
    if (a === '--folder') out.folder = value();
    else if (a === '--offline') out.offline = true;
    else if (a === '--no-build') out.build = false;
    else if (a === '--no-zip') out.zip = false;
    else if (a === '--model') out.model = value();
    else if (a === '--effort') out.effort = value();
    else if (a === '--harness') out.harness = value();
    else throw new Error(`unknown argument ${a}`);
  }
  if (!/^[A-Za-z0-9-]+$/.test(out.folder)) throw new Error('--folder is letters, digits and hyphens');
  if (out.effort && !EFFORTS.includes(out.effort)) throw new Error(`--effort is one of ${EFFORTS.join(', ')}`);
  return out;
}

function run(cmd, cmdArgs, env = {}) {
  const r = spawnSync(cmd, cmdArgs, { cwd: ROOT, stdio: 'inherit', env: { ...process.env, ...env } });
  if (r.status !== 0) throw new Error(`${cmd} ${cmdArgs.join(' ')} failed`);
}

function files(dir, base = dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? files(p, base) : [path.relative(base, p).split(path.sep).join('/')];
  });
}

const attr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** The credit tags go just before hub:session, among the other catalogue tags. */
function credit(html, { model, effort, harness }) {
  const tags = [
    model && `<meta name="hub:model" content="${attr(model)}">`,
    effort && `<meta name="hub:effort" content="${attr(effort)}">`,
    harness && `<meta name="hub:harness" content="${attr(harness)}">`,
  ].filter(Boolean);
  if (!tags.length) return html;
  if (/<meta name="hub:(model|effort|harness)"/.test(html)) throw new Error('the built page already names a credit tag');
  const at = html.indexOf('<meta name="hub:session"');
  if (at < 0) throw new Error('no hub:session tag to place the credit before');
  return html.slice(0, at) + tags.join('\n') + '\n' + html.slice(at);
}

function main() {
  const opt = args(process.argv.slice(2));
  const { slug } = slugOf(opt.folder);
  if (opt.build) {
    run('npx', ['tsc', '--noEmit']);
    run('npm', ['run', '--silent', 'validate']);
    run('npx', ['vite', 'build', '--outDir', BUILD, '--emptyOutDir', '--logLevel', 'warn'], { HUB_PACKAGE: '1' });
  }
  if (!existsSync(path.join(BUILD, 'index.html'))) throw new Error(`no build in ${path.relative(ROOT, BUILD)}: run without --no-build`);

  rmSync(OUT, { recursive: true, force: true });
  rmSync(path.join(ROOT, 'package.zip'), { force: true });
  const game = path.join(OUT, 'games', opt.folder);
  mkdirSync(game, { recursive: true });
  cpSync(BUILD, game, { recursive: true });
  const page = path.join(game, 'index.html');
  writeFileSync(page, credit(readFileSync(page, 'utf8'), opt));

  const covers = path.join(OUT, 'covers', slug);
  mkdirSync(covers, { recursive: true });
  for (const f of ['0.jpg', '1.jpg', '2.jpg']) {
    const from = path.join(COVERS, f);
    if (existsSync(from)) cpSync(from, path.join(covers, f));
    else console.warn(`! no ${path.relative(ROOT, from)}: run node tools/covers.mjs first`);
  }

  const list = files(game);
  const sizes = list.map((f) => [f, statSync(path.join(game, f)).size]);
  const total = sizes.reduce((n, [, s]) => n + s, 0);
  const problems = [];
  if (list.length > LIMITS.files) problems.push(`${list.length} files: at most ${LIMITS.files}`);
  if (total > LIMITS.bytes) problems.push(`${(total / MiB).toFixed(1)} MiB: at most 95 MiB`);
  for (const [f, s] of sizes) if (s > LIMITS.file) problems.push(`${f} is ${(s / MiB).toFixed(1)} MiB: at most 25 MiB`);
  for (const f of list) if (NEVER.test(f)) problems.push(`${f} never goes in a package`);
  if (/navigator\s*\.\s*hid\b/.test(list.filter((f) => /\.(js|html)$/.test(f)).map((f) => readFileSync(path.join(game, f), 'utf8')).join('\n'))) {
    problems.push('the package mentions navigator.hid: the WebHID back end must be compiled out (HUB_PACKAGE=1)');
  }
  console.log(`package/games/${opt.folder}: ${list.length} files, ${(total / MiB).toFixed(2)} MiB · slug ${slug}`);
  for (const p of problems) console.error(`✗ ${p}`);

  const check = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'hub', 'catalogue-check.mjs'), OUT, ...(opt.offline ? ['--offline'] : [])], { cwd: ROOT, stdio: 'inherit' });
  if (opt.zip && !problems.length) {
    const z = spawnSync('zip', ['-qr', path.join(ROOT, 'package.zip'), '.'], { cwd: OUT, stdio: 'inherit' });
    if (z.error) console.warn('! zip is not installed: package/ is the package');
    else if (z.status === 0) console.log(`package.zip: ${(statSync(path.join(ROOT, 'package.zip')).size / MiB).toFixed(2)} MiB`);
  }
  if (problems.length || check.status !== 0) process.exitCode = 1;
}

try {
  main();
} catch (e) {
  console.error(`✗ ${e.message}`);
  process.exitCode = 1;
}
