import { defineConfig } from 'vite';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const root = __dirname;
const ALL_PAGES = ['index', 'fonctionnalites', 'tarifs', 'ia', 'fournisseurs', 'comparatif', 'demarrer'];
const PAGES = process.env.PAGES ? process.env.PAGES.split(',') : ALL_PAGES;

/* ---------- Partials : <!--@include nom--> ---------- */
function includePartials(html, depth = 0) {
  if (depth > 5) return html;
  return html.replace(/<!--@include ([\w./-]+)-->/g, (_, name) => {
    const file = resolve(root, 'partials', /\.[a-z]+$/.test(name) ? name : `${name}.html`);
    return includePartials(readFileSync(file, 'utf8'), depth + 1);
  });
}

/* ---------- Sprite Lucide généré à partir des icônes réellement utilisées ---------- */
function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(js|html)$/.test(f)) out.push(p);
  }
  return out;
}
function collectIcons(html) {
  const sources = [html, ...walk(resolve(root, 'src')).map((f) => readFileSync(f, 'utf8'))];
  const names = new Set();
  const patterns = [/#i-([a-z0-9-]+)/g, /\bic\(\s*['"]([a-z0-9-]+)['"]/g, /\bicon\s*:\s*['"]([a-z0-9-]+)['"]/g, /data-icon="([a-z0-9-]+)"/g];
  for (const s of sources) for (const re of patterns) for (const m of s.matchAll(re)) names.add(m[1]);
  return [...names].sort();
}
function sprite(names) {
  const dir = resolve(root, 'node_modules/lucide-static/icons');
  const symbols = names.map((n) => {
    const f = join(dir, `${n}.svg`);
    if (!existsSync(f)) { console.warn(`[icons] icône Lucide inconnue : ${n}`); return ''; }
    const inner = readFileSync(f, 'utf8').replace(/<!--.*?-->/gs, '').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    return `<symbol id="i-${n}" viewBox="0 0 24 24">${inner.replace(/\s+/g, ' ').trim()}</symbol>`;
  });
  return `<svg width="0" height="0" style="position:absolute" aria-hidden="true">${symbols.join('')}</svg>`;
}

const site = () => ({
  name: 'brix-site',
  transformIndexHtml: {
    order: 'pre',
    handler(html) {
      let out = includePartials(html);
      out = out.replace('<!--@icons-->', sprite(collectIcons(out)));
      return out;
    },
  },
  handleHotUpdate({ file, server }) {
    if (file.includes('/partials/')) server.ws.send({ type: 'full-reload' });
  },
});

export default defineConfig({
  base: './',
  plugins: [site()],
  build: {
    outDir: 'dist',
    rollupOptions: { input: Object.fromEntries(PAGES.filter((p) => existsSync(resolve(root, `${p}.html`))).map((p) => [p, resolve(root, `${p}.html`)])) },
  },
});
