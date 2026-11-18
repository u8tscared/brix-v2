// Détail d'une commande, suivi façon colis : où en est-elle, que dois-je faire maintenant.
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Ban, ExternalLink, FileDown, MessageSquareDiff, Package, PackageCheck, PackageSearch, Phone, Receipt, Send } from 'lucide-react';
import { Badge, Button, Card, CardHeader, EmptyState, IconTile, Progress, Sheet, cn, toast } from '@/components/ui';
import { dateShort, money, num, relative, todayISO } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { transitionAutorisee } from '../../../../worker/src/modules/fournisseurs/cycle-commande';
import { lienPortail } from '../data/helpers';
import { totalCommande, useAchats } from '../data/store';
import type { Commande } from '../data/types';
import { BadgeCommande, BandeauDemo, FournisseurPastille, Montant } from '../components/ui';
import { telechargerEdi } from '../components/achats/commun';
import Frise from '../components/achats/Frise';
import CommandeInfos from '../components/achats/CommandeInfos';
import Reception from '../components/achats/Reception';
import RapprocherFacture from '../components/achats/RapprocherFacture';

function message(c: Commande, nomF: string): string {
  const quand = c.livraisonPrevue ? relative(c.livraisonPrevue) : null;
  switch (c.statut) {
    case 'brouillon': return 'Cette commande n’est pas encore partie. Vérifiez les articles puis envoyez-la.';
    case 'envoyee': return `${nomF} a reçu votre commande. Vous serez prévenu dès qu’il la confirme.`;
    case 'confirmee': return `${nomF} a confirmé${quand ? `. Livraison prévue ${quand}` : ''}. À l’arrivée, pointez la livraison.`;
    case 'expediee': return `Votre matériel est en route${quand ? `, arrivée prévue ${quand}` : ''}. Pointez la livraison à réception.`;
    case 'livree_partiel': return 'Une partie du matériel est arrivée. Pointez la suite à la prochaine livraison.';
    case 'livree': return 'Tout est arrivé. Dernière étape : vérifier que la facture correspond.';
    case 'facturee': return c.ecartFacture && Math.abs(c.ecartFacture) > 1 ? `Facture enregistrée, avec un écart de ${money(c.ecartFacture)} à vérifier.` : 'Commande terminée : livrée et facturée au bon montant.';
    case 'annulee': return 'Cette commande a été annulée.';
  }
}

export default function CommandeDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { commandes, fournisseurs, envoyerCommande, majStatutCommande } = useAchats();
  const { chantiers, company, isDemo } = useBrix();
  const [sheet, setSheet] = useState<null | 'reception' | 'facture' | 'annuler'>(null);
  const c = commandes.find((x) => x.id === id);

  if (!c) {
    return <EmptyState icon={<PackageSearch />} title="Commande introuvable" text="Elle a peut-être été supprimée." action={<Button variant="primary" onClick={() => nav('/app/fournisseurs/commandes')}>Retour aux commandes</Button>} />;
  }

  const f = fournisseurs.find((x) => x.id === c.fournisseurId);
  const chantier = chantiers.find((x) => x.id === c.chantierId);
  const total = totalCommande(c);
  const retard = ['envoyee', 'confirmee', 'expediee', 'livree_partiel'].includes(c.statut) && !!c.livraisonPrevue && c.livraisonPrevue < todayISO();
  const peutAnnuler = transitionAutorisee(c.statut, 'annulee', 'artisan');

  const principale = (() => {
    if (c.statut === 'brouillon') return <Button variant="dawn" size="lg" icon={<Send className="h-4 w-4" />} onClick={() => { envoyerCommande(c.id); toast(`Commande envoyée à ${f?.nom ?? 'votre fournisseur'}`); }}>Envoyer la commande</Button>;
    if (['envoyee', 'confirmee', 'expediee', 'livree_partiel'].includes(c.statut)) return <Button variant="dawn" size="lg" icon={<PackageCheck className="h-4 w-4" />} onClick={() => setSheet('reception')}>Pointer la livraison</Button>;
    if (c.statut === 'livree') return <Button variant="dawn" size="lg" icon={<Receipt className="h-4 w-4" />} onClick={() => setSheet('facture')}>Rapprocher la facture</Button>;
    return null;
  })();

  return (
    <div className="bx-stagger space-y-5">
      <div className="space-y-3">
        <Link to="/app/fournisseurs/commandes" className="group -ml-1 inline-flex h-10 items-center gap-1.5 rounded-pill px-3 text-[13px] font-medium text-ink-2 transition-[background,color,box-shadow] duration-300 hover:bg-white hover:text-ink hover:shadow-pill md:h-9">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> Commandes
        </Link>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-3">
              <span className="font-mono text-ink-2">{c.numero}</span>·<span>créée le {dateShort(c.createdAt)}</span>
            </div>
            <div className="flex items-center gap-4">
              <FournisseurPastille f={f} size={56} />
              <h1 className="title-halo min-w-0 text-ink">{f?.nom ?? 'Commande'}</h1>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <BadgeCommande s={c.statut} />
              {retard && <Badge tone="bad">Livraison en retard</Badge>}
              <span className="num-halo text-[15px] text-ink">{money(total + c.port)} <span className="text-[12px] font-medium tracking-normal text-ink-3">HT</span></span>
            </div>
          </div>
          {principale && <div className="[&>button]:w-full [&>button]:justify-center sm:[&>button]:w-auto">{principale}</div>}
        </div>
      </div>

      {c.statut !== 'annulee' && (
        <Card className="halo-bg halo-clip relative overflow-hidden px-3 py-6 md:px-8 md:py-7">
          <Frise statut={c.statut} sousTitres={{ 1: c.prepareeLe ? 'Préparée' : c.referenceFournisseur ? `réf. ${c.referenceFournisseur}` : undefined, 2: c.suivi }} />
          <p className={cn('mx-auto mt-5 max-w-xl text-center text-[13.5px]', retard ? 'text-bad' : 'text-ink-2')}>
            {retard ? `La livraison était prévue ${relative(c.livraisonPrevue!)}. Appelez ${f?.nom ?? 'le fournisseur'} pour savoir où elle en est.` : message(c, f?.nom ?? 'Le fournisseur')}
          </p>
        </Card>
      )}
      {c.statut === 'annulee' && <Card className="p-4 text-[13.5px] text-ink-2">{message(c, '')}</Card>}

      {c.proposition && c.statut === 'envoyee' && (
        <Card className="bx-pop flex flex-col gap-3 bg-[linear-gradient(135deg,#fffaf0,#fff)] p-5 sm:flex-row sm:items-center">
          <IconTile icon={<MessageSquareDiff />} tone="amber" />
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold">{f?.nom ?? 'Le fournisseur'} propose une modification</div>
            <div className="text-[13px] text-ink-2">« {c.proposition.texte} »{c.proposition.livraison ? ` · livraison possible le ${dateShort(c.proposition.livraison)}` : ''}</div>
          </div>
          {f?.telephone && <a href={`tel:${f.telephone.replace(/\s/g, '')}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-pill bg-white px-4 text-[13.5px] font-medium shadow-[0_1px_2px_rgba(60,30,120,.08),0_0_0_1px_#ece8f6] transition hover:-translate-y-px"><Phone className="h-4 w-4" strokeWidth={1.75} />Appeler {f.contact?.split(' ')[0] ?? ''}</a>}
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader title="Articles" meta={`${c.lignes.length}`} />
            <div className="space-y-2 p-3">
            {c.lignes.map((l) => {
              const pct = l.quantite ? (Math.min(l.quantiteLivree, l.quantite) / l.quantite) * 100 : 0;
              const suivi = c.statut !== 'brouillon' && c.statut !== 'annulee';
              return (
                <div key={l.id} className="row-card flex-col items-stretch gap-2 px-3.5 py-3 sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                  <IconTile size="row" icon={<Package />} tone={pct >= 100 ? 'green' : 'peach'} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-medium leading-snug">{l.designation}</div>
                    <div className="mt-0.5 text-xs text-ink-3">
                      {l.reference && <>{l.reference} · </>}<span className="num">{num(l.quantite)}</span> {l.unite} × <span className="num">{money(l.prix)}</span>
                    </div>
                  </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {suivi && (
                      <div className="w-full sm:w-36">
                        <div className="mb-1 flex justify-between text-[11.5px]">
                          <span className="text-ink-3">Reçu</span>
                          <span className={cn('num font-medium', pct >= 100 ? 'text-ok' : pct > 0 ? 'text-warn' : 'text-ink-3')}>{num(l.quantiteLivree)} / {num(l.quantite)}</span>
                        </div>
                        <Progress value={pct} tone={pct >= 100 ? 'ok' : 'warn'} />
                      </div>
                    )}
                    <Montant v={l.prix * l.quantite} className="w-24 shrink-0 text-right text-[13.5px]" />
                  </div>
                </div>
              );
            })}
            </div>
            <dl className="mx-3 mb-3 space-y-1.5 rounded-card-sm bg-dawn-pale px-5 py-4 text-[13.5px]">
              <div className="flex justify-between"><dt className="text-ink-2">Articles</dt><dd className="num">{money(total)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-2">Frais de port</dt><dd className="num">{c.port ? money(c.port) : <span className="text-ok">Offerts</span>}</dd></div>
              <div className="flex items-end justify-between pt-1.5"><dt className="font-semibold">Total HT</dt><dd className="num-halo text-[26px] leading-none">{money(total + c.port)}</dd></div>
              {c.factureId && c.ecartFacture != null && (
                <div className={cn('flex justify-between pt-1 text-[13px]', Math.abs(c.ecartFacture) > 1 ? 'text-warn' : 'text-ok')}>
                  <dt>Facture du fournisseur</dt>
                  <dd className="num">{Math.abs(c.ecartFacture) < 0.01 ? 'conforme' : `écart ${c.ecartFacture > 0 ? '+' : ''}${money(c.ecartFacture)}`}</dd>
                </div>
              )}
            </dl>
          </Card>

          <Card>
            <CardHeader title="Historique" />
            <ol className="px-5 py-4">
              {c.journal.map((e, i) => (
                <li key={i} className="relative flex gap-3 pb-3.5 last:pb-0">
                  {i < c.journal.length - 1 && <span className="absolute left-[4px] top-3 h-full w-px bg-[#e3ddf0]" />}
                  <span className={cn('relative mt-1.5 h-[9px] w-[9px] shrink-0 rounded-full border-2 border-white', i === 0 ? 'bg-vi-600' : e.acteur === 'fournisseur' ? 'bg-[#10b981]' : 'bg-[#d6cfe8]', i === 0 && 'fx-ping')} />
                  <div className="min-w-0">
                    <div className="text-[13px]">{e.texte}</div>
                    <div className="text-[11.5px] text-ink-3">
                      {new Date(e.at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      {' · '}{e.acteur === 'artisan' ? 'vous' : e.acteur === 'fournisseur' ? 'le fournisseur' : e.acteur === 'api' ? 'logiciel du fournisseur' : 'Brix'}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-4">
          <CommandeInfos c={c} f={f} chantier={chantier} />
          <Card className="p-2">
            <Button variant="ghost" className="w-full justify-start" icon={<FileDown className="h-4 w-4" />} onClick={() => { telechargerEdi(c, f, company, chantier); toast('Bon de commande téléchargé, au format lu par les logiciels des négoces', 'info'); }}>
              Télécharger le bon de commande
            </Button>
            {isDemo && c.token && (
              <Button variant="ghost" className="w-full justify-start" icon={<ExternalLink className="h-4 w-4" />} onClick={() => window.open(lienPortail(c.token!), '_blank')}>
                Voir comme le fournisseur
              </Button>
            )}
            {peutAnnuler && (
              <button className="flex h-10 w-full items-center gap-2 rounded-pill px-4 text-sm font-medium text-deep-r transition hover:bg-pale-r" onClick={() => setSheet('annuler')}>
                <Ban className="h-4 w-4" /> Annuler la commande
              </button>
            )}
          </Card>
          {isDemo && c.token && ['envoyee', 'confirmee'].includes(c.statut) && (
            <BandeauDemo>Démo : ouvrez « Voir comme le fournisseur » pour confirmer ou expédier la commande à sa place, et voir le suivi avancer ici.</BandeauDemo>
          )}
        </div>
      </div>

      <Reception commande={c} open={sheet === 'reception'} onClose={() => setSheet(null)} />
      <RapprocherFacture commande={c} open={sheet === 'facture'} onClose={() => setSheet(null)} />
      <Sheet
        open={sheet === 'annuler'}
        onClose={() => setSheet(null)}
        side="center"
        width={420}
        title="Annuler cette commande ?"
        subtitle={c.statut === 'brouillon' ? 'Elle n’a pas encore été envoyée.' : `${f?.nom ?? 'Le fournisseur'} sera prévenu par e-mail. Si le matériel est déjà préparé, appelez-le aussi.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSheet(null)}>Garder</Button>
            <Button variant="danger" onClick={() => { const r = majStatutCommande(c.id, 'annulee'); toast(r.ok ? 'Commande annulée' : r.message ?? 'Impossible d’annuler', r.ok ? 'info' : 'warn'); setSheet(null); }}>
              Annuler la commande
            </Button>
          </>
        }
      >
        <span />
      </Sheet>
    </div>
  );
}
