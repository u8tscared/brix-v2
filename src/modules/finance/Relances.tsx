import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BellRing, CheckCircle2, Mail, MessageSquareText, Stamp } from 'lucide-react';
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader, cn, toast } from '@/components/ui';
import { dateShort, daysBetween, money, todayISO } from '@/lib/format';
import { useBrix } from '@/lib/store';
import type { Facture } from '@/lib/types';
import { ReminderSheet } from '@/modules/factures/components/ReminderSheet';
import { saveFacture } from '@/modules/factures/lib/actions';
import { amounts, daysLate, liveStatus } from '@/modules/factures/lib/model';
import { reminderText, sendReminder } from '@/modules/factures/service';
import { allPayments, useFactures } from '@/modules/factures/store';
import { ScenarioCard } from './components/relances/Scenario';

const CH = { email: { icon: <Mail className="h-4 w-4" />, label: 'Mail' }, sms: { icon: <MessageSquareText className="h-4 w-4" />, label: 'SMS' }, courrier: { icon: <Stamp className="h-4 w-4" />, label: 'Mise en demeure' } };

export default function Relances() {
  const s = useBrix();
  const fx = useFactures();
  const [target, setTarget] = useState<Facture | null>(null);
  const [bulk, setBulk] = useState(false);
  const today = todayISO();
  const month = today.slice(0, 7);

  const live = s.factures.filter((f) => f.status !== 'brouillon' && f.status !== 'annulee' && f.kind !== 'avoir');
  const late = live.filter((f) => liveStatus(f) === 'en_retard').sort((a, b) => daysLate(b) - daysLate(a));
  const soon = live.filter((f) => liveStatus(f) !== 'en_retard' && amounts(f).remaining > 0 && daysBetween(today, f.dueDate) <= 7);
  const lateSum = late.reduce((t, f) => t + amounts(f).remaining, 0);
  const sentThisMonth = fx.reminders.filter((r) => r.at.startsWith(month)).length;
  const reminded = new Set(fx.reminders.map((r) => r.factureId));
  const recovered = allPayments(s.factures, fx.payments).filter((p) => p.date.startsWith(month) && reminded.has(p.factureId)).reduce((t, p) => t + p.amount, 0);
  const avgLate = late.length ? Math.round(late.reduce((t, f) => t + daysLate(f), 0) / late.length) : 0;

  /** Étape suivante du scénario pour une facture en retard. */
  const nextStep = (f: Facture) => {
    const steps = fx.steps.filter((x) => x.enabled);
    const st = steps[Math.min(f.remindersSent, steps.length - 1)];
    if (!st) return 'Aucune relance prévue';
    if (f.remindersSent >= steps.length) return 'Scénario terminé : à vous de jouer';
    const inDays = st.day - daysLate(f);
    return inDays <= 0 ? `${st.label} : aujourd’hui` : `${st.label} dans ${inDays} jour${inDays > 1 ? 's' : ''}`;
  };

  const remindAll = async () => {
    setBulk(true);
    for (const f of late) {
      const level = (Math.min(2, f.remindersSent) + 1) as 1 | 2 | 3;
      if (level === 3) continue; // la mise en demeure se valide à la main
      const client = s.clients.find((c) => c.id === f.clientId);
      await sendReminder(f, level === 1 ? 'email' : 'sms');
      fx.addReminder({ factureId: f.id, channel: level === 1 ? 'email' : 'sms', level, by: 'bob', text: reminderText(f, client, s.company, level, fx.relanceTone, s.user.firstName) });
      saveFacture({ ...f, remindersSent: f.remindersSent + 1 });
    }
    setBulk(false);
    toast('Relances envoyées, Bob suit les réponses');
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Relances"
        subtitle="Bob relance pour vous, poliment et au bon moment. Vous gardez la main."
        actions={
          late.length > 0 && (
            <Button variant="dawn" loading={bulk} icon={<BellRing className="h-4 w-4" />} onClick={remindAll} className="w-full sm:w-auto">
              Relancer les {late.length} retards
            </Button>
          )
        }
      />

      <Card className="grid grid-cols-2 lg:grid-cols-4 [&>*]:border-line max-lg:[&>*:nth-child(-n+2)]:border-b [&>*:nth-child(odd)]:border-r lg:[&>*:not(:last-child)]:border-r">
        <Kpi label="En retard" value={money(lateSum, true)} sub={`${late.length} facture${late.length > 1 ? 's' : ''}`} bad={late.length > 0} />
        <Kpi label="Retard moyen" value={`${avgLate} jours`} sub="après l’échéance" />
        <Kpi label="Relances ce mois" value={String(sentThisMonth)} sub={`${fx.reminders.filter((r) => r.by === 'bob' && r.at.startsWith(month)).length} par Bob`} />
        <Kpi label="Récupéré après relance" value={money(recovered, true)} sub="ce mois-ci" />
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Factures en retard" meta={late.length ? 'les plus anciennes d’abord' : undefined} />
            {late.length === 0 ? (
              <EmptyState className="m-4" icon={<CheckCircle2 />} title="Aucun retard" text="Tous vos clients sont à jour. Bravo." />
            ) : (
              <ul className="divide-y divide-line">
                {late.map((f) => {
                  const client = s.clients.find((c) => c.id === f.clientId);
                  const dl = daysLate(f);
                  return (
                    <li key={f.id} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center">
                      <Link to={`/app/factures/${f.id}`} className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-[14px] font-medium">{client?.name}</span>
                          <Badge tone={dl >= 15 ? 'bad' : 'warn'}>{dl} j de retard</Badge>
                        </div>
                        <div className="truncate text-[12.5px] text-ink-2">
                          {f.number} · {f.title}
                        </div>
                        <div className="mt-1 text-[12px] text-ink-3">
                          {f.remindersSent} relance{f.remindersSent > 1 ? 's' : ''} · {fx.relanceAuto ? nextStep(f) : 'relance automatique coupée'}
                        </div>
                      </Link>
                      <div className="flex items-center gap-3">
                        <span className="num flex-1 text-[16px] font-semibold sm:text-right">{money(amounts(f).remaining)}</span>
                        <Button variant="primary" icon={<BellRing className="h-4 w-4" />} onClick={() => setTarget(f)} className="h-11 sm:h-10">
                          Relancer maintenant
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {soon.length > 0 && (
            <Card>
              <CardHeader title="Bientôt à échéance" meta="dans les 7 prochains jours" />
              <ul className="divide-y divide-line">
                {soon.map((f) => (
                  <li key={f.id}>
                    <Link to={`/app/factures/${f.id}`} className="flex min-h-[56px] items-center gap-3 px-4 py-2.5 hover:bg-[#fafafc]">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] font-medium">{s.clients.find((c) => c.id === f.clientId)?.name}</div>
                        <div className="text-[12px] text-ink-3">{f.number} · échéance {dateShort(f.dueDate)}</div>
                      </div>
                      <span className="num text-[14px] font-semibold">{money(amounts(f).remaining)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <CardHeader title="Historique" meta={`${fx.reminders.length} relance${fx.reminders.length > 1 ? 's' : ''}`} />
            {fx.reminders.length === 0 ? (
              <p className="p-4 text-[13px] text-ink-3">Aucune relance envoyée pour l’instant.</p>
            ) : (
              <ul className="divide-y divide-line">
                {fx.reminders.slice(0, 12).map((r) => {
                  const f = s.factures.find((x) => x.id === r.factureId);
                  const paid = f && liveStatus(f) === 'payee';
                  return (
                    <li key={r.id} className="flex gap-3 px-4 py-3">
                      <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg', r.by === 'bob' ? 'bg-ink text-white' : 'bg-sub text-ink-2')}>{CH[r.channel].icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 text-[13px]">
                          <span className="font-medium">{CH[r.channel].label} à {s.clients.find((c) => c.id === f?.clientId)?.name}</span>
                          {paid && <Badge tone="ok">Payée depuis</Badge>}
                        </div>
                        <div className="text-[12px] text-ink-3">
                          {r.by === 'bob' ? 'Envoyée par Bob' : 'Envoyée par vous'} · {dateShort(r.at.slice(0, 10))} à {r.at.slice(11, 16)} · {f?.number}
                        </div>
                        <p className="mt-1 line-clamp-2 text-[12.5px] text-ink-2">{r.text}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
        <div>
          <ScenarioCard sample={late[0]} />
        </div>
      </div>

      {target && <ReminderSheet f={s.factures.find((x) => x.id === target.id) ?? target} open={!!target} onClose={() => setTarget(null)} />}
    </div>
  );
}

function Kpi({ label, value, sub, bad }: { label: string; value: string; sub: string; bad?: boolean }) {
  return (
    <div className="min-w-0 p-4">
      <div className="text-xs font-medium text-ink-2">{label}</div>
      <div className={cn('num mt-1.5 truncate text-[22px] font-semibold leading-tight tracking-[-0.02em]', bad && 'text-bad')}>{value}</div>
      <div className="mt-1 truncate text-xs text-ink-2">{sub}</div>
    </div>
  );
}
