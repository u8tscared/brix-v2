// Détail d'une demande de prix : le conseil, le comparatif, qui a répondu, l'historique.
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarClock, FileText, MapPin, Truck, XCircle } from 'lucide-react';
import { Button, Card, EmptyState, Sheet, toast } from '@/components/ui';
import { dateLong, daysBetween, relative, todayISO } from '@/lib/format';
import { useBrix } from '@/lib/store';
import type { Recommandation } from '../../../../worker/src/modules/fournisseurs/comparateur';
import { comparatif } from '../data/helpers';
import { useAchats } from '../data/store';
import { BadgeDemande } from '../components/ui';
import { Info, pluriel } from '../components/demandes/commun';
import CarteConseil, { CarteAttente, portDe } from '../components/demandes/CarteConseil';
import Comparatif from '../components/demandes/Comparatif';
import Consultes from '../components/demandes/Consultes';
import Journal from '../components/demandes/Journal';
import { BonsCrees, ConfirmerCommande } from '../components/demandes/ConfirmerCommande';

function echeance(iso: string) {
  const j = daysBetween(todayISO(), iso);
  return j < 0 ? `dépassée (${dateLong(iso)})` : `${relative(iso)}${j > 1 ? `, ${dateLong(iso)}` : ''}`;
}

export default function DemandeDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { demandes, fournisseurs, commandes, commanderDepuisDemande, annulerDemande } = useAchats();
  const devis = useBrix((s) => s.devis);
  const d = demandes.find((x) => x.id === id);
  const comp = useMemo(() => (d ? comparatif(d, fournisseurs) : null), [d, fournisseurs]);
  const [aConfirmer, setAConfirmer] = useState<Recommandation | null>(null);
  const [annuler, setAnnuler] = useState(false);

  if (!d || !comp) {
    return (
      <EmptyState
        icon={<FileText />}
        title="Cette demande n’existe plus"
        text="Elle a peut-être été supprimée. Retrouvez toutes vos demandes dans la liste."
        action={<Button variant="primary" onClick={() => nav('/app/fournisseurs/demandes')}>Voir mes demandes</Button>}
      />
    );
  }

  const lie = devis.find((x) => x.id === d.devisId);
  const bons = commandes.filter((c) => c.demandeId === d.id);
  const active = d.statut !== 'commandee' && d.statut !== 'annulee';

  const commander = (r: Recommandation) => {
    const ids = commanderDepuisDemande(
      d.id,
      r.repartition.map((g) => ({ destinataireId: g.destinataire_id, ligneIds: g.ligne_ids, port: portDe(comp, g.destinataire_id) })),
    );
    setAConfirmer(null);
    if (!ids.length) return toast('La commande n’a pas pu être créée.', 'warn');
    if (ids.length === 1) {
      toast('Bon de commande envoyé. Vous serez prévenu dès sa confirmation.');
      nav(`/app/fournisseurs/commandes/${ids[0]}`);
    } else {
      toast(`${ids.length} bons de commande envoyés. Suivez-les ci-dessous.`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-5">
      <Link to="/app/fournisseurs/demandes" className="-ml-1 inline-flex h-10 items-center gap-1.5 rounded-lg px-1 md:h-9 text-[13px] font-medium text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Demandes de prix
      </Link>

      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-ink-3">
          <span className="num font-medium">{d.numero}</span>
          <BadgeDemande s={d.statut} />
        </div>
        <h1 className="font-display text-[22px] font-semibold leading-tight tracking-[-0.025em] md:text-[26px]">{d.titre}</h1>
        <div className="grid grid-cols-1 gap-3 rounded-[14px] border border-line bg-white p-4 sm:grid-cols-2 xl:grid-cols-4">
          <Info icon={<FileText />} label="Devis">
            {lie ? (
              <Link to={`/app/devis/${lie.id}`} className="font-medium text-brand hover:underline">
                {lie.number}
              </Link>
            ) : (
              'Liste libre'
            )}
            <span className="text-ink-3"> · {pluriel(d.lignes.length, 'article')}</span>
          </Info>
          <Info icon={<CalendarClock />} label="Réponses attendues">{d.dateLimite ? echeance(d.dateLimite) : 'Pas de date'}</Info>
          <Info icon={<Truck />} label="Livraison souhaitée">{d.livraisonSouhaitee ? dateLong(d.livraisonSouhaitee) : 'Dès que possible'}</Info>
          <Info icon={<MapPin />} label="Adresse">{d.adresse ?? 'Retrait en agence'}</Info>
        </div>
      </header>

      {d.statut === 'annulee' && (
        <Card className="flex items-center gap-3 p-4 text-[13.5px] text-ink-2">
          <XCircle className="h-5 w-5 shrink-0 text-ink-3" strokeWidth={1.75} />
          Demande annulée. Les fournisseurs ne peuvent plus y répondre.
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          {bons.length > 0 && <BonsCrees commandes={bons} fournisseurs={fournisseurs} />}
          {active && (comp.recommandation ? <CarteConseil comp={comp} d={d} fournisseurs={fournisseurs} onCommander={setAConfirmer} /> : <CarteAttente d={d} comp={comp} />)}
          {comp.reponses > 0 && <Comparatif d={d} comp={comp} fournisseurs={fournisseurs} />}
        </div>
        <aside className="min-w-0 space-y-5">
          <Consultes d={d} fournisseurs={fournisseurs} />
          {d.message && (
            <Card className="p-4">
              <div className="text-[11.5px] font-medium uppercase tracking-[0.04em] text-ink-3">Votre message</div>
              <p className="mt-1 text-[13.5px] text-ink-2">{d.message}</p>
            </Card>
          )}
          <Journal evenements={d.journal} />
          {active && (
            <button type="button" onClick={() => setAnnuler(true)} className="flex h-11 w-full items-center justify-center text-[13px] font-medium text-ink-3 hover:text-bad">
              Annuler la demande
            </button>
          )}
        </aside>
      </div>

      <ConfirmerCommande r={aConfirmer} d={d} fournisseurs={fournisseurs} onClose={() => setAConfirmer(null)} onConfirmer={commander} />

      <Sheet
        open={annuler}
        onClose={() => setAnnuler(false)}
        side="center"
        width={420}
        title="Annuler cette demande ?"
        subtitle="Les fournisseurs ne pourront plus envoyer leurs prix. Les réponses déjà reçues restent visibles."
        footer={
          <>
            <Button variant="ghost" className="h-11 sm:h-10" onClick={() => setAnnuler(false)}>Garder la demande</Button>
            <Button
              variant="danger"
              className="h-11 sm:h-10"
              onClick={() => {
                annulerDemande(d.id);
                setAnnuler(false);
                toast('Demande annulée.');
              }}
            >
              Annuler la demande
            </Button>
          </>
        }
      >
        <span />
      </Sheet>
    </div>
  );
}
