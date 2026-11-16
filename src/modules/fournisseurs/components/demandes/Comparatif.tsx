// Comparatif lignes × fournisseurs. Tableau sur tablette et ordinateur, cartes par fournisseur sur téléphone.
import { useState, type ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Badge, Card, cn } from '@/components/ui';
import { money } from '@/lib/format';
import type { Comparatif as Comp, TotalFournisseur } from '../../../../../worker/src/modules/fournisseurs/comparateur';
import type { Demande, Fournisseur } from '../../data/types';
import { FournisseurPastille } from '../ui';
import { pluriel } from './commun';

interface Props {
  d: Demande;
  comp: Comp;
  fournisseurs: Fournisseur[];
}

const e = (c: number) => money(c / 100);
const delaiTxt = (j: number | null) => (j == null ? '—' : j === 0 ? 'Aujourd’hui' : pluriel(j, 'jour'));

function useDonnees({ d, comp, fournisseurs }: Props) {
  const conseilles = new Set(comp.recommandation?.repartition.map((r) => r.destinataire_id));
  const four = (t: TotalFournisseur) => fournisseurs.find((f) => f.id === t.fournisseur_id);
  const prix = (destId: string, ligneId: string) => d.destinataires.find((x) => x.id === destId)?.prix.find((p) => p.ligneId === ligneId);
  const meilleur = (ligneId: string) => comp.lignes.find((m) => m.ligne_id === ligneId)?.meilleur_destinataire_id;
  const avecCible = d.lignes.some((l) => l.prixCible != null);
  return { conseilles, four, prix, meilleur, avecCible };
}

function Tableau(p: Props) {
  const { d, comp } = p;
  const { conseilles, four, prix, meilleur, avecCible } = useDonnees(p);
  const th = 'px-3 py-2.5 text-right font-medium';
  const pied = (label: string, cell: (t: TotalFournisseur) => ReactNode, fort = false) => (
    <tr className={cn('border-t border-line', fort && 'bg-[#fafafc]')}>
      <td className={cn('sticky left-0 px-4 py-2.5', fort ? 'font-semibold' : 'text-ink-2')} style={{ background: fort ? '#fafafc' : '#fff' }}>{label}</td>
      {avecCible && <td />}
      {comp.totaux.map((t) => (
        <td key={t.destinataire_id} className={cn('num px-3 py-2.5 text-right', fort ? 'text-[14.5px] font-semibold' : 'text-ink-2', conseilles.has(t.destinataire_id) && 'bg-vi-50/40')}>
          {cell(t)}
        </td>
      ))}
    </tr>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-line text-[12px] text-ink-2">
            <th className="sticky left-0 bg-white px-4 py-2.5 text-left font-medium">Article</th>
            {avecCible && <th className={cn(th, 'text-ink-3')}>Prévu au devis</th>}
            {comp.totaux.map((t) => (
              <th key={t.destinataire_id} className={cn(th, 'min-w-[132px] align-bottom', conseilles.has(t.destinataire_id) && 'bg-vi-50/40')}>
                <div className="flex flex-col items-end gap-1">
                  {conseilles.has(t.destinataire_id) && <Badge tone="violet">Conseillé</Badge>}
                  <span className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                    <FournisseurPastille f={four(t)} size={24} />
                    <span className="max-w-[120px] truncate">{t.fournisseur_nom}</span>
                  </span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {d.lignes.map((l) => (
            <tr key={l.id} className="border-b border-line last:border-b-0">
              <td className="sticky left-0 max-w-[300px] bg-white px-4 py-2.5">
                <div className="leading-snug">{l.designation}</div>
                <div className="num text-[12px] text-ink-3">
                  {String(l.quantite).replace('.', ',')} {l.unite}
                  {l.reference ? ` · ${l.reference}` : ''}
                </div>
              </td>
              {avecCible && <td className="num px-3 py-2.5 text-right text-ink-3">{l.prixCible != null ? money(l.prixCible) : '—'}</td>}
              {comp.totaux.map((t) => {
                const px = prix(t.destinataire_id, l.id);
                const best = meilleur(l.id) === t.destinataire_id && comp.reponses > 1;
                return (
                  <td key={t.destinataire_id} className={cn('px-3 py-2 text-right', conseilles.has(t.destinataire_id) && 'bg-vi-50/40')}>
                    {px?.prix == null ? (
                      <span className="text-[12px] text-ink-3">Indisponible</span>
                    ) : (
                      <span className={cn('inline-flex flex-col items-end rounded-[8px] px-2 py-1', best && 'bg-ok-bg')}>
                        <span className={cn('num font-medium', best && 'text-ok')}>{money(px.prix)}</span>
                        <span className="num text-[11.5px] text-ink-3">{money(px.prix * l.quantite)}</span>
                        {px.designationProposee && <span className="max-w-[140px] truncate text-[11px] text-ink-3" title={px.designationProposee}>équiv. {px.designationProposee}</span>}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          {pied('Port', (t) => (t.port_cents === 0 ? <span className="text-ok">Offert</span> : e(t.port_cents)))}
          {pied('Délai', (t) => delaiTxt(t.delai_livraison_jours))}
          {pied('Total HT', (t) => (
            <span className="flex flex-col items-end">
              {e(t.total_cents)}
              {!t.complet && <span className="text-[11.5px] font-normal text-warn">{pluriel(t.lignes_manquantes, 'article manquant', 'articles manquants')}</span>}
            </span>
          ), true)}
        </tfoot>
      </table>
    </div>
  );
}

function Cartes(p: Props) {
  const { d, comp } = p;
  const { conseilles, four, prix, meilleur } = useDonnees(p);
  const [ouvert, setOuvert] = useState<string | null>(comp.totaux[0]?.destinataire_id ?? null);
  return (
    <div className="divide-y divide-line">
      {comp.totaux.map((t) => {
        const open = ouvert === t.destinataire_id;
        return (
          <div key={t.destinataire_id} className={cn(conseilles.has(t.destinataire_id) && 'bg-vi-50/30')}>
            <button type="button" onClick={() => setOuvert(open ? null : t.destinataire_id)} aria-expanded={open} className="flex min-h-[64px] w-full items-center gap-3 px-4 py-3 text-left">
              <FournisseurPastille f={four(t)} size={34} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-[14px] font-medium">{t.fournisseur_nom}</span>
                  {conseilles.has(t.destinataire_id) && <Badge tone="violet">Conseillé</Badge>}
                </span>
                <span className="block text-[12px] text-ink-3">
                  {t.port_cents === 0 ? 'Port offert' : `Port ${e(t.port_cents)}`} · {delaiTxt(t.delai_livraison_jours).toLowerCase()}
                  {!t.complet && <span className="text-warn"> · {t.lignes_manquantes} manquant{t.lignes_manquantes > 1 ? 's' : ''}</span>}
                </span>
              </span>
              <span className="num text-[15px] font-semibold">{e(t.total_cents)}</span>
              <ChevronDown className={cn('h-4 w-4 shrink-0 text-ink-3 transition', open && 'rotate-180')} />
            </button>
            {open && (
              <ul className="px-4 pb-3">
                {d.lignes.map((l) => {
                  const px = prix(t.destinataire_id, l.id);
                  const best = meilleur(l.id) === t.destinataire_id && comp.reponses > 1;
                  return (
                    <li key={l.id} className="flex items-start gap-3 border-t border-line py-2.5 text-[13px]">
                      <span className="min-w-0 flex-1">
                        <span className="block leading-snug">{l.designation}</span>
                        <span className="num text-[12px] text-ink-3">
                          {String(l.quantite).replace('.', ',')} {l.unite}
                          {px?.prix != null && ` × ${money(px.prix)}`}
                        </span>
                      </span>
                      {px?.prix == null ? (
                        <span className="text-[12px] text-ink-3">Indisponible</span>
                      ) : (
                        <span className={cn('num flex items-center gap-1 font-medium', best && 'text-ok')}>
                          {best && <Check className="h-3.5 w-3.5" aria-label="Le moins cher" />}
                          {money(px.prix * l.quantite)}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Comparatif(p: Props) {
  const enAttente = p.comp.consultes - p.comp.reponses;
  return (
    <Card className="overflow-hidden">
      <div className="flex min-h-[52px] flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-4 py-2.5">
        <h3 className="text-[14px] font-semibold">Comparatif des prix</h3>
        <span className="hidden text-[12px] text-ink-3 md:inline">prix unitaires HT, total de ligne en dessous</span>
        <div className="flex-1" />
        {p.comp.reponses > 1 && (
          <span className="flex items-center gap-1.5 text-[12px] text-ink-2">
            <i className="h-2.5 w-2.5 rounded-[3px] bg-ok-bg ring-1 ring-[#c9f0d6]" /> le moins cher
          </span>
        )}
      </div>
      <div className="hidden md:block">
        <Tableau {...p} />
      </div>
      <div className="md:hidden">
        <Cartes {...p} />
      </div>
      {enAttente > 0 && <p className="border-t border-line px-4 py-2.5 text-[12px] text-ink-3">{pluriel(enAttente, 'fournisseur')} sans réponse pour l’instant : {enAttente > 1 ? 'leurs colonnes apparaîtront' : 'sa colonne apparaîtra'} dès réception.</p>}
    </Card>
  );
}
