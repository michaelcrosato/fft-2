/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
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

export default defineConfig({
  base: './',
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [
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
