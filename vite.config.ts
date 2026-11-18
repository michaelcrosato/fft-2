/// <reference types="vitest/config" />
import { createServer, defineConfig, type Plugin, type ViteDevServer } from 'vite';
import { fileURLToPath } from 'node:url';

/**
 * Boot imports the renderer, node materials, monster models and the title flow one after
 * another. Preloading those chunks from the HTML downloads them alongside the entry bundle.
 * The title's Latin fonts are requested up front too, instead of when its text first renders.
 */
function preloadBootChunks(modules: string[], fonts: RegExp[]): Plugin {
  return {
    name: 'preload-boot-chunks',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const chunks = new Map<string, { imports: string[] }>();
        const facades: [string, string][] = [];
        const fontFiles: string[] = [];
        for (const c of Object.values(ctx.bundle ?? {})) {
          if (c.type === 'asset' && fonts.some((f) => f.test(c.fileName))) fontFiles.push(c.fileName);
          if (c.type !== 'chunk') continue;
          chunks.set(c.fileName, c);
          if (c.facadeModuleId) facades.push([c.facadeModuleId, c.fileName]);
        }
        const files = new Set<string>();
        const add = (file: string) => {
          if (files.has(file)) return;
          files.add(file);
          chunks.get(file)?.imports.forEach(add);
        };
        for (const m of modules) {
          const hit = facades.find(([id]) => id.endsWith(m));
          if (!hit) throw new Error(`preload-boot-chunks: ${m} is no longer its own chunk; update vite.config.ts`);
          add(hit[1]);
        }
        if (fontFiles.length !== fonts.length) throw new Error(`preload-boot-chunks: expected ${fonts.length} fonts, found ${fontFiles.join(', ')}`);
        return [
          ...[...files]
            .filter((f) => !html.includes(f))
            .map((f) => ({ tag: 'link', attrs: { rel: 'modulepreload', crossorigin: true, href: `./${f}` }, injectTo: 'head' as const })),
          ...fontFiles.map((f) => ({ tag: 'link', attrs: { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: true, href: `./${f}` }, injectTo: 'head' as const })),
        ];
      },
    },
  };
}

/**
 * AI Hub Languages v1: write the game-lines block (every line players read) into the page, in place
 * of `<!-- game-lines -->`, so translation tools can read it without running the game. The lines
 * come from src/i18n/extract.ts, loaded through Vite so the content registry's globs resolve.
 */
function gameLines(): Plugin {
  let server: ViteDevServer | null = null;
  let built: string | null = null;
  const load = async (ssr: (id: string) => Promise<Record<string, unknown>>) => {
    const mod = (await ssr('/src/i18n/extract.ts')) as { buildLines(): { block: unknown; conflicts: string[] } };
    const { block, conflicts } = mod.buildLines();
    if (conflicts.length) throw new Error(`game-lines: one id, two texts: ${conflicts.slice(0, 5).join(', ')}`);
    return JSON.stringify(block).replace(/</g, '\\u003c');
  };
  return {
    name: 'game-lines',
    configureServer(s) { server = s; },
    async buildStart() {
      if (server) return;
      const vite = await createServer({ configFile: false, root: fileURLToPath(new URL('.', import.meta.url)), logLevel: 'error', appType: 'custom', server: { middlewareMode: true, hmr: false }, resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } } });
      try { built = await load((id) => vite.ssrLoadModule(id)); } finally { await vite.close(); }
    },
    transformIndexHtml: {
      order: 'pre',
      async handler(html) {
        if (!html.includes('<!-- game-lines -->')) return html;
        const json = server ? await load((id) => server!.ssrLoadModule(id)) : built;
        if (json == null) throw new Error('game-lines: the block was not built');
        return html.replace('<!-- game-lines -->', () => `<script type="application/json" id="game-lines">${json}</script>`);
      },
    },
  };
}

export default defineConfig({
  base: './',
  // the 52in1 package (npm run package) leaves out what 52in1 forbids: opening a controller over WebHID
  define: { __HUB_PACKAGE__: JSON.stringify(process.env.HUB_PACKAGE === '1') },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [
    gameLines(),
    preloadBootChunks(
      ['three/build/three.webgpu.js', 'three/build/three.tsl.js', 'src/gfx/models/monsters.ts', 'src/game/flow.ts'],
      [/cinzel-latin-500-normal-.*\.woff2$/, /cinzel-latin-700-normal-.*\.woff2$/, /eb-garamond-latin-400-normal-.*\.woff2$/, /eb-garamond-latin-400-italic-.*\.woff2$/],
    ),
  ],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 4000,
    sourcemap: false,
  },
  server: { port: 5173, strictPort: false },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
