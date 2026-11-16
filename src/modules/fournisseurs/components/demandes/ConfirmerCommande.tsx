// Récapitulatif avant d'envoyer les bons de commande, et liste des bons déjà créés.
import { useNavigate } from 'react-router-dom';
import { ChevronRight, MapPin, PackageCheck, Truck } from 'lucide-react';
import { Button, Card, CardHeader, Sheet } from '@/components/ui';
import { dateLong, money } from '@/lib/format';
import type { Recommandation } from '../../../../../worker/src/modules/fournisseurs/comparateur';
import { totalCommande } from '../../data/store';
import type { Commande, Demande, Fournisseur } from '../../data/types';
import { BadgeCommande, FournisseurPastille, Montant } from '../ui';
import { pluriel } from './commun';

export function ConfirmerCommande({ r, d, fournisseurs, onClose, onConfirmer }: { r: Recommandation | null; d: Demande; fournisseurs: Fournisseur[]; onClose: () => void; onConfirmer: (r: Recommandation) => void }) {
  const f = (destId: string) => fournisseurs.find((x) => x.id === d.destinataires.find((y) => y.id === destId)?.fournisseurId);
  return (
    <Sheet
      open={!!r}
      onClose={onClose}
      side="center"
      width={480}
      title={r && r.repartition.length > 1 ? `Envoyer ${r.repartition.length} bons de commande ?` : 'Envoyer le bon de commande ?'}
      subtitle="Le fournisseur le reçoit par e-mail et le confirme depuis son lien, sans créer de compte."
      footer={
        r && (
          <>
            <Button variant="ghost" className="h-11 sm:h-10" onClick={onClose}>Pas encore</Button>
            <Button variant="primary" className="h-11 sm:h-10" onClick={() => onConfirmer(r)}>
              Envoyer {r.repartition.length > 1 ? 'les commandes' : 'la commande'}
            </Button>
          </>
        )
      }
    >
      {r && (
        <div className="space-y-4">
          <ul className="overflow-hidden rounded-[14px] border border-line">
            {r.repartition.map((g) => (
              <li key={g.destinataire_id} className="flex items-center gap-3 border-b border-line px-3.5 py-3 last:border-b-0">
                <FournisseurPastille f={f(g.destinataire_id)} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-medium">{g.fournisseur_nom}</div>
                  <div className="text-[12px] text-ink-3">{pluriel(g.ligne_ids.length, 'article')}, port compris</div>
                </div>
                <Montant v={g.total_cents / 100} className="text-[14px] font-semibold" />
              </li>
            ))}
          </ul>
          <div className="space-y-2 text-[13px] text-ink-2">
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" strokeWidth={1.75} />
              {d.adresse ? `Livraison au ${d.adresse}` : 'Retrait en agence'}
            </p>
            {d.livraisonSouhaitee && (
              <p className="flex items-start gap-2 first-letter:uppercase">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" strokeWidth={1.75} />
                Souhaitée {dateLong(d.livraisonSouhaitee)}
              </p>
            )}
          </div>
          {r.repartition.length > 1 && <p className="rounded-[10px] bg-sub px-3 py-2 text-[12.5px] text-ink-2">Total {money(r.total_cents / 100)} HT pour l’ensemble.</p>}
        </div>
      )}
    </Sheet>
  );
}

export function BonsCrees({ commandes, fournisseurs }: { commandes: Commande[]; fournisseurs: Fournisseur[] }) {
  const nav = useNavigate();
  return (
    <Card>
      <CardHeader title={commandes.length > 1 ? 'Bons de commande envoyés' : 'Bon de commande envoyé'} icon={<PackageCheck className="h-4 w-4 text-ok" strokeWidth={1.75} />} />
      {commandes.map((c) => {
        const f = fournisseurs.find((x) => x.id === c.fournisseurId);
        return (
          <button key={c.id} type="button" onClick={() => nav(`/app/fournisseurs/commandes/${c.id}`)} className="flex min-h-[60px] w-full items-center gap-3 border-b border-line px-4 py-2.5 text-left transition last:border-b-0 hover:bg-[#fafafc]">
            <FournisseurPastille f={f} size={34} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-medium">{f?.nom ?? 'Fournisseur'}</span>
              <span className="block text-[12px] text-ink-3">{c.numero} · {pluriel(c.lignes.length, 'article')}</span>
            </span>
            <span className="flex flex-col items-end gap-1">
              <Montant v={totalCommande(c) + c.port} className="text-[13.5px] font-medium" />
              <BadgeCommande s={c.statut} />
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" />
          </button>
        );
      })}
    </Card>
  );
}
