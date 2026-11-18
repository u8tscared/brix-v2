import { useEffect, useRef, useState } from 'react';
import { CalendarClock, Camera, Check, Copy, CreditCard, ExternalLink, Eye, FileText, ListChecks, MessageCircle, MessageSquareText, RotateCw, Send, Star } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Avatar, Badge, Button, Card, CardHeader, cn, IconTile, PageHeader, Switch, Textarea, toast, type HaloTone } from '@/components/ui';
import { initials } from '@/lib/format';
import { clientColor, clientInk } from '@/modules/vendre/lib';
import { PhoneFrame } from './components/PhoneFrame';
import { useBrix } from '@/lib/store';
import { useVisi, type PortalSettings } from './store';

const OPTIONS: [keyof PortalSettings, string, string, LucideIcon, HaloTone][] = [
  ['steps', 'Avancement du chantier', 'Les grandes étapes et le pourcentage, mis à jour par l\'équipe', ListChecks, 'peach'],
  ['photos', 'Photos du chantier', 'Uniquement celles que vous marquez « visibles par le client »', Camera, 'rose'],
  ['nextVisit', 'Prochain passage', 'Le jour et l\'heure où l\'équipe vient', CalendarClock, 'blue'],
  ['documents', 'Documents', 'Devis signé, factures, attestations, PV de réception', FileText, 'violet'],
  ['payment', 'Paiement en ligne', 'Carte bancaire ou virement instantané, frais inclus dans votre offre', CreditCard, 'mag'],
  ['chat', 'Messages', 'Le client vous écrit ici plutôt que par SMS à 22 h', MessageCircle, 'green'],
  ['review', 'Demande d\'avis à la fin', 'Un lien vers votre fiche Google après la réception', Star, 'amber'],
];

const VIEWS: Record<string, string> = { c_lefevre: 'a regardé les photos hier soir', c_martin: 'a ouvert la facture ce matin', c_tilleuls: 'pas encore ouvert', c_nguyen: 'a écrit il y a 2 jours' };

export default function Portail() {
  const { portal, setPortal } = useVisi();
  const chantiers = useBrix((s) => s.chantiers);
  const clients = useBrix((s) => s.clients);
  const [loaded, setLoaded] = useState(false);
  const [frameKey, setFrameKey] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);
  const first = useRef(true);
  const sig = JSON.stringify(portal);
  // L'aperçu lit les réglages enregistrés : on le recharge (après une courte pause) quand ils changent.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setLoaded(false);
    const t = setTimeout(() => setFrameKey((k) => k + 1), 450);
    return () => clearTimeout(t);
  }, [sig]);
  const on = OPTIONS.filter(([k]) => portal[k]).length;
  const copy = (id: string, name: string) => {
    navigator.clipboard?.writeText(portalUrl).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied((c) => (c === id ? null : c)), 1600);
    toast(`Lien de ${name} copié`);
  };
  const live = chantiers.filter((c) => c.status === 'en_cours' || c.status === 'a_planifier');
  const portalUrl = `${location.origin}${location.pathname}#/p/demo`;
  const open = () => window.open(portalUrl, '_blank', 'noopener');

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<IconTile name="MonitorSmartphone" dept="visibilite" size="lg" />}
        title="Portail client"
        titleMuted="son chantier, dans sa poche."
        subtitle="Votre client suit son chantier, retrouve ses documents et paie en ligne. Moins d’appels, paiements plus rapides."
        actions={<Button variant="dawn" icon={<Eye />} onClick={open}>Voir comme mon client</Button>}
      />

      <div className="grid gap-5 [&>*]:min-w-0 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader icon={<IconTile icon={<Eye />} tone="rose" size="sm" />} title="Ce que voit votre client" meta={`${on} sur ${OPTIONS.length} affichés`} />
            {OPTIONS.map(([k, label, help, I, tone]) => (
              <div key={k} className="flex min-h-[66px] items-center gap-3 border-b border-halo-line px-4 py-2 transition-colors last:border-b-0 hover:bg-halo-hover md:px-5">
                <IconTile icon={<I />} tone={portal[k] ? tone : 'neutral'} size="row" className={cn('transition-[background,color,opacity] duration-300', !portal[k] && 'opacity-70')} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-medium">{label}</div>
                  <div className="text-[12px] text-ink-3">{help}</div>
                </div>
                <Switch checked={!!portal[k]} onChange={(on) => setPortal({ [k]: on })} label={label} />
              </div>
            ))}
          </Card>

          <Card>
            <CardHeader icon={<IconTile icon={<MessageSquareText />} tone="violet" size="sm" />} title="Message d’accueil" meta="en haut du portail" />
            <div className="space-y-3 p-4 md:p-5">
              <Textarea value={portal.welcome} onChange={(e) => setPortal({ welcome: e.target.value })} className="text-[13.5px]" aria-label="Message d'accueil" />
              <div className="row-card">
                <IconTile icon={<Send />} tone="blue" size="row" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-medium">Envoyer le lien tout seul</div>
                  <div className="text-[12px] text-ink-3">Par SMS et e-mail dès que le devis est signé</div>
                </div>
                <Switch checked={portal.autoSend} onChange={(on) => setPortal({ autoSend: on })} label="Envoi automatique" />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader icon={<IconTile name="MonitorSmartphone" tone="green" size="sm" />} title="Portails ouverts" meta={`${live.length} chantiers`} />
            {live.map((c) => {
              const cl = clients.find((x) => x.id === c.clientId);
              return (
                <div key={c.id} className="flex min-h-[64px] items-center gap-3 border-b border-halo-line px-4 py-2 last:border-b-0 md:px-5">
                  {cl && <Avatar initials={initials(cl.name)} color={clientColor(cl.id)} fg={clientInk(cl.id)} size={36} />}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-medium">{cl?.name ?? c.name}</div>
                    <div className="truncate text-[12px] text-ink-3">{VIEWS[c.clientId] ?? 'lien envoyé'}</div>
                  </div>
                  {VIEWS[c.clientId]?.startsWith('pas') ? <Badge>Non ouvert</Badge> : <Badge tone="ok" dot>Actif</Badge>}
                  <button onClick={() => copy(c.id, cl?.name ?? 'ce client')} className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-full transition-colors duration-300', copied === c.id ? 'bg-pale-g text-deep-g' : 'text-ink-3 hover:bg-halo-hover hover:text-ink')} aria-label="Copier le lien">{copied === c.id ? <Check className="h-4 w-4 animate-pop" strokeWidth={2.4} /> : <Copy className="h-4 w-4" />}</button>
                </div>
              );
            })}
          </Card>
        </div>

        <div>
          <div className="xl:sticky xl:top-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-[15px] font-semibold tracking-[-0.02em]">Aperçu en direct</span>
              <span className={cn('flex items-center gap-1 text-[11.5px] text-ink-3 transition-opacity duration-300', loaded ? 'opacity-0' : 'opacity-100')}><RotateCw className="h-3 w-3 animate-spin" />Mise à jour</span>
              <div className="flex-1" />
              <button onClick={open} className="flex min-h-[40px] items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium text-ink-2 transition-colors hover:bg-white hover:text-ink hover:shadow-pill"><ExternalLink className="h-3.5 w-3.5" />Ouvrir</button>
            </div>
            <div className="rounded-card bg-[radial-gradient(closest-side,#fce4f3,transparent)] py-2">
              <PhoneFrame width={320} height={640}>
                <div className="relative" style={{ height: (620 * 390) / 300 - 38 }}>
                  <div className={cn('skeleton absolute inset-0 transition-opacity duration-300', loaded ? 'pointer-events-none opacity-0' : 'opacity-100')} />
                  <iframe key={frameKey} title="Aperçu du portail client" src={portalUrl} onLoad={() => setLoaded(true)} className={cn('h-full w-full border-0 transition-opacity duration-500', loaded ? 'opacity-100' : 'opacity-0')} />
                </div>
              </PhoneFrame>
            </div>
            <p className="mt-2 text-center text-[11.5px] text-ink-3">Chantier Lefèvre, tel que votre client le voit</p>
          </div>
        </div>
      </div>
    </div>
  );
}
