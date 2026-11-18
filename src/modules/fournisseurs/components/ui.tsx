// Petits composants partagés par les écrans Achats.
import type { ReactNode } from 'react';
import { Badge, cn } from '@/components/ui';
import { money } from '@/lib/format';
import { useTween } from '@/modules/fournisseurs/components/portail/anim';
import { STATUT_COMMANDE, STATUT_DEMANDE, STATUT_DESTINATAIRE } from '../data/helpers';
import type { Fournisseur, StatutCommande, StatutDemande, StatutDestinataire } from '../data/types';

// Pastilles fournisseurs : tons pâles Halo (fond pâle + encre franche), stables par enseigne.
const COULEURS: Record<string, { bg: string; fg: string }> = {
  rexel: { bg: '#e8f0fe', fg: '#2f5fd0' }, sonepar: { bg: '#e5f6ef', fg: '#0f8a5f' }, yesss: { bg: '#fdf3dc', fg: '#a86206' }, cedeo: { bg: '#e3f5f8', fg: '#0e7490' },
  point_p: { bg: '#fde9ee', fg: '#c81e4a' }, wurth: { bg: '#fff0e4', fg: '#d4661b' }, richardson: { bg: '#f1eafe', fg: '#6d28d9' }, gedimat: { bg: '#eceefe', fg: '#4338ca' },
};

export function FournisseurPastille({ f, size = 36 }: { f?: Pick<Fournisseur, 'nom' | 'enseigne'>; size?: number }) {
  const initiales = (f?.nom ?? '?').replace(/[^A-Za-zÀ-ÿ ]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const c = COULEURS[f?.enseigne ?? ''] ?? { bg: '#f3f1f8', fg: '#5d5a72' };
  return (
    <span className="inline-grid shrink-0 place-items-center font-semibold tracking-[-0.02em]" style={{ width: size, height: size, borderRadius: Math.round(size * 0.33), background: c.bg, color: c.fg, fontSize: size * 0.34 }}>
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
        <h2 className="text-[17px] font-semibold tracking-[-0.025em]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Bandeau « mode démo » : rien ne part chez un vrai fournisseur. */
export function BandeauDemo({ children }: { children: ReactNode }) {
  return <div className="rounded-card-sm bg-pale-v/70 px-4 py-3 text-[12.5px] leading-snug text-deep-v">{children}</div>;
}

/** Nombre qui glisse jusqu'à sa valeur (montants, compteurs). */
export function Anime({ v, euros, arrondi, className }: { v: number; euros?: boolean; arrondi?: boolean; className?: string }) {
  const t = useTween(v, 700);
  return <span className={cn('num', className)}>{euros ? money(t, arrondi) : Math.round(t)}</span>;
}

/** Tuile d'icône colorée : pastille Halo (fond pâle + encre franche). */
const TONS = {
  ink: 'bg-ink text-white',
  violet: 'bg-pale-v text-deep-v',
  ok: 'bg-pale-g text-deep-g',
  warn: 'bg-pale-a text-deep-a',
  bad: 'bg-pale-r text-deep-r',
  neutre: 'bg-pale-n text-deep-n',
  bleu: 'bg-pale-b text-deep-b',
  peche: 'bg-pale-p text-deep-p',
  mag: 'bg-pale-m text-deep-m',
} as const;
export type TonTuile = keyof typeof TONS;
export function Tuile({ icon, ton = 'neutre', size = 36, className }: { icon: ReactNode; ton?: TonTuile; size?: number; className?: string }) {
  return (
    <span className={cn('grid shrink-0 place-items-center [&_svg]:h-[17px] [&_svg]:w-[17px] [&_svg]:stroke-[1.9]', TONS[ton], className)} style={{ width: size, height: size, borderRadius: Math.round(size * 0.33) }}>
      {icon}
    </span>
  );
}
