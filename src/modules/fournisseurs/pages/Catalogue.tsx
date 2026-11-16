// « Prix » : tous les prix nets de vos fournisseurs au même endroit. Même EAN = même produit.
import { useMemo, useState } from 'react';
import { Search, SearchX, Tags, TrendingUp, Upload, X } from 'lucide-react';
import { Button, Card, CardHeader, EmptyState, PageHeader, Row, cn } from '@/components/ui';
import { money, relative } from '@/lib/format';
import { useAchats } from '../data/store';
import type { Article, Fournisseur } from '../data/types';
import { FournisseurPastille } from '../components/ui';
import { normaliser, pourcent, SOURCES } from '../components/achats/commun';
import ImportTarif from '../components/achats/ImportTarif';

interface Produit { cle: string; designation: string; marque?: string; ean?: string; unite: string; offres: Article[] }
const MAX = 40;

function Hausses({ catalogue, frn }: { catalogue: Article[]; frn: (id: string) => Fournisseur | undefined }) {
  const liste = useMemo(
    () =>
      catalogue
        .filter((a) => a.historique.length >= 2)
        .map((a) => {
          const avant = a.historique[a.historique.length - 2].prix;
          return { a, avant, pct: avant ? ((a.prixNet - avant) / avant) * 100 : 0 };
        })
        .filter((h) => h.pct >= 3)
        .sort((x, y) => y.pct - x.pct)
        .slice(0, 6),
    [catalogue],
  );
  if (!liste.length) return null;
  return (
    <Card>
      <CardHeader title="Hausses récentes" icon={<TrendingUp className="h-4 w-4 text-warn" />} meta={`${liste.length}`} />
      {liste.map(({ a, avant, pct }) => (
        <Row key={a.id}>
          <FournisseurPastille f={frn(a.fournisseurId)} size={30} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px]">{a.designation}</div>
            <div className="truncate text-[11.5px] text-ink-3">{frn(a.fournisseurId)?.nom} · {relative(a.majLe)}</div>
          </div>
          <div className="shrink-0 text-right">
            <div className="num text-[12.5px]"><span className="text-ink-3 line-through">{money(avant)}</span> {money(a.prixNet)}</div>
            <span className="num text-[11.5px] font-semibold text-warn">{pourcent(pct)}</span>
          </div>
        </Row>
      ))}
      <p className="border-t border-line px-4 py-2.5 text-[11.5px] text-ink-3">Pensez à mettre à jour vos devis en cours qui utilisent ces articles.</p>
    </Card>
  );
}

function CarteProduit({ p, frn }: { p: Produit; frn: (id: string) => Fournisseur | undefined }) {
  const meilleur = p.offres[0].prixNet;
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line px-4 py-3">
        <div className="text-[14px] font-medium leading-snug">{p.designation}</div>
        <div className="mt-0.5 flex flex-wrap gap-x-2 text-[11.5px] text-ink-3">
          {p.marque && <span>{p.marque}</span>}
          {p.ean && <span className="num">EAN {p.ean}</span>}
          <span>prix à l’unité ({p.unite})</span>
        </div>
      </div>
      {p.offres.map((a, i) => {
        const ecart = meilleur ? ((a.prixNet - meilleur) / meilleur) * 100 : 0;
        const best = i === 0 && p.offres.length > 1;
        return (
          <div key={a.id} className={cn('flex items-center gap-3 px-4 py-2.5', i > 0 && 'border-t border-line', best && 'bg-ok-bg/60')}>
            <FournisseurPastille f={frn(a.fournisseurId)} size={30} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium">{frn(a.fournisseurId)?.nom ?? 'Fournisseur'}</div>
              <div className="truncate text-[11.5px] text-ink-3">{SOURCES[a.source]} · {relative(a.majLe)} · {a.reference}</div>
            </div>
            <div className="shrink-0 text-right">
              <div className={cn('num text-[14px]', best ? 'font-semibold text-ok' : 'font-medium')}>{money(a.prixNet)}</div>
              {best ? <span className="text-[11px] font-medium text-ok">Le moins cher</span> : i > 0 && <span className="num text-[11px] text-ink-3">{pourcent(ecart)}</span>}
            </div>
          </div>
        );
      })}
    </Card>
  );
}

export default function Catalogue() {
  const { catalogue, fournisseurs } = useAchats();
  const [q, setQ] = useState('');
  const [importer, setImporter] = useState(false);
  const frn = (id: string) => fournisseurs.find((f) => f.id === id);

  const produits = useMemo(() => {
    const m = new Map<string, Produit>();
    for (const a of catalogue) {
      const cle = a.ean ? `ean:${a.ean}` : `ref:${a.fournisseurId}:${a.reference}`;
      const p = m.get(cle) ?? { cle, designation: a.designation, marque: a.marque, ean: a.ean, unite: a.unite, offres: [] };
      p.offres.push(a);
      m.set(cle, p);
    }
    const out = [...m.values()];
    out.forEach((p) => p.offres.sort((x, y) => x.prixNet - y.prixNet));
    return out.map((p) => ({ p, texte: normaliser([p.designation, p.marque, p.ean, ...p.offres.map((o) => o.reference)].join(' ')) }));
  }, [catalogue]);

  const resultats = useMemo(() => {
    const mots = normaliser(q).split(' ').filter(Boolean);
    const brut = mots.length ? produits.filter(({ texte }) => mots.every((m) => texte.includes(m))) : produits;
    // Les produits proposés par plusieurs fournisseurs d'abord : c'est là que la comparaison sert.
    return brut.map((x) => x.p).sort((a, b) => b.offres.length - a.offres.length || a.designation.localeCompare(b.designation));
  }, [produits, q]);

  const nbFournisseurs = new Set(catalogue.map((a) => a.fournisseurId)).size;
  const derniere = catalogue.reduce((d, a) => (a.majLe > d ? a.majLe : d), '');

  return (
    <div className="space-y-5">
      <PageHeader
        title="Prix"
        subtitle="Les prix nets de tous vos fournisseurs au même endroit. Le moins cher saute aux yeux."
        actions={<Button variant="dawn" icon={<Upload className="h-4 w-4" />} onClick={() => setImporter(true)}>Importer un tarif</Button>}
      />

      {catalogue.length === 0 ? (
        <EmptyState
          icon={<Tags />}
          title="Aucun prix pour l’instant"
          text="Importez le fichier de prix de votre commercial. Chaque réponse à une demande de prix vient aussi enrichir cette page."
          action={<Button variant="primary" icon={<Upload className="h-4 w-4" />} onClick={() => setImporter(true)}>Importer un tarif</Button>}
        />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
          <div className="min-w-0 space-y-4">
            <div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-3" />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Article, référence ou code EAN"
                  aria-label="Rechercher un prix"
                  className="h-14 w-full rounded-[14px] border border-line2 bg-white pl-12 pr-12 text-[16px] shadow-card transition placeholder:text-ink-3 focus:border-vi-300 focus:outline-none focus:ring-4 focus:ring-vi-100 [&::-webkit-search-cancel-button]:hidden"
                />
                {q && (
                  <button onClick={() => setQ('')} aria-label="Effacer" className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg text-ink-3 hover:bg-sub hover:text-ink">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="mt-2 px-1 text-[12px] text-ink-3">
                {q ? `${resultats.length} produit${resultats.length > 1 ? 's' : ''} trouvé${resultats.length > 1 ? 's' : ''}` : `${produits.length} produits chez ${nbFournisseurs} fournisseur${nbFournisseurs > 1 ? 's' : ''}`}
                {derniere && ` · dernière mise à jour ${relative(derniere)}`}
              </p>
            </div>

            {!q && <div className="xl:hidden"><Hausses catalogue={catalogue} frn={frn} /></div>}

            {resultats.length === 0 ? (
              <EmptyState icon={<SearchX />} title={`Rien pour « ${q} »`} text="Essayez un mot plus court, une référence ou les chiffres du code-barres. Vous pouvez aussi demander un prix à vos fournisseurs." />
            ) : (
              <>
                <div className="grid gap-3 lg:grid-cols-2">
                  {resultats.slice(0, MAX).map((p) => <CarteProduit key={p.cle} p={p} frn={frn} />)}
                </div>
                {resultats.length > MAX && <p className="text-center text-[12.5px] text-ink-3">{resultats.length - MAX} autres produits : précisez votre recherche.</p>}
              </>
            )}
          </div>

          <aside className="hidden space-y-4 xl:block">
            <Hausses catalogue={catalogue} frn={frn} />
            <Card className="p-4 text-[12.5px] leading-relaxed text-ink-2">
              <div className="mb-1 text-[13px] font-semibold text-ink">D’où viennent ces prix ?</div>
              Des tarifs que vous importez, des réponses de vos fournisseurs à vos demandes de prix, et des fournisseurs reliés à Brix. Un même code EAN chez deux fournisseurs = le même produit, comparé côte à côte.
            </Card>
          </aside>
        </div>
      )}

      <ImportTarif open={importer} onClose={() => setImporter(false)} />
    </div>
  );
}
