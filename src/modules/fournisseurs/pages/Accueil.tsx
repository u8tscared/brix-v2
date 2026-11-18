// Vue d'ensemble des achats : ce qu'il faut faire aujourd'hui, ce qui arrive, ce qu'on a économisé.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BellRing, CalendarClock, ChevronRight, PackageCheck, PackagePlus, PiggyBank, Scale, ShoppingBag, TrendingUp, Truck } from 'lucide-react';
import { Badge, Button, Card, CardHeader, EmptyState, IconTile, PageHeader, cn } from '@/components/ui';
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
        icon={<IconTile name="Truck" dept="achats" size="xl" />}
        kicker="Achats et fournisseurs"
        title="Achats"
        titleMuted="au meilleur prix, sans un coup de fil."
        subtitle="Demandez vos prix à plusieurs fournisseurs en un clic, commandez au meilleur prix, suivez vos livraisons."
        actions={
          <>
            <Button variant="secondary" className="max-sm:hidden" onClick={() => setOuvrir('commande')} icon={<PackagePlus className="h-4 w-4" strokeWidth={1.75} />}>Commander</Button>
            <Button variant="dawn" className="max-sm:h-11 max-sm:w-full max-sm:justify-center" onClick={() => setOuvrir('demande')} icon={<Scale className="h-4 w-4" strokeWidth={1.75} />}>Demander des prix</Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-[1.35fr_1fr_1fr_1fr] [&>*]:min-w-0">
        <Card tone="dawn" className="halo-bg halo-clip relative overflow-hidden p-6">
          <div className="flex items-center gap-2.5 label-halo"><Tuile icon={<PiggyBank />} ton="ok" size={32} />Économisé grâce aux comparatifs</div>
          <Anime v={stats.economie} euros arrondi className="num-halo mt-4 block text-[44px] leading-none text-ink md:text-[48px]" />
          <div className="mt-2 text-[12.5px] text-ink-2">par rapport à l’offre la plus chère, à chaque fois</div>
        </Card>
        <div className="grid grid-cols-3 gap-3 md:contents">
          {[
            { l: 'Commandes en cours', v: stats.enCours.length, s: `${money(stats.enCours.reduce((s, c) => s + totalCommande(c), 0), true)} HT`, icon: <PackageCheck />, ton: 'violet' as const },
            { l: 'Livraisons sous 7 jours', v: stats.livraisons.length, s: stats.livraisons[0]?.livraisonPrevue ? `prochaine ${relative(stats.livraisons[0].livraisonPrevue)}` : 'aucune prévue', icon: <Truck />, ton: 'peche' as const },
            { l: 'Achats sur 30 jours', v: stats.depenses, s: 'HT, port compris', euros: true, icon: <ShoppingBag />, ton: 'bleu' as const },
          ].map((k) => (
            <Card key={k.l} className="min-w-0 p-3.5 md:p-5">
              <Tuile icon={k.icon} ton={k.ton} size={34} className="max-md:hidden" />
              <div className="mt-0 text-[12px] font-medium leading-tight text-ink-2 md:mt-4 md:text-[13px]">{k.l}</div>
              <Anime v={k.v} euros={k.euros} arrondi className="num-halo mt-1.5 block text-[22px] md:text-[30px]" />
              <div className="mt-0.5 truncate text-[11.5px] text-ink-3 md:text-[12px]">{k.s}</div>
            </Card>
          ))}
        </div>
      </div>

      {aFaire.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.025em]">À faire <span className="num grid h-6 min-w-6 place-items-center rounded-full bg-ink px-1.5 text-[11.5px] font-semibold text-white">{aFaire.length}</span></h2>
          <div className="grid gap-2.5 md:grid-cols-2 [&>*]:min-w-0">
            {aFaire.map((a, i) => (
              <button key={i} type="button" onClick={() => nav(a.lien)} className="row-card group min-h-[72px] min-w-0 text-left">
                <Tuile icon={a.icon} ton={a.ton} size={38} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium first-letter:uppercase">{a.titre}</span>
                  <span className="block truncate text-[12.5px] text-ink-3">{a.texte}</span>
                </span>
                <span className="hidden h-8 items-center gap-1 rounded-pill bg-halo-track px-3 text-[12.5px] font-medium text-ink-2 transition-colors group-hover:bg-ink group-hover:text-white sm:flex">{a.action}<ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" /></span>
                <ChevronRight className="h-4 w-4 text-ink-3 sm:hidden" />
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <CardHeader title="Livraisons à venir" icon={<Tuile icon={<Truck />} ton="peche" size={30} />} action={<Button size="sm" variant="ghost" className="max-md:h-10" onClick={() => nav(`${BASE}/commandes`)}>Tout voir</Button>} />
          {stats.livraisons.length === 0 ? (
            <div className="p-4"><EmptyState icon={<CalendarClock />} title="Rien à recevoir cette semaine" text="Les commandes confirmées par vos fournisseurs apparaîtront ici avec leur date de livraison." /></div>
          ) : (
            <ol className="space-y-1 p-2.5">
              {stats.livraisons.map((c) => {
                const j = new Date(c.livraisonPrevue! + 'T12:00:00');
                return (
                  <li key={c.id}>
                    <button type="button" onClick={() => nav(`${BASE}/commandes/${c.id}`)} className="flex w-full items-center gap-3 rounded-card-sm px-2.5 py-2.5 text-left transition hover:bg-halo-hover">
                      <span className="flex w-12 shrink-0 flex-col items-center rounded-[13px] bg-pale-p py-1.5 text-deep-p">
                        <span className="text-[10.5px] font-medium uppercase opacity-80">{j.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}</span>
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
          <CardHeader title="Demandes de prix en cours" icon={<Tuile icon={<Scale />} ton="violet" size={30} />} action={<Button size="sm" variant="ghost" className="max-md:h-10" onClick={() => nav(`${BASE}/demandes`)}>Tout voir</Button>} />
          {ouvertes.length === 0 ? (
            <div className="p-4">
              <EmptyState icon={<Scale />} title="Aucune demande en cours" text="Depuis un devis signé, Brix prépare la liste du matériel et l’envoie à vos fournisseurs." action={<Button variant="secondary" onClick={() => setOuvrir('demande')}>Demander des prix</Button>} />
            </div>
          ) : (
            <ul className="space-y-1 p-2.5">
              {ouvertes.map((d) => {
                const comp = comparatif(d, fournisseurs);
                return (
                  <li key={d.id}>
                    <button type="button" onClick={() => nav(`${BASE}/demandes/${d.id}`)} className="flex w-full items-center gap-3 rounded-card-sm px-2.5 py-2.5 text-left transition hover:bg-halo-hover">
                      <span className="flex -space-x-2">
                        {d.destinataires.slice(0, 3).map((x) => (
                          <span key={x.id} className={cn('rounded-[10px] ring-2 ring-white', x.statut !== 'repondue' && 'opacity-45')}><FournisseurPastille f={nomF(x.fournisseurId)} size={28} /></span>
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
          <CardHeader title="Hausses de prix récentes" icon={<Tuile icon={<TrendingUp />} ton="warn" size={30} />} meta="pensez à mettre à jour vos devis en cours" />
          <div className="grid gap-2 p-2.5 md:grid-cols-2 [&>*]:min-w-0">
            {stats.hausses.slice(0, 4).map(({ a, avant, pct }) => (
              <div key={a.id} className="flex min-h-[60px] min-w-0 items-center gap-3 rounded-card-sm px-2.5 py-2.5 transition-colors hover:bg-halo-hover">
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
