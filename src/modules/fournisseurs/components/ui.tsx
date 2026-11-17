// Petits composants partagés par les écrans Achats.
import type { ReactNode } from 'react';
import { Badge, cn } from '@/components/ui';
import { money } from '@/lib/format';
import { useTween } from '@/modules/fournisseurs/components/portail/anim';
import { STATUT_COMMANDE, STATUT_DEMANDE, STATUT_DESTINATAIRE } from '../data/helpers';
import type { Fournisseur, StatutCommande, StatutDemande, StatutDestinataire } from '../data/types';

const COULEURS: Record<string, string> = {
  rexel: '#e2ecff', sonepar: '#e6f6ee', yesss: '#fff1d6', cedeo: '#e4f3fb', point_p: '#fde6e6', wurth: '#fde8e8', richardson: '#efe9ff', gedimat: '#eef7e4',
};

export function FournisseurPastille({ f, size = 36 }: { f?: Pick<Fournisseur, 'nom' | 'enseigne'>; size?: number }) {
  const initiales = (f?.nom ?? '?').replace(/[^A-Za-zÀ-ÿ ]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return (
    <span className="inline-grid shrink-0 place-items-center rounded-[10px] border border-line font-semibold text-ink" style={{ width: size, height: size, background: COULEURS[f?.enseigne ?? ''] ?? '#f1f1f5', fontSize: size * 0.34 }}>
      {initiales}
    </span>
  );
}

export const BadgeDemande = ({ s }: { s: StatutDemande }) => <Badge tone={STATUT_DEMANDE[s].tone} dot>{STATUT_DEMANDE[s].label}</Badge>;
export const BadgeCommande = ({ s }: { s: StatutCommande }) => <Badge tone={STATUT_COMMANDE[s].tone} dot>{STATUT_COMMANDE[s].label}</Badge>;
export const BadgeDestinataire = ({ s }: { s: StatutDestinataire }) => <Badge tone={STATUT_DESTINATAIRE[s].tone}>{STATUT_DESTINATAIRE[s].label}</Badge>;

export function Montant({ v, className, ht = true }: { v: number | null | undefined; className?: string; ht?: boolean }) {
  if (v == null) return <span className={cn('text-ink-3', className)}>–</span>;
  return (
    <span className={cn('num whitespace-nowrap', className)}>
      {money(v)}
      {ht && <span className="ml-0.5 text-[0.8em] text-ink-3"> HT</span>}
    </span>
  );
}

export function Section({ title, action, children, className }: { title: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Bandeau « mode démo » : rien ne part chez un vrai fournisseur. */
export function BandeauDemo({ children }: { children: ReactNode }) {
  return <div className="rounded-[12px] border border-dashed border-vi-200 bg-vi-50/60 px-3.5 py-2.5 text-[12.5px] text-vi-700">{children}</div>;
}

/** Nombre qui glisse jusqu'à sa valeur (montants, compteurs). */
export function Anime({ v, euros, arrondi, className }: { v: number; euros?: boolean; arrondi?: boolean; className?: string }) {
  const t = useTween(v, 700);
  return <span className={cn('num', className)}>{euros ? money(t, arrondi) : Math.round(t)}</span>;
}

/** Tuile d'icône colorée (Lucide, trait 1,75). */
const TONS = { ink: 'bg-[#130f26] text-white', violet: 'bg-vi-50 text-vi-700', ok: 'bg-ok-bg text-ok', warn: 'bg-warn-bg text-warn', bad: 'bg-bad-bg text-bad', neutre: 'bg-page text-ink-2' } as const;
export function Tuile({ icon, ton = 'neutre', size = 36, className }: { icon: ReactNode; ton?: keyof typeof TONS; size?: number; className?: string }) {
  return (
    <span className={cn('grid shrink-0 place-items-center rounded-[11px] [&_svg]:h-[17px] [&_svg]:w-[17px] [&_svg]:stroke-[1.75]', TONS[ton], className)} style={{ width: size, height: size }}>
      {icon}
    </span>
  );
}
