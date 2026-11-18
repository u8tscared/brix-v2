// Onglet « Tous les modèles » : chaque e-mail de Brix rendu avec les données d'exemple, en miniatures.

import { useMemo } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { exemples, ORDRE_MODELES } from '@/emails/exemples';
import { NOM_MODELE, rendreEmail, type DonneesEmail, type ModeleEmail, type RenduEmail } from '@/emails';
import { baseApp } from '@/parcours/liens';
import type { EmailEnvoye } from '@/emails/boite';
import { MiniatureEmail } from './ApercuEmail';
import { ICONE_MODELE, LIBELLE_PUBLIC, TON_PUBLIC, type Filtre, type Public } from './outils';

export interface ModeleRendu {
  modele: ModeleEmail;
  pour: Public;
  de: string;
  a: string;
  donnees: EmailEnvoye['donnees'];
  rendu: RenduEmail;
}

/** Les 13 modèles rendus une fois, avec des liens qui pointent vers cette app. */
export function useModelesRendus(): ModeleRendu[] {
  return useMemo(() => {
    const ex = exemples(baseApp());
    return ORDRE_MODELES.map((m) => {
      const e = ex[m];
      return { modele: m, pour: e.pour, de: e.de, a: e.a, donnees: e.donnees, rendu: rendreEmail(m, e.donnees as DonneesEmail[typeof m]) };
    });
  }, []);
}

const GROUPES: { pour: Public; titre: string; texte: string }[] = [
  { pour: 'client', titre: 'Vos clients', texte: "Au nom de l'artisan, avec sa marque. Le client répond directement à l'artisan." },
  { pour: 'artisan', titre: "L'artisan", texte: 'Envoyés par Brix pour prévenir de ce qui compte : signature, paiement, réponse.' },
  { pour: 'fournisseur', titre: 'Les fournisseurs', texte: 'Demandes de prix et commandes, avec un lien pour répondre sans compte.' },
];

function Carte({ r, onOuvrir, index }: { r: ModeleRendu; onOuvrir: (m: ModeleEmail) => void; index: number }) {
  const Icone = ICONE_MODELE[r.modele];
  const ton = TON_PUBLIC[r.pour];
  return (
    <li className="bx-rise" style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}>
      <button
        type="button"
        onClick={() => onOuvrir(r.modele)}
        className="boite-carte group block w-full overflow-hidden rounded-[22px] bg-white text-left shadow-card outline-none focus-visible:ring-2 focus-visible:ring-vi-300"
      >
        <div className="boite-carte-mini">
          <MiniatureEmail html={r.rendu.html} titre={r.rendu.sujet} />
        </div>
        <div className="border-t border-line px-4 pb-4 pt-3.5">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: ton.fond, color: ton.texte }}>
              <Icone size={15} strokeWidth={1.75} />
            </span>
            <span className="flex-1 text-[14px] font-semibold text-[#130f26]">{NOM_MODELE[r.modele]}</span>
            <ArrowUpRight size={16} strokeWidth={1.75} className="text-ink-3 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#130f26]" />
          </div>
          <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-ink-2">{r.rendu.sujet}</p>
        </div>
      </button>
    </li>
  );
}

export function Galerie({ modeles, filtre, onOuvrir }: { modeles: ModeleRendu[]; filtre: Filtre; onOuvrir: (m: ModeleEmail) => void }) {
  const groupes = GROUPES.filter((g) => filtre === 'tous' || g.pour === filtre);
  let i = 0;
  return (
    <div className="flex flex-col gap-12">
      {groupes.map((g) => {
        const liste = modeles.filter((m) => m.pour === g.pour);
        return (
          <section key={g.pour} aria-labelledby={`g-${g.pour}`}>
            <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 id={`g-${g.pour}`} className="text-[18px] font-semibold tracking-[-0.02em] text-[#130f26]">
                {g.titre}
              </h2>
              <span className="text-[13px] tabular-nums text-ink-3">
                {liste.length} modèle{liste.length > 1 ? 's' : ''} · {LIBELLE_PUBLIC[g.pour]}
              </span>
              <p className="w-full text-[13.5px] text-ink-2">{g.texte}</p>
            </div>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {liste.map((r) => (
                <Carte key={r.modele} r={r} onOuvrir={onOuvrir} index={i++} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
