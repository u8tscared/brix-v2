// Colonne de gauche : filtres par public et liste des e-mails envoyés (nouveaux en tête, non lus en gras).

import { Inbox } from 'lucide-react';
import type { EmailEnvoye } from '@/emails/boite';
import { BrandTile } from '@/parcours/marque';
import { destinataire, expediteur, heureRelative, LIBELLE_PUBLIC, PUBLICS, renduMail, TON_PUBLIC, type Filtre } from './outils';

function Avatar({ m }: { m: EmailEnvoye }) {
  const exp = expediteur(m.de, m.donnees);
  if (exp.nom === 'Brix') return <BrandTile size={40} className="shrink-0 rounded-xl" />;
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#130f26] text-[13px] font-semibold tracking-wide text-white" aria-hidden>
      {exp.initiales}
    </span>
  );
}

function Ligne({ m, actif, nouveau, onOuvrir, maintenant }: { m: EmailEnvoye; actif: boolean; nouveau: boolean; onOuvrir: (id: string) => void; maintenant: number }) {
  const r = renduMail(m);
  const exp = expediteur(m.de, m.donnees);
  const ton = TON_PUBLIC[m.pour];
  return (
    <li className={nouveau ? 'boite-arrive' : undefined}>
      <button
        type="button"
        onClick={() => onOuvrir(m.id)}
        aria-current={actif ? 'true' : undefined}
        className={`boite-ligne group relative flex w-full gap-3 rounded-2xl px-3 py-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-vi-300 ${actif ? 'boite-ligne-active bg-white' : 'hover:bg-white/70'}`}
      >
        <span className="relative">
          <Avatar m={m} />
          {!m.lu && <span className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#f4f3fa] bg-[#7c3aed] ${nouveau ? 'boite-point' : ''}`} aria-label="Non lu" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className={`min-w-0 flex-1 truncate text-[14px] ${m.lu ? 'font-medium text-ink-2' : 'font-semibold text-[#130f26]'}`}>{exp.nom}</span>
            <span className="shrink-0 text-[12px] tabular-nums text-ink-3">{heureRelative(m.at, maintenant)}</span>
          </span>
          <span className={`mt-0.5 block truncate text-[13.5px] ${m.lu ? 'text-ink-2' : 'font-medium text-[#130f26]'}`}>{r?.sujet ?? 'E-mail illisible'}</span>
          <span className="mt-0.5 block truncate text-[13px] text-ink-3">{r?.preheader}</span>
          <span className="mt-2 flex items-center gap-1.5 text-[12px] text-ink-3">
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium" style={{ background: ton.fond, color: ton.texte }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: ton.point }} />
              {LIBELLE_PUBLIC[m.pour]}
            </span>
            <span className="truncate">à {destinataire(m)}</span>
          </span>
        </span>
      </button>
    </li>
  );
}

export function Filtres({ filtre, onFiltre, compte }: { filtre: Filtre; onFiltre: (f: Filtre) => void; compte: Record<Filtre, number> }) {
  return (
    <div role="tablist" aria-label="Filtrer par destinataire" className="boite-defile-x -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
      {PUBLICS.map((p) => {
        const actif = filtre === p.id;
        return (
          <button
            key={p.id}
            role="tab"
            aria-selected={actif}
            type="button"
            onClick={() => onFiltre(p.id)}
            className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-all duration-200 max-md:h-11 ${actif ? 'bg-[#130f26] text-white shadow-[0_6px_14px_-8px_rgba(19,15,38,.6)]' : 'bg-white text-ink-2 shadow-card hover:text-[#130f26]'}`}
          >
            {p.libelle}
            <span className={`tabular-nums text-[12px] ${actif ? 'text-white/60' : 'text-ink-3'}`}>{compte[p.id]}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ListeMails({ mails, actif, nouveaux, onOuvrir, maintenant, vide }: { mails: EmailEnvoye[]; actif: string | null; nouveaux: Set<string>; onOuvrir: (id: string) => void; maintenant: number; vide: React.ReactNode }) {
  if (!mails.length) return <>{vide}</>;
  return (
    <ul className="flex flex-col gap-0.5" aria-label="E-mails envoyés">
      {mails.map((m) => (
        <Ligne key={m.id} m={m} actif={m.id === actif} nouveau={nouveaux.has(m.id)} onOuvrir={onOuvrir} maintenant={maintenant} />
      ))}
    </ul>
  );
}

/** Aucun e-mail dans ce filtre (la boîte n'est pas vide). */
export function FiltreVide({ libelle }: { libelle: string }) {
  return (
    <div className="grid place-items-center px-6 py-16 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-ink-3 shadow-card">
        <Inbox size={20} strokeWidth={1.75} />
      </span>
      <p className="mt-3 text-[14px] font-medium text-[#130f26]">Rien pour « {libelle} »</p>
      <p className="mt-1 text-[13px] text-ink-3">Les e-mails de ce type apparaîtront ici.</p>
    </div>
  );
}
