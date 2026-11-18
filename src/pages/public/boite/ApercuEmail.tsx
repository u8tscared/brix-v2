// Aperçu d'un e-mail dans une iframe isolée (srcdoc, sans script) qui s'ajuste à la hauteur du contenu.
// Sur « téléphone », l'e-mail est posé dans un cadre d'iPhone sobre et défile à l'intérieur de l'écran.

import { useEffect, useMemo, useRef, useState } from 'react';
import { srcDoc } from './outils';

export type Appareil = 'ordinateur' | 'telephone';

// allow-same-origin : le parent mesure la hauteur (aucun script ne tourne dans l'iframe).
// allow-top-navigation-by-user-activation : un clic sur « Consulter et signer » ouvre la page dans l'onglet.
const SANDBOX = 'allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation';

function CadreAuto({ html, titre, sombre, largeur }: { html: string; titre: string; sombre: boolean; largeur?: number }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [hauteur, setHauteur] = useState(640);
  const [pret, setPret] = useState(false);
  const doc = useMemo(() => srcDoc(html, { sombre, ajuste: true }), [html, sombre]);

  useEffect(() => {
    setPret(false);
    const el = ref.current;
    if (!el) return;
    let obs: ResizeObserver | null = null;
    const mesurer = () => {
      const d = el.contentDocument;
      if (!d?.documentElement) return;
      const h = Math.max(d.documentElement.scrollHeight, d.body?.scrollHeight ?? 0);
      if (h > 0) setHauteur(h);
    };
    const charge = () => {
      mesurer();
      setPret(true);
      const d = el.contentDocument;
      if (d?.body && 'ResizeObserver' in window) {
        obs = new ResizeObserver(mesurer);
        obs.observe(d.body);
      }
      // Les polices web arrivent après le chargement : on remesure.
      d?.fonts?.ready.then(mesurer).catch(() => {});
    };
    el.addEventListener('load', charge);
    return () => {
      el.removeEventListener('load', charge);
      obs?.disconnect();
    };
  }, [doc]);

  return (
    <iframe
      ref={ref}
      title={titre}
      srcDoc={doc}
      sandbox={SANDBOX}
      className="boite-cadre block w-full border-0"
      data-pret={pret ? 'oui' : 'non'}
      style={{ height: hauteur, width: largeur ?? '100%', colorScheme: sombre ? 'dark' : 'light' }}
    />
  );
}

function BarreStatut({ sombre }: { sombre: boolean }) {
  const c = sombre ? '#f4f3fa' : '#130f26';
  return (
    <div className="relative flex h-[50px] shrink-0 items-end justify-between px-7 pb-2 text-[15px] font-semibold" style={{ color: c, background: sombre ? '#0d0b18' : '#f4f3fa' }}>
      <span className="tabular-nums">9:41</span>
      <span className="absolute left-1/2 top-[11px] h-[30px] w-[104px] -translate-x-1/2 rounded-full bg-black" aria-hidden />
      <span className="flex items-center gap-1.5" aria-hidden>
        <svg width="18" height="11" viewBox="0 0 18 11" fill={c}><rect x="0" y="7" width="3" height="4" rx="1" /><rect x="5" y="5" width="3" height="6" rx="1" /><rect x="10" y="2.5" width="3" height="8.5" rx="1" /><rect x="15" y="0" width="3" height="11" rx="1" /></svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none"><rect x=".5" y=".5" width="21" height="11" rx="3.5" stroke={c} opacity=".4" /><rect x="2" y="2" width="16" height="8" rx="2" fill={c} /><rect x="23" y="4" width="1.6" height="4" rx=".8" fill={c} opacity=".5" /></svg>
      </span>
    </div>
  );
}

export function ApercuEmail({ html, titre, appareil, sombre }: { html: string; titre: string; appareil: Appareil; sombre: boolean }) {
  if (appareil === 'telephone') {
    return (
      <div className="boite-iphone mx-auto" aria-label="Aperçu sur téléphone">
        <div className="boite-iphone-ecran" style={{ background: sombre ? '#0d0b18' : '#f4f3fa' }}>
          <BarreStatut sombre={sombre} />
          <div className="boite-iphone-defile">
            <CadreAuto html={html} titre={titre} sombre={sombre} />
          </div>
          <div className="pointer-events-none absolute bottom-2 left-1/2 h-[5px] w-[134px] -translate-x-1/2 rounded-full" style={{ background: sombre ? '#f4f3fa' : '#130f26', opacity: 0.85 }} aria-hidden />
        </div>
      </div>
    );
  }
  return (
    <div className="boite-fenetre mx-auto w-full max-w-[720px] overflow-hidden md:rounded-2xl" style={{ background: sombre ? '#0d0b18' : '#f4f3fa' }}>
      <CadreAuto html={html} titre={titre} sombre={sombre} />
    </div>
  );
}

/** Miniature non interactive (galerie) : l'e-mail est rendu à 640 px puis réduit à la largeur de la carte. */
export function MiniatureEmail({ html, titre, hauteur = 300 }: { html: string; titre: string; hauteur?: number }) {
  const doc = useMemo(() => srcDoc(html, { sombre: false, ajuste: true }), [html]);
  const boite = useRef<HTMLDivElement>(null);
  const [echelle, setEchelle] = useState(0.55);
  useEffect(() => {
    const el = boite.current;
    if (!el || !('ResizeObserver' in window)) return;
    const obs = new ResizeObserver(([e]) => setEchelle(Math.min(1, e.contentRect.width / 640)));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={boite} className="relative overflow-hidden bg-page" style={{ height: hauteur }} aria-hidden>
      <iframe
        title={titre}
        srcDoc={doc}
        sandbox=""
        tabIndex={-1}
        loading="lazy"
        className="pointer-events-none absolute left-0 top-0 origin-top-left border-0"
        style={{ width: 640, height: hauteur / echelle + 60, transform: `scale(${echelle})` }}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
    </div>
  );
}
