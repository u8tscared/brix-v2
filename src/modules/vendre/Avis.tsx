import { useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { Badge, Button, Card, CardHeader, cn, IconTile, PageHeader, Segmented, Select, Switch, toast } from '@/components/ui';
import { GrowBar } from '@/components/motion';
import { KpiBand } from '@/modules/chantiers/components/common/KpiBand';
import { dateShort, relative, todayISO } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { ReviewCard, Stars } from './components/ReviewCard';
import { sendReviewRequest } from './service';
import { useVendre } from './store';

export default function Avis() {
  const v = useVendre();
  const chantiers = useBrix((s) => s.chantiers);
  const clients = useBrix((s) => s.clients);
  const company = useBrix((s) => s.company);
  const [filter, setFilter] = useState<'tous' | 'sans'>('tous');
  const [sending, setSending] = useState<string | null>(null);

  const reviews = [...v.reviews].sort((a, b) => b.date.localeCompare(a.date));
  const avg = reviews.reduce((a, r) => a + r.rating, 0) / (reviews.length || 1);
  const unanswered = reviews.filter((r) => !r.reply).length;
  const month = reviews.filter((r) => r.date.slice(0, 7) === todayISO().slice(0, 7)).length;
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, c: reviews.filter((r) => r.rating === n).length }));
  const ended = chantiers.filter((c) => c.status === 'termine' || c.status === 'reception' || c.progress >= 85);
  const list = filter === 'sans' ? reviews.filter((r) => !r.reply) : reviews;

  const request = async (chantierId: string, clientId: string) => {
    setSending(chantierId);
    await sendReviewRequest(clientId, v.autoReview.channel);
    v.addReviewRequest({ chantierId, sentAt: todayISO(), channel: v.autoReview.channel });
    setSending(null);
    toast(`Demande d'avis envoyée par ${v.autoReview.channel === 'sms' ? 'SMS' : 'e-mail'} (démo)`);
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={<IconTile name="Star" dept="vendre" size="lg" />} title="Avis clients" subtitle="Plus d'avis Google, c'est plus d'appels. Bob demande au bon moment et répond pour vous." />

      <KpiBand
        hero={{
          label: 'Note Google',
          value: avg,
          format: (n) => n.toFixed(1).replace('.', ','),
          sub: `sur ${reviews.length} avis`,
          extra: (
            <div className="space-y-1.5">
              <Stars value={avg} size={16} />
              <div className="flex max-w-[260px] flex-col gap-1 pt-1">
                {dist.map((d) => (
                  <div key={d.n} className="flex items-center gap-2 text-[11px] text-ink-3">
                    <span className="num w-2">{d.n}</span>
                    <GrowBar value={(d.c / Math.max(1, reviews.length)) * 100} className="h-1 flex-1" barClassName="bg-[#f59e0b]" />
                    <span className="num w-3 text-right">{d.c}</span>
                  </div>
                ))}
              </div>
            </div>
          ),
        }}
        items={[
          { label: 'Ce mois-ci', value: month, sub: 'nouveaux avis' },
          { label: 'Sans réponse', value: unanswered, tone: unanswered ? 'warn' : 'ok', sub: unanswered ? 'Répondre aide votre classement' : 'Tout est répondu' },
          { label: 'Taux de retour', value: '64 %', sub: 'des clients sollicités' },
        ]}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="min-w-0 self-start">
          <CardHeader title="Avis reçus" action={<Segmented size="sm" value={filter} onChange={setFilter} options={[{ value: 'tous', label: 'Tous', count: reviews.length }, { value: 'sans', label: 'À répondre', count: unanswered }]} />} />
          {list.map((r) => <ReviewCard key={r.id} r={r} />)}
          {!list.length && <div className="px-4 py-12 text-center text-[13px] text-ink-3"><CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-ok" strokeWidth={1.5} />Vous avez répondu à tous les avis.</div>}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Demande automatique" action={<Switch checked={v.autoReview.on} onChange={(on) => { v.setAutoReview({ on }); toast(on ? 'Bob demandera un avis à chaque fin de chantier' : 'Demande automatique coupée', on ? 'ok' : 'info'); }} label="Demande automatique" />} />
            <div className={cn('space-y-3 p-4', !v.autoReview.on && 'opacity-50')}>
              <p className="text-[13px] text-ink-2">À la signature du PV de réception, Bob envoie au client un lien direct vers votre fiche Google.</p>
              <div className="grid grid-cols-2 gap-2">
                <Select value={v.autoReview.delayDays} onChange={(e) => v.setAutoReview({ delayDays: Number(e.target.value) })} disabled={!v.autoReview.on} aria-label="Délai">
                  {[[0, 'Le jour même'], [1, 'Le lendemain'], [2, '2 jours après'], [7, '1 semaine après']].map(([d, l]) => <option key={d} value={d}>{l}</option>)}
                </Select>
                <Select value={v.autoReview.channel} onChange={(e) => v.setAutoReview({ channel: e.target.value as 'sms' | 'mail' })} disabled={!v.autoReview.on} aria-label="Canal">
                  <option value="sms">Par SMS</option>
                  <option value="mail">Par e-mail</option>
                </Select>
              </div>
              <div className="rounded-2xl rounded-bl-md bg-sub p-3 text-[12.5px] leading-relaxed text-ink-2">
                Bonjour Michel, merci pour votre confiance ! Si vous êtes satisfait, un petit avis nous aiderait beaucoup : g.page/{company.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]+/g, '-')}/avis · {company.name}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Fins de chantier" meta="à solliciter" />
            {ended.map((c) => {
              const req = v.reviewRequests.find((r) => r.chantierId === c.id);
              const cl = clients.find((x) => x.id === c.clientId);
              return (
                <div key={c.id} className="flex min-h-[60px] items-center gap-3 border-b border-line px-4 py-2 last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-medium">{cl?.name ?? c.name}</div>
                    <div className="truncate text-[12px] text-ink-3">{req ? `Demandé ${relative(req.sentAt)}${req.opened ? ' · lien ouvert' : ''}` : `${c.name.split('·')[1]?.trim() ?? c.name} · fin ${dateShort(c.endDate)}`}</div>
                  </div>
                  {req ? <Badge tone="ok">Envoyée</Badge> : <Button size="sm" icon={<Send className="h-3.5 w-3.5" />} loading={sending === c.id} onClick={() => request(c.id, c.clientId)}>Demander</Button>}
                </div>
              );
            })}
          </Card>

        </div>
      </div>
    </div>
  );
}
