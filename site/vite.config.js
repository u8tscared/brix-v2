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
});

/* Vite range les feuilles partagées (home-*) APRÈS celle de la page : on remet l'ordre de cascade
   voulu (socle → accueil partagé → page commune → page) pour que les surcharges de page gagnent. */
const CSS_RANK = (href) => (/\/core-/.test(href) ? 0 : /\/home-/.test(href) ? 1 : /\/page-/.test(href) ? 2 : 3);
const cssOrder = () => ({
  name: 'brix-css-order',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    handler(html) {
      const re = /<link rel="stylesheet"[^>]*href="([^"]+\.css)"[^>]*>\n?/g;
      const links = [...html.matchAll(re)].filter((m) => m[1].includes('assets/'));
      if (links.length < 2) return html;
      const sorted = [...links].sort((a, b) => CSS_RANK(a[1]) - CSS_RANK(b[1])).map((m) => m[0]);
      let i = 0;
      return html.replace(re, (m, href) => (href.includes('assets/') ? sorted[i++] : m));
    },
  },
});

const siteHot = () => ({
  name: 'brix-site-hot',
  handleHotUpdate({ file, server }) {
    if (file.includes('/partials/')) server.ws.send({ type: 'full-reload' });
  },
});

export default defineConfig({
  base: './',
  plugins: [site(), siteHot(), cssOrder()],
  build: {
    outDir: 'dist',
    rollupOptions: { input: Object.fromEntries(PAGES.filter((p) => existsSync(resolve(root, `${p}.html`))).map((p) => [p, resolve(root, `${p}.html`)])) },
  },
});
