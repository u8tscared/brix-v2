// Comparatif lignes × fournisseurs. En-têtes avec total, barre et distinctions (meilleur prix, plus rapide) ;
// tableau sur tablette et ordinateur (agrandissable en plein écran), cartes par fournisseur sur téléphone.
import { useState, type ReactNode } from 'react';
import { ChevronDown, Clock3, FileText, Maximize2, Repeat2, Trophy, Zap } from 'lucide-react';
import { Button, Card, cn, Sheet } from '@/components/ui';
import { money } from '@/lib/format';
import type { Comparatif as Comp, TotalFournisseur } from '../../../../../worker/src/modules/fournisseurs/comparateur';
import type { Demande, Destinataire, Fournisseur, PrixReponse } from '@/modules/fournisseurs/data/types';
import { FournisseurPastille } from '@/modules/fournisseurs/components/ui';
import { pluriel } from '@/modules/fournisseurs/components/demandes/commun';

interface Props {
  d: Demande;
  comp: Comp;
  fournisseurs: Fournisseur[];
}

const e = (c: number) => money(c / 100);
const delaiTxt = (j: number | null) => (j == null ? '–' : j === 0 ? 'Aujourd’hui' : pluriel(j, 'jour'));

function useDonnees({ d, comp, fournisseurs }: Props) {
  const conseilles = new Set(comp.recommandation?.repartition.map((r) => r.destinataire_id));
  const four = (t: TotalFournisseur) => fournisseurs.find((f) => f.id === t.fournisseur_id);
  const dest = (id: string) => d.destinataires.find((x) => x.id === id);
  const prix = (destId: string, ligneId: string) => dest(destId)?.prix.find((p) => p.ligneId === ligneId);
  const meilleur = (ligneId: string) => (comp.reponses > 1 ? comp.lignes.find((m) => m.ligne_id === ligneId)?.meilleur_destinataire_id : null);
  const complets = comp.totaux.filter((t) => t.complet);
  const moinsCher = complets.length > 1 ? complets[0].destinataire_id : null;
  const delais = comp.totaux.filter((t) => t.delai_livraison_jours != null);
  const min = Math.min(...delais.map((t) => t.delai_livraison_jours!));
  const rapides = delais.filter((t) => t.delai_livraison_jours === min);
  const plusRapide = comp.reponses > 1 && rapides.length === 1 ? rapides[0].destinataire_id : null;
  const max = Math.max(1, ...comp.totaux.map((t) => t.total_cents));
  const avecCible = d.lignes.some((l) => l.prixCible != null);
  return { conseilles, four, dest, prix, meilleur, moinsCher, plusRapide, max, avecCible };
}

function Distinction({ type }: { type: 'prix' | 'rapide' }) {
  return type === 'prix' ? (
    <span className="fx-halo inline-flex h-[22px] items-center gap-1 rounded-full bg-ok px-2 text-[11px] font-semibold text-white [&_svg]:h-3 [&_svg]:w-3">
      <Trophy strokeWidth={2} />Meilleur prix
    </span>
  ) : (
    <span className="fx-pop inline-flex h-[22px] items-center gap-1 rounded-full bg-ink px-2 text-[11px] font-semibold text-white [&_svg]:h-3 [&_svg]:w-3" style={{ animationDelay: '.5s' }}>
      <Zap strokeWidth={2} />Plus rapide
    </span>
  );
}

/** Petite mention sous un prix : disponibilité ou équivalent. */
function Dispo({ p }: { p?: PrixReponse }) {
  if (!p || p.prix == null) return null;
  if (p.designationProposee) return <span className="mt-0.5 flex max-w-[150px] items-center justify-end gap-1 truncate text-[11px] text-vi-700" title={`${p.designationProposee}${p.referenceProposee ? ` (${p.referenceProposee})` : ''}`}><Repeat2 className="h-3 w-3 shrink-0" strokeWidth={1.75} /><span className="truncate">{p.designationProposee}</span></span>;
  if (p.dispo === 'delai') return <span className="mt-0.5 flex items-center justify-end gap-1 text-[11px] text-warn"><Clock3 className="h-3 w-3" strokeWidth={1.75} />sous {p.dispoJours ?? 1} j</span>;
  return null;
}

function Tableau(p: Props) {
  const { d, comp } = p;
  const x = useDonnees(p);
  const col = (id: string) => x.conseilles.has(id) && 'bg-vi-50/50';
  const pied = (label: string, cell: (t: TotalFournisseur, dd?: Destinataire) => ReactNode, fort = false) => (
    <tr className={cn('border-t border-line', fort && 'bg-[#fafafc]')}>
      <td className={cn('sticky left-0 z-[1] px-4 py-2.5', fort ? 'bg-[#fafafc] font-semibold' : 'bg-white text-ink-2')}>{label}</td>
      {x.avecCible && <td className={fort ? 'bg-[#fafafc]' : ''} />}
      {comp.totaux.map((t) => (
        <td key={t.destinataire_id} className={cn('num px-4 py-2.5 text-right', fort ? 'text-[15px] font-semibold' : 'text-[12.5px] text-ink-2', col(t.destinataire_id))}>
          {cell(t, x.dest(t.destinataire_id))}
        </td>
      ))}
    </tr>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]" style={{ minWidth: 300 + comp.totaux.length * 170 }}>
        <thead>
          <tr className="border-b border-line">
            <th className="sticky left-0 z-[1] min-w-[220px] bg-white px-4 py-3 text-left align-bottom text-[12px] font-medium text-ink-3">Article</th>
            {x.avecCible && <th className="whitespace-nowrap px-3 py-3 text-right align-bottom text-[12px] font-medium text-ink-3">Prévu au devis</th>}
            {comp.totaux.map((t) => (
              <th key={t.destinataire_id} className={cn('min-w-[170px] px-4 pb-3 pt-4 text-right align-bottom font-normal', col(t.destinataire_id))}>
                <div className="flex min-h-[22px] justify-end gap-1">
                  {x.moinsCher === t.destinataire_id && <Distinction type="prix" />}
                  {x.plusRapide === t.destinataire_id && <Distinction type="rapide" />}
                </div>
                <div className="mt-2 flex items-center justify-end gap-2">
                  <FournisseurPastille f={x.four(t)} size={26} />
                  <span className="max-w-[124px] truncate text-[13px] font-semibold text-ink">{t.fournisseur_nom}</span>
                </div>
                <div className="num mt-1.5 text-[18px] font-semibold tracking-[-0.02em] text-ink">{e(t.total_cents)}</div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-line">
                  <div className={cn('fx-grow h-full rounded-full', x.moinsCher === t.destinataire_id ? 'bg-ok' : 'bg-ink-3/60')} style={{ width: `${(t.total_cents / x.max) * 100}%` }} />
                </div>
                {x.conseilles.has(t.destinataire_id) && <div className="mt-1.5 text-[11px] font-medium text-vi-700">Conseillé par Brix</div>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {d.lignes.map((l) => (
            <tr key={l.id} className="group border-b border-line transition-colors last:border-b-0 hover:bg-[#fcfcfe]">
              <td className="sticky left-0 z-[1] max-w-[320px] bg-white px-4 py-2.5 group-hover:bg-[#fcfcfe]">
                <div className="leading-snug">{l.designation}</div>
                <div className="num text-[12px] text-ink-3">{String(l.quantite).replace('.', ',')} {l.unite}{l.reference ? ` · ${l.reference}` : ''}</div>
              </td>
              {x.avecCible && <td className="num px-3 py-2.5 text-right text-ink-3">{l.prixCible != null ? money(l.prixCible) : '–'}</td>}
              {comp.totaux.map((t) => {
                const px = x.prix(t.destinataire_id, l.id);
                const best = x.meilleur(l.id) === t.destinataire_id;
                return (
                  <td key={t.destinataire_id} className={cn('px-3 py-2 text-right', col(t.destinataire_id))}>
                    {px?.prix == null ? (
                      <span className="text-[12px] text-ink-3">Pas dispo</span>
                    ) : (
                      <span className={cn('inline-flex flex-col items-end rounded-[9px] px-2 py-1', best && 'fx-lit')}>
                        <span className={cn('num font-medium', best && 'text-ok')}>{money(px.prix)}</span>
                        <span className="num text-[11.5px] text-ink-3">{money(px.prix * l.quantite)}</span>
                        <Dispo p={px} />
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          {comp.totaux.some((t) => x.dest(t.destinataire_id)?.remise) && pied('Remise annoncée', (_, dd) => (dd?.remise ? `${String(dd.remise).replace('.', ',')} % incluse` : '–'))}
          {pied('Port', (t) => (t.port_cents === 0 ? <span className="text-ok">Offert</span> : e(t.port_cents)))}
          {pied('Délai', (t) => <span className={cn(x.plusRapide === t.destinataire_id && 'font-semibold text-ink')}>{delaiTxt(t.delai_livraison_jours)}</span>)}
          {pied('Paiement', (_, dd) => dd?.conditions ?? '–')}
          {comp.totaux.some((t) => x.dest(t.destinataire_id)?.pieceJointe) && pied('Pièce jointe', (_, dd) => (dd?.pieceJointe ? <span className="inline-flex max-w-[150px] items-center gap-1 truncate"><FileText className="h-3.5 w-3.5 shrink-0 text-bad" strokeWidth={1.75} /><span className="truncate">{dd.pieceJointe.nom}</span></span> : '–'))}
          {pied('Total HT', (t) => (
            <span className="flex flex-col items-end">
              <span className={cn(x.moinsCher === t.destinataire_id && 'text-ok')}>{e(t.total_cents)}</span>
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
  const x = useDonnees(p);
  const [ouvert, setOuvert] = useState<string | null>(null);
  return (
    <div className="divide-y divide-line">
      {comp.totaux.map((t) => {
        const open = ouvert === t.destinataire_id;
        const dd = x.dest(t.destinataire_id);
        return (
          <div key={t.destinataire_id} className={cn(x.conseilles.has(t.destinataire_id) && 'bg-vi-50/30')}>
            <button type="button" onClick={() => setOuvert(open ? null : t.destinataire_id)} aria-expanded={open} className="w-full px-4 py-3.5 text-left">
              <span className="flex items-center gap-3">
                <FournisseurPastille f={x.four(t)} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium">{t.fournisseur_nom}</span>
                  <span className="block text-[12px] text-ink-3">
                    {t.port_cents === 0 ? 'Port offert' : `Port ${e(t.port_cents)}`} · {delaiTxt(t.delai_livraison_jours).toLowerCase()}
                    {!t.complet && <span className="text-warn"> · {t.lignes_manquantes} manquant{t.lignes_manquantes > 1 ? 's' : ''}</span>}
                  </span>
                </span>
                <span className={cn('num text-[16px] font-semibold tracking-[-0.02em]', x.moinsCher === t.destinataire_id && 'text-ok')}>{e(t.total_cents)}</span>
                <ChevronDown className={cn('h-4 w-4 shrink-0 text-ink-3 transition', open && 'rotate-180')} />
              </span>
              <span className="mt-2.5 flex items-center gap-2 pl-[48px]">
                <span className="h-1 flex-1 overflow-hidden rounded-full bg-line">
                  <span className={cn('fx-grow block h-full rounded-full', x.moinsCher === t.destinataire_id ? 'bg-ok' : 'bg-ink-3/60')} style={{ width: `${(t.total_cents / x.max) * 100}%` }} />
                </span>
                {x.moinsCher === t.destinataire_id && <Distinction type="prix" />}
                {x.plusRapide === t.destinataire_id && <Distinction type="rapide" />}
              </span>
            </button>
            {open && (
              <div className="bx-rise px-4 pb-3">
                {(dd?.conditions || dd?.pieceJointe || dd?.commentaire) && (
                  <div className="mb-2 rounded-[10px] bg-sub px-3 py-2 text-[12px] text-ink-2">
                    {[dd.conditions, dd.remise ? `remise ${dd.remise} % incluse` : null, dd.pieceJointe?.nom].filter(Boolean).join(' · ')}
                    {dd.commentaire && <div className="mt-0.5 text-ink">« {dd.commentaire} »</div>}
                  </div>
                )}
                <ul>
                  {d.lignes.map((l) => {
                    const px = x.prix(t.destinataire_id, l.id);
                    const best = x.meilleur(l.id) === t.destinataire_id;
                    return (
                      <li key={l.id} className="flex items-start gap-3 border-t border-line py-2.5 text-[13px]">
                        <span className="min-w-0 flex-1">
                          <span className="block leading-snug">{l.designation}</span>
                          <span className="num text-[12px] text-ink-3">{String(l.quantite).replace('.', ',')} {l.unite}{px?.prix != null && ` × ${money(px.prix)}`}</span>
                        </span>
                        {px?.prix == null ? (
                          <span className="text-[12px] text-ink-3">Pas dispo</span>
                        ) : (
                          <span className="flex flex-col items-end">
                            <span className={cn('num rounded-md px-1.5 font-medium', best && 'fx-lit text-ok')}>{money(px.prix * l.quantite)}</span>
                            <Dispo p={px} />
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Comparatif(p: Props) {
  const [grand, setGrand] = useState(false);
  const enAttente = p.comp.consultes - p.comp.reponses;
  const legende = (
    <span className="hidden items-center gap-1.5 text-[12px] text-ink-2 md:flex">
      <i className="h-2.5 w-2.5 rounded-[3px] bg-ok-bg ring-1 ring-[#c9f0d6]" /> le moins cher, ligne par ligne
    </span>
  );
  return (
    <Card className="overflow-hidden">
      <div className="flex min-h-[56px] flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-4 py-2.5">
        <h3 className="text-[15px] font-semibold">Comparatif</h3>
        <span className="text-[12px] text-ink-3">{pluriel(p.comp.reponses, 'offre')} · prix unitaires HT</span>
        <div className="flex-1" />
        {p.comp.reponses > 1 && legende}
        <Button size="sm" variant="ghost" className="hidden md:inline-flex" icon={<Maximize2 className="h-3.5 w-3.5" strokeWidth={1.75} />} onClick={() => setGrand(true)}>
          Agrandir
        </Button>
      </div>
      <div className="hidden md:block"><Tableau {...p} /></div>
      <div className="md:hidden"><Cartes {...p} /></div>
      {enAttente > 0 && <p className="border-t border-line px-4 py-2.5 text-[12px] text-ink-3">{pluriel(enAttente, 'fournisseur')} sans réponse pour l’instant : {enAttente > 1 ? 'leurs offres apparaîtront' : 'son offre apparaîtra'} ici dès réception.</p>}

      <Sheet open={grand} onClose={() => setGrand(false)} side="center" width={Math.min(1400, 420 + p.comp.totaux.length * 220)} title="Comparatif des offres" subtitle={`${p.d.numero} · ${p.d.titre}`}>
        <div className="-mx-5 border-t border-line"><Tableau {...p} /></div>
      </Sheet>
    </Card>
  );
}
