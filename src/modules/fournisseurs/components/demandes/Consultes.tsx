// Fournisseurs consultés : qui a ouvert, qui a répondu, et les gestes utiles (relancer, saisir, simuler).
import { useState } from 'react';
import { BellRing, ExternalLink, PhoneCall, Play } from 'lucide-react';
import { Button, Card, CardHeader, toast } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { lienPortail } from '../../data/helpers';
import { useAchats } from '../../data/store';
import type { Demande, Destinataire, Fournisseur } from '../../data/types';
import { BadgeDestinataire, BandeauDemo, FournisseurPastille } from '../ui';
import { pluriel, quand } from './commun';
import SaisieReponse from './SaisieReponse';

function detail(x: Destinataire) {
  if (x.statut === 'repondue' && x.reponduLe) return `Réponse reçue ${quand(x.reponduLe)}`;
  if (x.statut === 'declinee') return x.commentaire ? `« ${x.commentaire} »` : 'Ne peut pas fournir cette liste';
  if (x.vuLe) return `Ouverte ${quand(x.vuLe)}, pas encore de prix`;
  if (x.envoyeLe) return `Envoyée ${quand(x.envoyeLe)}`;
  return 'Pas encore envoyée';
}

export default function Consultes({ d, fournisseurs }: { d: Demande; fournisseurs: Fournisseur[] }) {
  const isDemo = useBrix((s) => s.isDemo);
  const relancer = useAchats((s) => s.relancer);
  const simuler = useAchats((s) => s.simulerReponses);
  const [saisie, setSaisie] = useState(false);
  const active = d.statut !== 'commandee' && d.statut !== 'annulee';
  const attente = d.destinataires.filter((x) => x.statut === 'envoyee' || x.statut === 'vue');
  const f = (id: string) => fournisseurs.find((x) => x.id === id);

  return (
    <Card>
      <CardHeader title="Fournisseurs consultés" meta={`${d.destinataires.filter((x) => x.statut === 'repondue').length}/${d.destinataires.length} réponses`} />
      <ul>
        {d.destinataires.map((x) => (
          <li key={x.id} className="flex min-h-[60px] items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0">
            <FournisseurPastille f={f(x.fournisseurId)} size={34} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-medium">{f(x.fournisseurId)?.nom ?? 'Fournisseur'}</div>
              <div className="truncate text-[12px] text-ink-3">{detail(x)}</div>
            </div>
            <BadgeDestinataire s={x.statut} />
            {isDemo && active && x.statut !== 'repondue' && x.statut !== 'declinee' && (
              <Button size="icon" variant="ghost" className="h-11 w-11 sm:h-9 sm:w-9" aria-label="Ouvrir le lien du fournisseur" title="Ouvrir le lien du fournisseur (démo)" onClick={() => window.open(lienPortail(x.token), '_blank')}>
                <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
              </Button>
            )}
          </li>
        ))}
      </ul>

      {active && (
        <div className="space-y-2 border-t border-line p-3">
          {attente.length > 0 && (
            <Button
              variant="secondary"
              className="h-11 w-full justify-center"
              icon={<BellRing className="h-4 w-4" strokeWidth={1.75} />}
              onClick={() => {
                const n = relancer(d.id);
                toast(n ? `Relance envoyée à ${pluriel(n, 'fournisseur')}.` : 'Tout le monde a déjà répondu.');
              }}
            >
              Relancer ceux qui n’ont pas répondu
            </Button>
          )}
          <Button variant="ghost" className="h-11 w-full justify-center" icon={<PhoneCall className="h-4 w-4" strokeWidth={1.75} />} onClick={() => setSaisie(true)}>
            Saisir une réponse reçue par téléphone
          </Button>
          {isDemo && attente.length > 0 && (
            <BandeauDemo>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <span className="flex-1">Démo : rien ne part chez un vrai fournisseur. Ouvrez son lien pour répondre à sa place, ou faites répondre tout le monde.</span>
                <Button
                  size="sm"
                  variant="soft"
                  className="h-10 justify-center sm:h-8"
                  icon={<Play className="h-3.5 w-3.5" />}
                  onClick={() => {
                    const n = simuler(d.id);
                    toast(`${pluriel(n, 'réponse simulée', 'réponses simulées')}. Le comparatif est à jour.`);
                  }}
                >
                  Simuler les réponses (démo)
                </Button>
              </div>
            </BandeauDemo>
          )}
        </div>
      )}

      <SaisieReponse d={d} fournisseurs={fournisseurs} open={saisie} onClose={() => setSaisie(false)} />
    </Card>
  );
}
