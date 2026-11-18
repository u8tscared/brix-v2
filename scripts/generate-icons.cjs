/**
 * Génère les icônes et écrans de démarrage de la PWA à partir du logo de l'appli
 * (même dessin que BrandTile dans src/components/brand/Logo.tsx : dégradé Aube, reflet, B blanc à coche).
 *
 * Rendu par Chromium via Playwright (pas de dépendance ajoutée au projet) :
 *   NODE_PATH=/chemin/vers/un/node_modules/avec/playwright node scripts/generate-icons.cjs
 * (ou `npx -p playwright node scripts/generate-icons.cjs` si NODE_PATH pointe vers ce cache npx).
 *
 * Sorties : public/favicon.svg, public/icons/*.png, public/splash/*.png, docs/brand/app-store-1024.png.
 * Les icônes iOS sont pleines (fond opaque, pas d'arrondi : iOS applique son propre masque).
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const logo = fs.readFileSync(path.join(ROOT, 'src/components/brand/Logo.tsx'), 'utf8');
const B_PATH = logo.match(/export const B_PATH =\s*'([^']+)'/)[1];
const B_VIEWBOX = logo.match(/export const B_VIEWBOX = '([^']+)'/)[1];
const PAGE = '#f7f5fc';

/** Tuile Aube (viewBox 100). rx = 24 comme BrandTile ; rx = 0 pour les icônes iOS / masquables (pleines). */
function tile({ rx = 24, bScale = 1 } = {}) {
  const w = 44 * bScale;
  const h = 52 * bScale;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<defs>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6d28d9"/><stop offset=".62" stop-color="#d946ef"/><stop offset="1" stop-color="#fb923c"/></linearGradient>
<linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
</defs>
<rect width="100" height="100" rx="${rx}" fill="url(#g)"/>
<rect width="100" height="100" rx="${rx}" fill="url(#s)"/>
<svg x="${50 - w / 2}" y="${51 - h / 2}" width="${w}" height="${h}" viewBox="${B_VIEWBOX}"><path fill-rule="evenodd" fill="#fff" d="${B_PATH}"/></svg>
</svg>`;
}

/** Badge Android (barre d'état) : B blanc seul sur fond transparent. */
function badge() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><svg x="18" y="12" width="64" height="76" viewBox="${B_VIEWBOX}"><path fill-rule="evenodd" fill="#fff" d="${B_PATH}"/></svg></svg>`;
}

const ICONS = [
  // iOS (écran d'accueil) : pleines, opaques.
  { file: 'public/icons/apple-touch-icon.png', size: 180, svg: tile({ rx: 0 }) },
  { file: 'public/icons/apple-touch-icon-167.png', size: 167, svg: tile({ rx: 0 }) },
  { file: 'public/icons/apple-touch-icon-152.png', size: 152, svg: tile({ rx: 0 }) },
  { file: 'public/icons/apple-touch-icon-120.png', size: 120, svg: tile({ rx: 0 }) },
  // Manifeste : « any » arrondie comme la tuile de l'appli, « maskable » pleine (B dans la zone sûre de 80 %).
  { file: 'public/icons/icon-192.png', size: 192, svg: tile() },
  { file: 'public/icons/icon-512.png', size: 512, svg: tile() },
  { file: 'public/icons/icon-maskable-512.png', size: 512, svg: tile({ rx: 0, bScale: 0.86 }) },
  { file: 'public/icons/icon-maskable-192.png', size: 192, svg: tile({ rx: 0, bScale: 0.86 }) },
  { file: 'public/icons/badge-96.png', size: 96, svg: badge(), transparent: true },
  // Onglet du navigateur.
  { file: 'public/icons/favicon-32.png', size: 32, svg: tile() },
  { file: 'public/icons/favicon-16.png', size: 16, svg: tile() },
  // App Store : 1024 pleine, sans transparence.
  { file: 'docs/brand/app-store-1024.png', size: 1024, svg: tile({ rx: 0 }) },
];

// Écrans de démarrage iOS : [largeur, hauteur (points, portrait), densité, paysage aussi ?]
const SPLASH = [
  [1032, 1376, 2, true], // iPad Pro 13" (M4)
  [1024, 1366, 2, true], // iPad Pro 12,9" / iPad Air 13"
  [834, 1210, 2, true], // iPad Pro 11" (M4)
  [834, 1194, 2, true], // iPad Pro 11"
  [820, 1180, 2, true], // iPad Air 10,9" / iPad 10e gén.
  [834, 1112, 2, true], // iPad Air 10,5"
  [810, 1080, 2, true], // iPad 10,2" (7e à 9e gén.)
  [768, 1024, 2, true], // iPad 9,7" / mini 7,9"
  [744, 1133, 2, true], // iPad mini 8,3"
  [440, 956, 3, false], // iPhone 16 Pro Max
  [402, 874, 3, false], // iPhone 16 Pro
  [430, 932, 3, false], // iPhone 15/16 Plus, 15 Pro Max, 14 Pro Max
  [393, 852, 3, false], // iPhone 15/16, 15 Pro, 14 Pro
  [428, 926, 3, false], // iPhone 14 Plus, 13/12 Pro Max
  [390, 844, 3, false], // iPhone 14, 13, 12
  [375, 812, 3, false], // iPhone 13 mini, 12 mini, 11 Pro, X/XS
  [414, 896, 3, false], // iPhone 11 Pro Max, XS Max
  [414, 896, 2, false], // iPhone 11, XR
  [414, 736, 3, false], // iPhone 8 Plus
  [375, 667, 2, false], // iPhone SE (2e et 3e gén.), 8
];

function splashHtml(w, h) {
  const t = Math.round(Math.min(w, h) * 0.24);
  return `<!doctype html><html><body style="margin:0;width:${w}px;height:${h}px;background:${PAGE};display:grid;place-items:center;overflow:hidden">
<div style="width:${t}px;height:${t}px;filter:drop-shadow(0 ${t * 0.12}px ${t * 0.22}px rgba(217,70,239,.28)) drop-shadow(0 ${t * 0.02}px ${t * 0.04}px rgba(60,30,120,.12))">${tile().replace('<svg ', `<svg width="${t}" height="${t}" `)}</div>
</body></html>`;
}

async function main() {
  let pw;
  try {
    pw = require('playwright');
  } catch {
    console.error('Playwright introuvable : lancer avec NODE_PATH=<dossier node_modules contenant playwright>.');
    process.exit(1);
  }
  const browser = await pw.chromium.launch();
  const page = await browser.newPage();
  const shot = async (file, w, h, html, opts = {}) => {
    fs.mkdirSync(path.dirname(path.join(ROOT, file)), { recursive: true });
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(html);
    await page.screenshot({ path: path.join(ROOT, file), omitBackground: !!opts.transparent, clip: { x: 0, y: 0, width: w, height: h } });
  };

  for (const i of ICONS) {
    const svg = i.svg.replace('<svg ', `<svg width="${i.size}" height="${i.size}" `);
    // Icônes arrondies : coins transparents ; icônes pleines : fond opaque garanti.
    const transparent = i.transparent || /rx="24"/.test(i.svg);
    await shot(i.file, i.size, i.size, `<!doctype html><html><body style="margin:0;background:${transparent ? 'transparent' : '#6d28d9'}">${svg}</body></html>`, { transparent });
  }
  fs.writeFileSync(path.join(ROOT, 'public/favicon.svg'), tile().replace(/\n/g, ''));

  const links = [];
  fs.rmSync(path.join(ROOT, 'public/splash'), { recursive: true, force: true });
  for (const [w, h, dpr, land] of SPLASH) {
    for (const o of land ? ['portrait', 'landscape'] : ['portrait']) {
      const [pw2, ph2] = o === 'portrait' ? [w * dpr, h * dpr] : [h * dpr, w * dpr];
      const name = `splash/splash-${pw2}x${ph2}.png`;
      await shot(`public/${name}`, pw2, ph2, splashHtml(pw2, ph2));
      links.push(
        `<link rel="apple-touch-startup-image" href="./${name}" media="(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: ${o})" />`,
      );
    }
  }
  await browser.close();
  fs.writeFileSync(path.join(ROOT, 'scripts/pwa/splash-links.html'), links.join('\n') + '\n');
  console.log(`${ICONS.length} icônes, ${links.length} écrans de démarrage. Balises : scripts/pwa/splash-links.html (à recopier dans index.html).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
