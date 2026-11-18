// Étape 3 du portail : relire avant d'envoyer. Chaque ligne avec son prix net et sa disponibilité.
import { CalendarClock, CreditCard, FileText, MessageSquareText, Pencil, Timer } from 'lucide-react';
import { cn } from '@/components/ui';
import { money, num } from '@/lib/format';
import type { Demande } from '@/modules/fournisseurs/data/types';
import { taille } from '@/modules/fournisseurs/components/portail/anim';
import { Bloc } from '@/modules/fournisseurs/components/portail/commun';
import { prixLigne, type Conditions, type SaisieLigne } from '@/modules/fournisseurs/components/portail/saisie';

const I = { strokeWidth: 1.75, className: 'h-4 w-4' } as const;

function Etiquette({ v }: { v: SaisieLigne }) {
  const s = {
    stock: ['En stock', 'bg-[#ecfdf3] text-[#15803d]'],
    delai: [`Sous ${v.jours || 1} j`, 'bg-[#fff7e8] text-[#b45309]'],
    equivalent: ['Équivalent', 'bg-[#f5f0ff] text-[#6d28d9]'],
    indispo: ['Pas dispo', 'bg-halo-track text-ink-3'],
  }[v.dispo];
  return <span className={cn('inline-flex h-[22px] items-center rounded-full px-2 text-[11.5px] font-medium', s[1])}>{s[0]}</span>;
}

export default function EtapeVerifier({ d, lignes, c, remise, onModifier }: { d: Demande; lignes: Record<string, SaisieLigne>; c: Conditions; remise: number; onModifier: (etape: number) => void }) {
  const delai = c.delai === '' ? 'à préciser' : c.delai === '0' ? 'livré aujourd’hui' : `livré sous ${c.delai} jour${c.delai === '1' ? '' : 's'}`;
  return (
    <div className="space-y-4">
      <Bloc className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-halo-line px-4 py-3.5 sm:px-6">
          <h3 className="text-[15px] font-semibold tracking-[-0.01em]">Vos prix nets</h3>
          <button type="button" onClick={() => onModifier(1)} className="inline-flex h-10 items-center gap-1.5 rounded-pill px-3 text-[13px] font-medium text-ink-2 hover:bg-halo-track hover:text-ink">
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />Modifier
          </button>
        </div>
        <ul className="bx-stagger">
          {d.lignes.map((l) => {
            const v = lignes[l.id];
            const p = prixLigne(v);
            const net = p == null ? null : Math.round(p * (1 - remise / 100) * 100) / 100;
            return (
              <li key={l.id} className="flex items-start gap-3 border-b border-halo-line px-4 py-3 last:border-b-0 sm:px-6">
                <span className="num mt-0.5 w-10 shrink-0 text-[13px] font-semibold">{num(l.quantite)}<span className="ml-0.5 text-[11px] font-normal text-ink-3">{l.unite}</span></span>
                <span className="min-w-0 flex-1">
                  <span className={cn('block text-[14px] leading-snug', net == null && 'text-ink-3')}>{v?.dispo === 'equivalent' && v.designation ? v.designation : l.designation}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5">
                    {v && <Etiquette v={v} />}
                    {v?.dispo === 'equivalent' && v.designation && <span className="truncate text-[11.5px] text-ink-3">à la place de {l.designation}</span>}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  {net == null ? <span className="text-[13px] text-ink-3">–</span> : <>
                    <span className="num block text-[14px] font-semibold">{money(net * l.quantite)}</span>
                    <span className="num block text-[11.5px] text-ink-3">{money(net)} / {l.unite}</span>
                  </>}
                </span>
              </li>
            );
          })}
        </ul>
      </Bloc>

      <Bloc className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-halo-line px-4 py-3.5 sm:px-6">
          <h3 className="text-[15px] font-semibold tracking-[-0.01em]">Vos conditions</h3>
          <button type="button" onClick={() => onModifier(2)} className="inline-flex h-10 items-center gap-1.5 rounded-pill px-3 text-[13px] font-medium text-ink-2 hover:bg-halo-track hover:text-ink">
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />Modifier
          </button>
        </div>
        <dl className="grid gap-x-6 gap-y-3.5 px-4 py-4 text-[14px] sm:grid-cols-2 sm:px-6">
          <div className="flex items-center gap-2.5"><CalendarClock {...I} className="h-4 w-4 text-ink-3" /><span className="first-letter:uppercase">{delai}</span></div>
          <div className="flex items-center gap-2.5"><CreditCard {...I} className="h-4 w-4 text-ink-3" />{c.paiement || 'Paiement à convenir'}</div>
          <div className="flex items-center gap-2.5"><Timer {...I} className="h-4 w-4 text-ink-3" />Offre valable {c.validite} jours</div>
          {c.pieceJointe && <div className="flex min-w-0 items-center gap-2.5"><FileText {...I} className="h-4 w-4 shrink-0 text-[#dc2626]" /><span className="truncate">{c.pieceJointe.nom}</span><span className="shrink-0 text-[12px] text-ink-3">{taille(c.pieceJointe.taille)}</span></div>}
          {c.commentaire.trim() && <div className="flex items-start gap-2.5 sm:col-span-2"><MessageSquareText {...I} className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" /><span className="text-ink-2">« {c.commentaire.trim()} »</span></div>}
        </dl>
      </Bloc>
    </div>
  );
}
