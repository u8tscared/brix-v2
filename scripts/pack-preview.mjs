// Prépare dist/ pour une page de prévisualisation hébergée (artifact) :
// retire le squelette <html>/<head>/<body> que l'hébergeur ajoute lui-même.
import fs from 'node:fs';
const html = fs.readFileSync('dist/index.html', 'utf8');
const head = html.match(/<head>([\s\S]*)<\/head>/)[1];
const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
const keep = head
  .split('\n')
  .filter((l) => !/<meta charset|<meta name="viewport"|rel="icon"/.test(l))
  .join('\n');
const out = `<title>Brix V2</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n${keep.replace(/<title>.*<\/title>/, '')}\n<style>html,body{background:#f4f3fa}</style>\n${body}\n`;
fs.writeFileSync('dist/preview.html', out);
const files = fs.readdirSync('dist/assets').map((f) => `assets/${f}`);
fs.writeFileSync('dist/preview-files.json', JSON.stringify(Object.fromEntries(files.map((f) => [f, `dist/${f}`])), null, 1));
console.log('preview.html +', files.length, 'fichiers');
