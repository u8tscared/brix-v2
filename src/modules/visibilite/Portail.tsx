import { useState } from 'react';
import { Copy, ExternalLink, Eye } from 'lucide-react';
import { Badge, Button, Card, CardHeader, PageHeader, Switch, Textarea, toast } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { useVisi, type PortalSettings } from './store';

const OPTIONS: [keyof PortalSettings, string, string][] = [
  ['steps', 'Avancement du chantier', 'Les grandes étapes et le pourcentage, mis à jour par l\'équipe'],
  ['photos', 'Photos du chantier', 'Uniquement celles que vous marquez « visibles par le client »'],
  ['nextVisit', 'Prochain passage', 'Le jour et l\'heure où l\'équipe vient'],
  ['documents', 'Documents', 'Devis signé, factures, attestations, PV de réception'],
  ['payment', 'Paiement en ligne', 'Carte bancaire ou virement instantané, frais inclus dans votre offre'],
  ['chat', 'Messages', 'Le client vous écrit ici plutôt que par SMS à 22 h'],
  ['review', 'Demande d\'avis à la fin', 'Un lien vers votre fiche Google après la réception'],
];

const VIEWS: Record<string, string> = { c_lefevre: 'a regardé les photos hier soir', c_martin: 'a ouvert la facture ce matin', c_tilleuls: 'pas encore ouvert', c_nguyen: 'a écrit il y a 2 jours' };

export default function Portail() {
  const { portal, setPortal } = useVisi();
  const chantiers = useBrix((s) => s.chantiers);
  const clients = useBrix((s) => s.clients);
  const [loaded, setLoaded] = useState(false);
  const live = chantiers.filter((c) => c.status === 'en_cours' || c.status === 'a_planifier');
  const portalUrl = `${location.origin}${location.pathname}#/p/demo`;
  const open = () => window.open(portalUrl, '_blank', 'noopener');

  return (
    <div className="space-y-5">
      <PageHeader
        title="Portail client"
        subtitle="Votre client suit son chantier, retrouve ses documents et paie en ligne. Moins d'appels, paiements plus rapides."
        actions={<Button variant="dawn" icon={<Eye className="h-4 w-4" />} onClick={open}>Voir comme mon client</Button>}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader title="Ce que voit votre client" />
            {OPTIONS.map(([k, label, help]) => (
              <div key={k} className="flex min-h-[60px] items-center gap-3 border-b border-line px-4 py-2 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-medium">{label}</div>
                  <div className="text-[12px] text-ink-3">{help}</div>
                </div>
                <Switch checked={!!portal[k]} onChange={(on) => setPortal({ [k]: on })} label={label} />
              </div>
            ))}
          </Card>

          <Card>
            <CardHeader title="Message d'accueil" />
            <div className="space-y-3 p-4">
              <Textarea value={portal.welcome} onChange={(e) => setPortal({ welcome: e.target.value })} className="text-[13.5px]" />
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-medium">Envoyer le lien tout seul</div>
                  <div className="text-[12px] text-ink-3">Par SMS et e-mail dès que le devis est signé</div>
                </div>
                <Switch checked={portal.autoSend} onChange={(on) => setPortal({ autoSend: on })} label="Envoi automatique" />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Portails ouverts" meta={`${live.length} chantiers`} />
            {live.map((c) => {
              const cl = clients.find((x) => x.id === c.clientId);
              return (
                <div key={c.id} className="flex min-h-[60px] items-center gap-3 border-b border-line px-4 py-2 last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-medium">{cl?.name ?? c.name}</div>
                    <div className="truncate text-[12px] text-ink-3">{VIEWS[c.clientId] ?? 'lien envoyé'}</div>
                  </div>
                  {VIEWS[c.clientId]?.startsWith('pas') ? <Badge>Non ouvert</Badge> : <Badge tone="ok" dot>Actif</Badge>}
                  <button onClick={() => { navigator.clipboard?.writeText(portalUrl).catch(() => {}); toast(`Lien de ${cl?.name ?? 'ce client'} copié`); }} className="grid h-10 w-10 place-items-center rounded-lg text-ink-3 hover:bg-sub hover:text-ink" aria-label="Copier le lien"><Copy className="h-4 w-4" /></button>
                </div>
              );
            })}
          </Card>
        </div>

        <div className="hidden xl:block">
          <div className="sticky top-6">
            <div className="mb-3 flex items-center gap-2 text-[12.5px] font-medium text-ink-2">
              Aperçu en direct · chantier Lefèvre
              <div className="flex-1" />
              <button onClick={open} className="flex items-center gap-1 text-ink-3 hover:text-ink"><ExternalLink className="h-3.5 w-3.5" />Ouvrir</button>
            </div>
            <div className="mx-auto w-[340px] rounded-[44px] border-[10px] border-[#17171f] bg-[#17171f] shadow-pop">
              <div className="relative h-[640px] overflow-hidden rounded-[34px] bg-page">
                {!loaded && <div className="absolute inset-0 animate-pulse bg-sub" />}
                <iframe title="Portail client" src={portalUrl} onLoad={() => setLoaded(true)} className="h-full w-full border-0" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
