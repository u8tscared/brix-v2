import { defineConfig } from 'vite';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const root = __dirname;
const ALL_PAGES = ['index', 'fonctionnalites', 'tarifs', 'ia', 'brix-ai', 'fournisseurs', 'comparatif', 'demarrer', 'legal', 'connecteur-ia'];
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


/* ---------- Référencement : canonique, Open Graph, données structurées, générés pour chaque page ---------- */
const SITE_URL = (process.env.SITE_URL || 'https://brix-app.fr').replace(/\/$/, '');
const pageUrl = (page) => (page === 'index' ? `${SITE_URL}/` : `${SITE_URL}/${page}.html`);
const strip = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const attr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const ORG = { '@type': 'Organization', '@id': `${SITE_URL}/#org`, name: 'Brix', url: `${SITE_URL}/`, logo: `${SITE_URL}/logos/brix-app-icon.png`, email: 'contact@brix-app.fr', areaServed: 'FR' };
const APP = {
  '@type': 'SoftwareApplication', name: 'Brix', applicationCategory: 'BusinessApplication', operatingSystem: 'Web, iOS, Android',
  description: 'Logiciel de gestion pour artisans du bâtiment : devis dictés, factures électroniques, chantiers, planning, équipe, achats et fournisseurs.',
  publisher: { '@id': `${SITE_URL}/#org` },
  offers: [
    { '@type': 'Offer', name: 'Brix Start', price: '0', priceCurrency: 'EUR' },
    { '@type': 'Offer', name: 'Brix Pro', price: '29.99', priceCurrency: 'EUR' },
    { '@type': 'Offer', name: 'Brix Équipe', price: '69', priceCurrency: 'EUR' },
  ],
};
function seoHead(html, page) {
  if (/rel="canonical"/.test(html)) return ''; // page alias (ex. connecteur-ia) : elle porte déjà sa canonique
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || 'Brix';
  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  const url = pageUrl(page), img = `${SITE_URL}/og/brix.png`;
  const graph = [ORG, { '@type': 'WebPage', '@id': url, url, name: title, description: desc, inLanguage: 'fr-FR', isPartOf: { '@type': 'WebSite', name: 'Brix', url: `${SITE_URL}/` } }];
  if (page === 'index' || page === 'tarifs') graph.push(APP);
  // FAQ : reprise des questions réellement affichées sur la page
  const qas = [...html.matchAll(/<div class="qa[^"]*">\s*<h3><button[^>]*>([\s\S]*?)<svg[\s\S]*?<div class="ans"[^>]*>([\s\S]*?)<\/div><\/div><\/div>/g)];
  if (qas.length) graph.push({ '@type': 'FAQPage', mainEntity: qas.map(([, q, a]) => ({ '@type': 'Question', name: strip(q), acceptedAnswer: { '@type': 'Answer', text: strip(a) } })) });
  return [
    `<link rel="canonical" href="${url}">`,
    '<meta name="robots" content="index, follow, max-image-preview:large">',
    '<meta property="og:type" content="website">', '<meta property="og:locale" content="fr_FR">', '<meta property="og:site_name" content="Brix">',
    `<meta property="og:title" content="${attr(title)}">`, `<meta property="og:description" content="${attr(desc)}">`,
    `<meta property="og:url" content="${url}">`, `<meta property="og:image" content="${img}">`, '<meta property="og:image:width" content="1200">', '<meta property="og:image:height" content="630">',
    `<meta property="og:image:alt" content="Brix, le logiciel de gestion des artisans du bâtiment">`,
    '<meta name="twitter:card" content="summary_large_image">', `<meta name="twitter:title" content="${attr(title)}">`, `<meta name="twitter:description" content="${attr(desc)}">`, `<meta name="twitter:image" content="${img}">`,
    '<link rel="apple-touch-icon" href="logos/apple-touch-icon.png">', '<link rel="manifest" href="site.webmanifest">',
    `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')}</script>`,
  ].join('\n');
}

const site = () => ({
  name: 'brix-site',
  transformIndexHtml: {
    order: 'pre',
    handler(html, ctx) {
      let out = includePartials(html);
      out = out.replace('<!--@icons-->', sprite(collectIcons(out)));
      const page = (ctx.filename || ctx.path || 'index').split('/').pop().replace(/\.html$/, '') || 'index';
      out = out.replace('</head>', `${seoHead(out, page)}\n</head>`);
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
  /* Le site n'utilise pas Tailwind : on ignore le postcss.config.js de l'app à la racine. */
  css: { postcss: {} },
  plugins: [site(), siteHot(), cssOrder()],
  build: {
    outDir: 'dist',
    rollupOptions: { input: Object.fromEntries(PAGES.filter((p) => existsSync(resolve(root, `${p}.html`))).map((p) => [p, resolve(root, `${p}.html`)])) },
  },
});
