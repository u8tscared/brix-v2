// Impression / « Enregistrer en PDF » : seules les pages du document partent à l'imprimante.
// Le document est rendu à part (racine React dédiée), mis en pages, puis window.print().

import { createRoot } from 'react-dom/client';
import { DocPages, type DocSpec } from './PagedDoc';

const CSS = `
#brix-print { position: fixed; left: -30000px; top: 0; pointer-events: none; }
@media print {
  @page { size: A4; margin: 0; }
  html, body { background: #fff !important; height: auto !important; overflow: visible !important; }
  body > *:not(#brix-print) { display: none !important; }
  #brix-print { display: block !important; position: static !important; left: 0 !important; }
  #brix-print [data-page] { break-after: page; page-break-after: always; }
  #brix-print [data-page]:last-child { break-after: auto; page-break-after: auto; }
  #brix-print .doc-page { box-shadow: none !important; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}`;

let busy = false;

/** Ouvre la boîte d'impression du navigateur avec uniquement le document. */
export function printDoc(spec: DocSpec, title?: string) {
  if (busy) return;
  busy = true;
  document.getElementById('brix-print')?.remove();
  const host = document.createElement('div');
  host.id = 'brix-print';
  document.body.appendChild(host);
  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);
  const mount = document.createElement('div');
  host.appendChild(mount);
  const root = createRoot(mount);
  const prevTitle = document.title;
  let printed = false;
  const cleanup = () => {
    window.removeEventListener('afterprint', cleanup);
    if (title) document.title = prevTitle;
    setTimeout(() => {
      root.unmount();
      host.remove();
      busy = false;
    }, 50);
  };
  const go = () => {
    if (printed) return;
    printed = true;
    if (title) document.title = title;
    window.addEventListener('afterprint', cleanup);
    // Laisser le temps à la mise en pages (mesure + polices).
    setTimeout(() => {
      window.print();
      // Certains navigateurs n'envoient pas afterprint : filet de sécurité.
      setTimeout(() => busy && cleanup(), 1500);
    }, 120);
  };
  root.render(<DocPages spec={spec} gap={0} onCount={go} />);
  setTimeout(go, 900);
}
