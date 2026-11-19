/**
 * Plugin Vite « PWA Brix » (sans dépendance) :
 * - au build, écrit dist/sw.js à partir de scripts/pwa/sw.template.js avec la liste des fichiers à précacher
 *   (index.html, JS/CSS hachés, polices, icônes, manifeste) et une version = empreinte de cette liste ;
 * - précharge la police Geist (latin) dans index.html pour éviter le saut de police.
 * Pourquoi pas vite-plugin-pwa : Workbox ajoute ~20 kB et une config lourde pour ce qu'on fait en 150 lignes.
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

const EXCLUS = [/^sw\.js$/, /\.map$/, /^splash\//, /^icons\/app-store-1024\.png$/, /^\.DS_Store$/, /(^|\/)\./];

function lister(dir: string, base = dir): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? lister(p, base) : [path.relative(base, p).split(path.sep).join('/')];
  });
}

export function brixPwa(): Plugin {
  let outDir = 'dist';
  let root = process.cwd();
  return {
    name: 'brix-pwa',
    apply: 'build',
    configResolved(c) {
      root = c.root;
      outDir = path.resolve(c.root, c.build.outDir);
    },
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        const font = Object.keys(ctx.bundle ?? {}).find((f) => /geist-latin-[\w-]+\.woff2$/.test(f) && !/mono|ext/.test(f));
        return font ? [{ tag: 'link', attrs: { rel: 'preload', href: `./${font}`, as: 'font', type: 'font/woff2', crossorigin: '' }, injectTo: 'head-prepend' }] : [];
      },
    },
    closeBundle() {
      const fichiers = lister(outDir).filter((f) => !EXCLUS.some((r) => r.test(f)));
      const precache = ['./', ...fichiers.map((f) => `./${f}`)];
      const empreinte = createHash('sha256');
      for (const f of fichiers) empreinte.update(f).update(readFileSync(path.join(outDir, f)));
      const version = empreinte.digest('hex').slice(0, 12);
      const modele = readFileSync(path.resolve(root, 'scripts/pwa/sw.template.js'), 'utf8');
      const sw = modele.replace("'__BRIX_VERSION__'", JSON.stringify(version)).replace('__BRIX_PRECACHE__', JSON.stringify(precache));
      writeFileSync(path.join(outDir, 'sw.js'), sw);
      this.info?.(`sw.js : ${precache.length} fichiers précachés, version ${version}`);
    },
  };
}
