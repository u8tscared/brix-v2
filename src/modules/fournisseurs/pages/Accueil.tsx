// Vue d'ensemble des achats : ce qu'il faut faire aujourd'hui, ce qui arrive, ce qu'on a économisé.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BellRing, CalendarClock, ChevronRight, PackageCheck, PackagePlus, PiggyBank, Scale, TrendingUp, Truck } from 'lucide-react';
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader, cn } from '@/components/ui';
import { dateShort, dayOffset, money, relative, todayISO } from '@/lib/format';
import { comparatif, eur } from '@/modules/fournisseurs/data/helpers';
import { totalCommande, useAchats } from '@/modules/fournisseurs/data/store';
import { Anime, BadgeCommande, FournisseurPastille, Montant, Tuile } from '@/modules/fournisseurs/components/ui';
import NouvelleDemande from '@/modules/fournisseurs/components/NouvelleDemande';
import NouvelleCommande from '@/modules/fournisseurs/components/achats/NouvelleCommande';

const BASE = '/app/fournisseurs';

export default function Accueil() {
  const nav = useNavigate();
  const { demandes, commandes, fournisseurs, catalogue } = useAchats();
  const [ouvrir, setOuvrir] = useState<null | 'demande' | 'commande'>(null);
  const nomF = (id: string) => fournisseurs.find((f) => f.id === id);

  const stats = useMemo(() => {
    let economie = 0;
    for (const d of demandes) {
      const comp = comparatif(d, fournisseurs);
      const complets = comp.totaux.filter((t) => t.complet);
      if (complets.length >= 2) economie += (complets[complets.length - 1].total_cents - (comp.recommandation?.total_cents ?? complets[0].total_cents)) / 100;
    }
    const enCours = commandes.filter((c) => ['envoyee', 'confirmee', 'expediee', 'livree_partiel'].includes(c.statut));
    const semaine = dayOffset(7);
    const livraisons = enCours.filter((c) => c.livraisonPrevue && c.livraisonPrevue <= semaine).sort((a, b) => (a.livraisonPrevue! < b.livraisonPrevue! ? -1 : 1));
    const depuis = new Date(Date.now() - 30 * 86400000).toISOString();
    const depenses = commandes.filter((c) => c.statut !== 'brouillon' && c.statut !== 'annulee' && c.createdAt >= depuis).reduce((s, c) => s + totalCommande(c) + c.port, 0);
    const hausses = catalogue
      .filter((a) => a.historique.length >= 2)
      .map((a) => {
        const avant = a.historique[a.historique.length - 2].prix;
        return { a, avant, pct: ((a.prixNet - avant) / avant) * 100 };
      })
      .filter((h) => h.pct >= 3)
      .sort((x, y) => y.pct - x.pct);
    return { economie, enCours, livraisons, depenses, hausses };
  }, [demandes, commandes, fournisseurs, catalogue]);

  const aFaire = useMemo(() => {
    const out: { icon: JSX.Element; ton: 'violet' | 'ok' | 'warn' | 'bad'; titre: string; texte: string; action: string; lien: string }[] = [];
    for (const d of demandes) {
      const n = d.destinataires.filter((x) => x.statut === 'repondue').length;
      if (d.statut === 'complete') out.push({ icon: <Scale />, ton: 'violet', titre: 'Toutes les offres sont là', texte: `${d.numero} · ${d.titre}`, action: 'Comparer', lien: `${BASE}/demandes/${d.id}` });
      else if (d.statut === 'reponses_partielles') out.push({ icon: <Scale />, ton: 'violet', titre: `${n} offre${n > 1 ? 's' : ''} sur ${d.destinataires.length} reçue${n > 1 ? 's' : ''}`, texte: `${d.numero} · vous pouvez déjà comparer`, action: 'Comparer', lien: `${BASE}/demandes/${d.id}` });
    }
    for (const c of stats.enCours) {
      if (c.proposition) out.push({ icon: <BellRing />, ton: 'warn', titre: `${nomF(c.fournisseurId)?.nom} propose une modification`, texte: `${c.numero} · « ${c.proposition.texte} »`, action: 'Voir', lien: `${BASE}/commandes/${c.id}` });
      if (c.livraisonPrevue && c.livraisonPrevue < todayISO()) out.push({ icon: <BellRing />, ton: 'bad', titre: 'Livraison en retard', texte: `${c.numero} chez ${nomF(c.fournisseurId)?.nom}`, action: 'Relancer', lien: `${BASE}/commandes/${c.id}` });
      else if (c.livraisonPrevue && c.livraisonPrevue <= dayOffset(1)) out.push({ icon: <PackageCheck />, ton: 'ok', titre: `Livraison ${relative(c.livraisonPrevue)}`, texte: `${c.numero} · pointez-la à réception`, action: 'Ouvrir', lien: `${BASE}/commandes/${c.id}` });
    }
    if (stats.hausses.length) out.push({ icon: <TrendingUp />, ton: 'warn', titre: `${stats.hausses.length} prix en hausse`, texte: 'Vérifiez vos devis en cours qui les utilisent', action: 'Voir', lien: `${BASE}/catalogue` });
    return out;
  }, [demandes, stats, fournisseurs]);

  const ouvertes = demandes.filter((d) => ['envoyee', 'reponses_partielles', 'complete'].includes(d.statut));

  return (
    <div className="bx-stagger space-y-6">
      <PageHeader
        title="Achats"
        subtitle="Demandez vos prix à plusieurs fournisseurs en un clic, commandez au meilleur prix, suivez vos livraisons."
        actions={
          <>
            <Button variant="secondary" className="max-sm:hidden" onClick={() => setOuvrir('commande')} icon={<PackagePlus className="h-4 w-4" strokeWidth={1.75} />}>Commander</Button>
            <Button variant="dawn" className="max-sm:h-11 max-sm:w-full max-sm:justify-center" onClick={() => setOuvrir('demande')} icon={<Scale className="h-4 w-4" strokeWidth={1.75} />}>Demander des prix</Button>
          </>
        }
      />

      <Card className="grid overflow-hidden md:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div className="relative border-b border-line p-5 md:border-b-0 md:border-r">
          <div className="flex items-center gap-2 text-[12.5px] font-medium text-ink-2"><Tuile icon={<PiggyBank />} ton="ok" size={28} />Économisé grâce aux comparatifs</div>
          <Anime v={stats.economie} euros arrondi className="mt-3 block text-[34px] font-semibold leading-none tracking-[-0.035em] text-ok" />
          <div className="mt-1.5 text-[12px] text-ink-3">par rapport à l’offre la plus chère, à chaque fois</div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-line md:contents">
          {[
            { l: 'Commandes en cours', v: stats.enCours.length, s: `${money(stats.enCours.reduce((s, c) => s + totalCommande(c), 0), true)} HT` },
            { l: 'Livraisons sous 7 jours', v: stats.livraisons.length, s: stats.livraisons[0]?.livraisonPrevue ? `prochaine ${relative(stats.livraisons[0].livraisonPrevue)}` : 'aucune prévue' },
            { l: 'Achats sur 30 jours', v: stats.depenses, s: 'HT, port compris', euros: true },
          ].map((k, i) => (
            <div key={k.l} className={cn('min-w-0 p-4 md:p-5', i < 2 && 'md:border-r md:border-line')}>
              <div className="text-[12px] font-medium leading-tight text-ink-2">{k.l}</div>
              <Anime v={k.v} euros={k.euros} arrondi className="mt-2 block text-[20px] font-semibold tracking-[-0.025em] md:text-[24px]" />
              <div className="mt-1 truncate text-[11.5px] text-ink-3">{k.s}</div>
            </div>
          ))}
        </div>
      </Card>

      {aFaire.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold">À faire <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#130f26] px-1.5 text-[11px] text-white">{aFaire.length}</span></h2>
          <div className="grid gap-2.5 md:grid-cols-2 [&>*]:min-w-0">
            {aFaire.map((a, i) => (
              <button key={i} type="button" onClick={() => nav(a.lien)} className="group flex min-h-[68px] min-w-0 items-center gap-3 rounded-[14px] border border-line bg-white px-4 py-3 text-left shadow-[0_1px_2px_rgba(20,20,40,.04)] transition hover:-translate-y-px hover:shadow-[0_10px_24px_-16px_rgba(45,20,90,.35)]">
                <Tuile icon={a.icon} ton={a.ton} size={38} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium first-letter:uppercase">{a.titre}</span>
                  <span className="block truncate text-[12.5px] text-ink-3">{a.texte}</span>
                </span>
                <span className="hidden items-center gap-1 text-[12.5px] font-medium text-ink-2 group-hover:text-ink sm:flex">{a.action}<ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" /></span>
                <ChevronRight className="h-4 w-4 text-ink-3 sm:hidden" />
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <CardHeader title="Livraisons à venir" icon={<Truck className="h-4 w-4 text-ink-3" strokeWidth={1.75} />} action={<Button size="sm" variant="ghost" className="max-md:h-10" onClick={() => nav(`${BASE}/commandes`)}>Tout voir</Button>} />
          {stats.livraisons.length === 0 ? (
            <div className="p-4"><EmptyState icon={<CalendarClock />} title="Rien à recevoir cette semaine" text="Les commandes confirmées par vos fournisseurs apparaîtront ici avec leur date de livraison." /></div>
          ) : (
            <ol className="px-4 py-2">
              {stats.livraisons.map((c) => {
                const j = new Date(c.livraisonPrevue! + 'T12:00:00');
                return (
                  <li key={c.id}>
                    <button type="button" onClick={() => nav(`${BASE}/commandes/${c.id}`)} className="flex w-full items-center gap-3 rounded-[12px] px-1 py-2.5 text-left transition hover:bg-[#fafafc]">
                      <span className="flex w-12 shrink-0 flex-col items-center rounded-[11px] border border-line bg-white py-1.5">
                        <span className="text-[10.5px] font-medium uppercase text-ink-3">{j.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}</span>
                        <span className="num text-[18px] font-semibold leading-none tracking-[-0.02em]">{j.getDate()}</span>
                      </span>
                      <FournisseurPastille f={nomF(c.fournisseurId)} size={32} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium">{nomF(c.fournisseurId)?.nom}</span>
                        <span className="block truncate text-xs text-ink-3">{c.suivi ?? (c.mode === 'retrait_agence' ? 'Retrait au comptoir' : c.adresse)}</span>
                      </span>
                      <BadgeCommande s={c.statut} />
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>

        <Card>
          <CardHeader title="Demandes de prix en cours" icon={<Scale className="h-4 w-4 text-ink-3" strokeWidth={1.75} />} action={<Button size="sm" variant="ghost" className="max-md:h-10" onClick={() => nav(`${BASE}/demandes`)}>Tout voir</Button>} />
          {ouvertes.length === 0 ? (
            <div className="p-4">
              <EmptyState icon={<Scale />} title="Aucune demande en cours" text="Depuis un devis signé, Brix prépare la liste du matériel et l’envoie à vos fournisseurs." action={<Button variant="primary" onClick={() => setOuvrir('demande')}>Demander des prix</Button>} />
            </div>
          ) : (
            <ul className="px-2 py-2">
              {ouvertes.map((d) => {
                const comp = comparatif(d, fournisseurs);
                return (
                  <li key={d.id}>
                    <button type="button" onClick={() => nav(`${BASE}/demandes/${d.id}`)} className="flex w-full items-center gap-3 rounded-[12px] px-2 py-2.5 text-left transition hover:bg-[#fafafc]">
                      <span className="flex -space-x-2">
                        {d.destinataires.slice(0, 3).map((x) => (
                          <span key={x.id} className={cn('rounded-[11px] ring-2 ring-white', x.statut !== 'repondue' && 'opacity-45')}><FournisseurPastille f={nomF(x.fournisseurId)} size={28} /></span>
                        ))}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium">{d.titre}</span>
                        <span className="block text-xs text-ink-3">{comp.reponses}/{comp.consultes} offres · {dateShort(d.createdAt)}</span>
                      </span>
                      <span className="text-right">
                        {comp.recommandation ? <Montant v={eur(comp.recommandation.total_cents)} className="block text-[13.5px] font-semibold" /> : <span className="text-[12px] text-ink-3">en attente</span>}
                        <span className="block text-[11px] text-ink-3">meilleure offre</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {stats.hausses.length > 0 && (
        <Card>
          <CardHeader title="Hausses de prix récentes" icon={<TrendingUp className="h-4 w-4 text-warn" strokeWidth={1.75} />} meta="pensez à mettre à jour vos devis en cours" />
          <div className="grid divide-y divide-line md:grid-cols-2 md:divide-y-0 [&>*]:min-w-0">
            {stats.hausses.slice(0, 4).map(({ a, avant, pct }) => (
              <div key={a.id} className="flex min-h-[60px] min-w-0 items-center gap-3 border-line px-4 py-2.5 md:border-b md:odd:border-r">
                <FournisseurPastille f={nomF(a.fournisseurId)} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px]">{a.designation}</div>
                  <div className="truncate text-xs text-ink-3">{nomF(a.fournisseurId)?.nom} · {a.reference}</div>
                </div>
                <div className="text-right">
                  <div className="num text-[12.5px]"><span className="text-ink-3 line-through">{money(avant)}</span> {money(a.prixNet)}</div>
                  <Badge tone="warn">+{pct.toFixed(1).replace('.', ',')} %</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <NouvelleDemande open={ouvrir === 'demande'} onClose={() => setOuvrir(null)} />
      <NouvelleCommande open={ouvrir === 'commande'} onClose={() => setOuvrir(null)} />
    </div>
  );
}
