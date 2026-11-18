// Commandes fournisseurs : ce qui est en route, ce qui est arrivé. Une ligne = un bon de commande.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, PackageCheck, PackageOpen, Plus } from 'lucide-react';
import { Button, EmptyState, IconTile, PageHeader, Segmented, cn } from '@/components/ui';
import { relative, todayISO } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { totalCommande, useAchats } from '../data/store';
import type { Commande } from '../data/types';
import { BadgeCommande, FournisseurPastille, Montant } from '../components/ui';
import { ENCOURS, MODES } from '../components/achats/commun';
import NouvelleCommande from '../components/achats/NouvelleCommande';

type Filtre = 'encours' | 'livrees' | 'toutes';
const COLS = 'md:grid md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.3fr)_7.5rem_8.5rem_9.5rem_1rem] md:gap-4';

function Livraison({ c }: { c: Commande }) {
  if (!c.livraisonPrevue) return <span className="text-ink-3">–</span>;
  const retard = ENCOURS.includes(c.statut) && c.statut !== 'brouillon' && c.livraisonPrevue < todayISO();
  if (['livree', 'facturee', 'annulee'].includes(c.statut)) return <span className="text-ink-3">prévue {relative(c.livraisonPrevue)}</span>;
  return <span className={cn('inline-block first-letter:uppercase', retard ? 'font-medium text-bad' : 'text-ink')}>{retard ? `En retard (${relative(c.livraisonPrevue)})` : relative(c.livraisonPrevue)}</span>;
}

/** Mini piste de suivi : envoyée, confirmée, en route, reçue. */
function Piste({ c }: { c: Commande }) {
  const r = ['envoyee', 'confirmee', 'expediee', 'livree'].indexOf(c.statut === 'livree_partiel' ? 'expediee' : c.statut === 'facturee' ? 'livree' : c.statut);
  if (r < 0) return null;
  return (
    <span className="mt-1.5 flex gap-[3px]" aria-hidden>
      {[0, 1, 2, 3].map((i) => <i key={i} className={cn('h-1.5 w-4 rounded-full', i < r || r === 3 ? (i <= r ? 'bg-[#7fd8b4]' : 'bg-halo-track') : i === r ? 'bg-dawn' : 'bg-halo-track')} />)}
    </span>
  );
}

export default function Commandes() {
  const nav = useNavigate();
  const { commandes, fournisseurs } = useAchats();
  const chantiers = useBrix((s) => s.chantiers);
  const [filtre, setFiltre] = useState<Filtre>('encours');
  const [ouvrir, setOuvrir] = useState(false);

  const groupes = useMemo(() => {
    const encours = commandes.filter((c) => ENCOURS.includes(c.statut)).sort((a, b) => (a.livraisonPrevue ?? '9').localeCompare(b.livraisonPrevue ?? '9'));
    const livrees = commandes.filter((c) => c.statut === 'livree' || c.statut === 'facturee').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const toutes = [...commandes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { encours, livrees, toutes };
  }, [commandes]);
  const liste = groupes[filtre];
  const frn = (id: string) => fournisseurs.find((f) => f.id === id);
  const chantier = (id?: string) => chantiers.find((c) => c.id === id)?.name;

  return (
    <div className="bx-stagger space-y-5">
      <PageHeader
        icon={<IconTile icon={<PackageCheck />} dept="achats" size="xl" />}
        title="Commandes"
        titleMuted="suivies comme un colis."
        subtitle="Suivez chaque commande comme un colis, de l’envoi jusqu’à la facture."
        actions={<Button variant="dawn" icon={<Plus className="h-4 w-4" />} onClick={() => setOuvrir(true)}>Nouvelle commande</Button>}
      />

      {commandes.length > 0 && (
        <Segmented
          className="[&>button]:h-10 md:[&>button]:h-9"
          value={filtre}
          onChange={setFiltre}
          options={[
            { value: 'encours', label: 'En cours', count: groupes.encours.length },
            { value: 'livrees', label: 'Livrées', count: groupes.livrees.length },
            { value: 'toutes', label: 'Toutes', count: groupes.toutes.length },
          ]}
        />
      )}

      {liste.length === 0 ? (
        <EmptyState
          icon={<PackageOpen />}
          title={commandes.length === 0 ? 'Aucune commande pour l’instant' : filtre === 'encours' ? 'Rien en cours de livraison' : 'Aucune commande livrée'}
          text={commandes.length === 0 ? 'Commandez directement ici, ou depuis une demande de prix : Brix envoie le bon au fournisseur et suit la livraison pour vous.' : 'Vos commandes reçues et facturées apparaîtront ici.'}
          action={commandes.length === 0 && <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setOuvrir(true)}>Passer une commande</Button>}
        />
      ) : (
        <div className="bx-stagger space-y-2">
          <div className={cn('hidden px-4 pb-1 text-[12px] font-medium text-ink-3', COLS)}>
            <span>Fournisseur</span>
            <span>Chantier</span>
            <span className="text-right">Total</span>
            <span>Livraison</span>
            <span>Statut</span>
            <span />
          </div>
          {liste.map((c) => {
            const f = frn(c.fournisseurId);
            const ch = chantier(c.chantierId);
            return (
              <button key={c.id} onClick={() => nav(`/app/fournisseurs/commandes/${c.id}`)} className={cn('row-card group w-full gap-3 text-left md:items-center', COLS)}>
                {/* Colonne 1 : fournisseur et numéro (toujours visible) */}
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <FournisseurPastille f={f} />
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-medium">{f?.nom ?? 'Fournisseur supprimé'}</div>
                    <div className="truncate text-xs text-ink-3">
                      <span className="num">{c.numero}</span>
                      <span className="md:hidden"> · {ch ?? MODES[c.mode].court}</span>
                    </div>
                  </div>
                </div>
                <div className="hidden min-w-0 truncate text-[13px] text-ink-2 md:block">{ch ?? <span className="text-ink-3">{MODES[c.mode].court}</span>}</div>
                <Montant v={totalCommande(c)} className="hidden text-right text-[13.5px] md:block" />
                <div className="hidden text-[13px] md:block"><Livraison c={c} /></div>
                <div className="hidden md:block">
                  <BadgeCommande s={c.statut} />
                  <Piste c={c} />
                </div>
                <ChevronRight className="hidden h-4 w-4 text-ink-3 transition group-hover:translate-x-0.5 md:block" />
                {/* Téléphone : montant, statut et date empilés à droite */}
                <div className="flex shrink-0 flex-col items-end gap-1 md:hidden">
                  <Montant v={totalCommande(c)} className="text-[13.5px] font-medium" />
                  <BadgeCommande s={c.statut} />
                  <span className="text-[11.5px]"><Livraison c={c} /></span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <NouvelleCommande open={ouvrir} onClose={() => setOuvrir(false)} />
    </div>
  );
}
