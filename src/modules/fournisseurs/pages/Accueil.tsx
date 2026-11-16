// Vue d'ensemble des achats : ce qu'il faut faire aujourd'hui, ce qui arrive, ce qu'on a économisé.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Bell, CalendarClock, PackageCheck, Scale, TrendingUp, Truck } from 'lucide-react';
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader, Row, Stat } from '@/components/ui';
import { dayOffset, money, relative, todayISO } from '@/lib/format';
import { comparatif, eur } from '../data/helpers';
import { totalCommande, useAchats } from '../data/store';
import { BadgeCommande, BadgeDemande, FournisseurPastille, Montant } from '../components/ui';
import NouvelleDemande from '../components/NouvelleDemande';

export default function Accueil() {
  const nav = useNavigate();
  const { demandes, commandes, fournisseurs, catalogue } = useAchats();
  const [ouvrir, setOuvrir] = useState(false);
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
    const out: { icon: JSX.Element; texte: string; action: string; lien: string }[] = [];
    for (const d of demandes) {
      if (d.statut === 'complete' || (d.statut === 'reponses_partielles' && d.dateLimite && d.dateLimite <= todayISO()))
        out.push({ icon: <Scale />, texte: `${d.numero} : les réponses sont là, choisissez le fournisseur.`, action: 'Comparer', lien: `demandes/${d.id}` });
      else if (d.statut === 'reponses_partielles') {
        const n = d.destinataires.filter((x) => x.statut === 'repondue').length;
        out.push({ icon: <Scale />, texte: `${d.numero} : ${n} réponse${n > 1 ? 's' : ''} sur ${d.destinataires.length}. Vous pouvez déjà comparer.`, action: 'Voir', lien: `demandes/${d.id}` });
      }
    }
    for (const c of stats.enCours) {
      if (c.livraisonPrevue && c.livraisonPrevue < todayISO()) out.push({ icon: <Bell />, texte: `${c.numero} chez ${nomF(c.fournisseurId)?.nom} : livraison en retard.`, action: 'Relancer', lien: `commandes/${c.id}` });
      else if (c.livraisonPrevue && c.livraisonPrevue <= dayOffset(1)) out.push({ icon: <PackageCheck />, texte: `${c.numero} arrive ${relative(c.livraisonPrevue)} : pointez la livraison à réception.`, action: 'Ouvrir', lien: `commandes/${c.id}` });
    }
    if (stats.hausses.length) out.push({ icon: <TrendingUp />, texte: `${stats.hausses.length} prix ont augmenté chez vos fournisseurs. Vérifiez vos devis en cours.`, action: 'Voir', lien: 'catalogue' });
    return out;
  }, [demandes, stats, fournisseurs]);

  const ouvertes = demandes.filter((d) => ['envoyee', 'reponses_partielles', 'complete'].includes(d.statut));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Achats"
        subtitle="Demandez vos prix à plusieurs fournisseurs en un clic, commandez au meilleur prix, suivez vos livraisons."
        actions={<Button variant="dawn" onClick={() => setOuvrir(true)} icon={<Scale className="h-4 w-4" />}>Nouvelle demande de prix</Button>}
      />

      <Card className="grid grid-cols-2 divide-line md:grid-cols-4 md:divide-x [&>*:nth-child(-n+2)]:border-b [&>*:nth-child(-n+2)]:border-line md:[&>*:nth-child(-n+2)]:border-b-0">
        <Stat hero label="Économisé grâce aux comparatifs" value={money(stats.economie, true)} sub="par rapport à l'offre la plus chère" />
        <Stat label="Commandes en cours" value={stats.enCours.length} sub={money(stats.enCours.reduce((s, c) => s + totalCommande(c), 0), true) + ' HT'} />
        <Stat label="Livraisons cette semaine" value={stats.livraisons.length} sub={stats.livraisons[0]?.livraisonPrevue ? `prochaine ${relative(stats.livraisons[0].livraisonPrevue)}` : 'aucune prévue'} />
        <Stat label="Achats sur 30 jours" value={money(stats.depenses, true)} sub="HT, port compris" />
      </Card>

      {aFaire.length > 0 && (
        <Card>
          <CardHeader title="À faire" meta={`${aFaire.length}`} />
          {aFaire.map((a, i) => (
            <Row key={i} onClick={() => nav(a.lien)}>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-sub text-ink-2 [&_svg]:h-4 [&_svg]:w-4">{a.icon}</span>
              <span className="min-w-0 flex-1 text-[13.5px]">{a.texte}</span>
              <Button size="sm" variant="secondary" className="hidden sm:inline-flex">{a.action}</Button>
              <ArrowRight className="h-4 w-4 text-ink-3 sm:hidden" />
            </Row>
          ))}
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Livraisons à venir" icon={<Truck className="h-4 w-4 text-ink-3" />} action={<Button size="sm" variant="ghost" onClick={() => nav('commandes')}>Tout voir</Button>} />
          {stats.livraisons.length === 0 ? (
            <div className="p-4"><EmptyState icon={<CalendarClock />} title="Rien à recevoir cette semaine" text="Les commandes confirmées par vos fournisseurs apparaîtront ici avec leur date de livraison." /></div>
          ) : (
            stats.livraisons.map((c) => (
              <Row key={c.id} onClick={() => nav(`commandes/${c.id}`)}>
                <FournisseurPastille f={nomF(c.fournisseurId)} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-medium">{nomF(c.fournisseurId)?.nom}</div>
                  <div className="truncate text-xs text-ink-3">{c.numero} · {c.mode === 'retrait_agence' ? 'Retrait en agence' : c.adresse}</div>
                </div>
                <div className="text-right">
                  <div className="text-[13px] font-medium first-letter:uppercase">{relative(c.livraisonPrevue!)}</div>
                  <BadgeCommande s={c.statut} />
                </div>
              </Row>
            ))
          )}
        </Card>

        <Card>
          <CardHeader title="Demandes de prix en cours" icon={<Scale className="h-4 w-4 text-ink-3" />} action={<Button size="sm" variant="ghost" onClick={() => nav('demandes')}>Tout voir</Button>} />
          {ouvertes.length === 0 ? (
            <div className="p-4">
              <EmptyState icon={<Scale />} title="Aucune demande en cours" text="Depuis un devis signé, Brix prépare la liste du matériel et l'envoie à vos fournisseurs." action={<Button variant="primary" onClick={() => setOuvrir(true)}>Demander des prix</Button>} />
            </div>
          ) : (
            ouvertes.map((d) => {
              const comp = comparatif(d, fournisseurs);
              return (
                <Row key={d.id} onClick={() => nav(`demandes/${d.id}`)}>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-medium">{d.titre}</div>
                    <div className="text-xs text-ink-3">{d.numero} · {d.lignes.length} articles · {comp.reponses}/{comp.consultes} réponses</div>
                  </div>
                  <div className="text-right">
                    {comp.recommandation && <Montant v={eur(comp.recommandation.total_cents)} className="block text-[13px] font-medium" />}
                    <BadgeDemande s={d.statut} />
                  </div>
                </Row>
              );
            })
          )}
        </Card>
      </div>

      {stats.hausses.length > 0 && (
        <Card>
          <CardHeader title="Hausses de prix récentes" icon={<TrendingUp className="h-4 w-4 text-ink-3" />} meta="pensez à mettre à jour vos devis en cours" />
          {stats.hausses.slice(0, 5).map(({ a, avant, pct }) => (
            <Row key={a.id}>
              <FournisseurPastille f={nomF(a.fournisseurId)} size={32} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px]">{a.designation}</div>
                <div className="text-xs text-ink-3">{nomF(a.fournisseurId)?.nom} · {a.reference}</div>
              </div>
              <div className="text-right">
                <div className="num text-[13px]"><span className="text-ink-3 line-through">{money(avant)}</span> {money(a.prixNet)}</div>
                <Badge tone="warn">+{pct.toFixed(1).replace('.', ',')} %</Badge>
              </div>
            </Row>
          ))}
        </Card>
      )}

      <NouvelleDemande open={ouvrir} onClose={() => setOuvrir(false)} />
    </div>
  );
}
