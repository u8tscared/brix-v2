import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BellRing, Check, Mail, MessageSquareText, PenLine, Stamp } from 'lucide-react';
import { Avatar, Button, Card, CardHeader, EmptyState, IconTile, PageHeader, cn, toast } from '@/components/ui';
import { SuccessDot } from '@/components/motion';
import { dateShort, daysBetween, initials, money, todayISO } from '@/lib/format';
import { useBrix } from '@/lib/store';
import type { Facture } from '@/lib/types';
import { ReminderSheet } from '@/modules/factures/components/ReminderSheet';
import { saveFacture } from '@/modules/factures/lib/actions';
import { amounts, daysLate, liveStatus } from '@/modules/factures/lib/model';
import { reminderText, sendReminder } from '@/modules/factures/service';
import { allPayments, useFactures } from '@/modules/factures/store';
import { BigMoney, Label, SectionHead } from './components/kit';
import { ScenarioCard } from './components/relances/Scenario';
import { RelanceTimeline } from './components/relances/Timeline';

const CH = { email: { icon: Mail, label: 'Mail' }, sms: { icon: MessageSquareText, label: 'SMS' }, courrier: { icon: Stamp, label: 'Mise en demeure' } };

export default function Relances() {
  const s = useBrix();
  const fx = useFactures();
  const [target, setTarget] = useState<Facture | null>(null);
  const [bulk, setBulk] = useState(false);
  const [busy, setBusy] = useState<Record<string, 'sending' | 'sent'>>({});
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
    if (!steps.length) return 'Aucune relance prévue';
    if (f.remindersSent >= steps.length) return 'Scénario terminé : à vous de décider';
    const st = steps[f.remindersSent];
    const inDays = st.day - daysLate(f);
    return inDays <= 0 ? `Prochaine : ${st.label.toLowerCase()}, aujourd'hui` : `Prochaine : ${st.label.toLowerCase()} dans ${inDays} j`;
  };

  /** Relance au niveau suivant (mail puis SMS). La mise en demeure s'ouvre pour validation. */
  const remind = async (f: Facture) => {
    const level = (Math.min(2, f.remindersSent) + 1) as 1 | 2 | 3;
    if (level === 3) return setTarget(f);
    const channel = level === 1 ? 'email' : 'sms';
    setBusy((b) => ({ ...b, [f.id]: 'sending' }));
    const client = s.clients.find((c) => c.id === f.clientId);
    await sendReminder(f, channel);
    fx.addReminder({ factureId: f.id, channel, level, by: 'moi', text: reminderText(f, client, s.company, level, fx.relanceTone, s.user.firstName) });
    saveFacture({ ...f, remindersSent: f.remindersSent + 1 });
    setBusy((b) => ({ ...b, [f.id]: 'sent' }));
    toast(`${channel === 'email' ? 'Mail' : 'SMS'} envoyé à ${client?.name}`);
    setTimeout(() => setBusy((b) => { const n = { ...b }; delete n[f.id]; return n; }), 2400);
  };

  const remindAll = async () => {
    setBulk(true);
    let n = 0;
    for (const f of late) {
      const level = (Math.min(2, f.remindersSent) + 1) as 1 | 2 | 3;
      if (level === 3) continue; // la mise en demeure se valide à la main
      const client = s.clients.find((c) => c.id === f.clientId);
      setBusy((b) => ({ ...b, [f.id]: 'sending' }));
      await sendReminder(f, level === 1 ? 'email' : 'sms');
      fx.addReminder({ factureId: f.id, channel: level === 1 ? 'email' : 'sms', level, by: 'bob', text: reminderText(f, client, s.company, level, fx.relanceTone, s.user.firstName) });
      saveFacture({ ...f, remindersSent: f.remindersSent + 1 });
      setBusy((b) => ({ ...b, [f.id]: 'sent' }));
      n++;
    }
    setBulk(false);
    toast(n ? `${n} relance${n > 1 ? 's' : ''} envoyée${n > 1 ? 's' : ''}, Bob suit les réponses` : 'Les mises en demeure attendent votre validation', n ? 'ok' : 'info');
    setTimeout(() => setBusy({}), 2400);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<IconTile name="BellRing" dept="facturer" size="lg" />}
        title="Relances"
        subtitle="Bob relance pour vous, poliment et au bon moment. Vous gardez la main."
        actions={
          late.length > 0 && (
            <Button variant="dawn" loading={bulk} icon={<BellRing />} onClick={remindAll} className="w-full sm:w-auto">
              Relancer les {late.length} retards
            </Button>
          )
        }
      />

      <Card className="grid grid-cols-2 overflow-hidden md:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div className="col-span-2 p-5 md:col-span-1 md:p-6">
          <Label>En retard de paiement</Label>
          <BigMoney value={lateSum} className={cn('mt-3 block text-[40px] md:text-[44px]', late.length && 'text-bad')} />
          <div className="mt-2 text-[12.5px] text-ink-2">{late.length} facture{late.length > 1 ? 's' : ''} · {avgLate} j de retard en moyenne</div>
        </div>
        <Mini label="Relances ce mois" value={String(sentThisMonth)} sub={`dont ${fx.reminders.filter((r) => r.by === 'bob' && r.at.startsWith(month)).length} par Bob`} className="max-md:border-r" />
        <Mini label="Récupéré grâce aux relances" value={money(recovered, true)} sub="ce mois-ci" ok={recovered > 0} />
        <Mini label="À échéance cette semaine" value={String(soon.length)} sub={soon.length ? money(soon.reduce((t, f) => t + amounts(f).remaining, 0), true) : 'rien à signaler'} className="max-md:col-span-2" />
      </Card>

      <RelanceTimeline late={late} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <section className="space-y-3">
            <SectionHead title="Qui est en retard" meta={late.length ? 'les plus anciens d’abord' : undefined} />
            {late.length === 0 ? (
              <EmptyState icon={<Check />} title="Aucun retard" text="Tous vos clients sont à jour. Bravo." />
            ) : (
              <Card className="overflow-hidden">
                <ul className="stagger-fast">
                  {late.map((f) => {
                    const client = s.clients.find((c) => c.id === f.clientId);
                    const dl = daysLate(f);
                    const st = busy[f.id];
                    const level = Math.min(2, f.remindersSent) + 1;
                    return (
                      <li key={f.id} className="relative flex flex-col gap-3 border-b border-line px-4 py-4 last:border-b-0 sm:flex-row sm:items-center md:px-5">
                        <span aria-hidden className={cn('absolute inset-y-3 left-0 w-[3px] rounded-r-full', dl >= 15 ? 'bg-bad' : 'bg-[#f59e0b]')} />
                        <Link to={`/app/factures/${f.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                          <Avatar initials={initials(client?.name ?? '?')} size={38} color="#fff5e6" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="truncate text-[14px] font-medium">{client?.name}</span>
                              <span className="num shrink-0 text-[16px] font-semibold tracking-[-0.02em] sm:hidden">{money(amounts(f).remaining)}</span>
                            </div>
                            <div className="mt-0.5 truncate text-[12.5px]">
                              <span className={cn('font-medium', dl >= 15 ? 'text-bad' : 'text-warn')}>{dl} j de retard</span>
                              <span className="text-ink-3"> · {f.number} · {f.remindersSent} relance{f.remindersSent > 1 ? 's' : ''}</span>
                            </div>
                            <div className="mt-0.5 truncate text-[12px] text-ink-3">{fx.relanceAuto ? nextStep(f) : 'Relance automatique en pause'}</div>
                          </div>
                        </Link>
                        <span className="num hidden w-28 shrink-0 text-right text-[16px] font-semibold tracking-[-0.02em] sm:block">{money(amounts(f).remaining)}</span>
                        <div className="flex shrink-0 items-center gap-2 sm:w-[200px] sm:justify-end">
                          {st === 'sent' ? (
                            <span className="flex h-10 flex-1 items-center justify-center gap-2 text-[13px] font-medium text-ok sm:flex-none"><SuccessDot size={20} />Envoyée</span>
                          ) : (
                            <>
                              <Button size="icon-sm" variant="ghost" aria-label="Personnaliser le message" title="Personnaliser le message" onClick={() => setTarget(f)}><PenLine /></Button>
                              <Button size="sm" variant="primary" loading={st === 'sending'} icon={level === 3 ? <Stamp /> : level === 2 ? <MessageSquareText /> : <Mail />} onClick={() => remind(f)} className="flex-1 sm:flex-none">
                                {level === 3 ? 'Mise en demeure' : level === 2 ? 'Relancer par SMS' : 'Relancer par mail'}
                              </Button>
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            )}
          </section>

          {soon.length > 0 && (
            <Card>
              <CardHeader title="Bientôt à échéance" meta="dans les 7 jours" />
              <ul className="divide-y divide-line">
                {soon.map((f) => (
                  <li key={f.id}>
                    <Link to={`/app/factures/${f.id}`} className="flex min-h-[56px] items-center gap-3 px-4 py-2.5 transition hover:bg-[#faf9fd] md:px-5">
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

          <section className="space-y-3">
            <SectionHead title="Ce qui est parti" meta={`${fx.reminders.length} relance${fx.reminders.length > 1 ? 's' : ''}`} />
            {fx.reminders.length === 0 ? (
              <Card className="p-5 text-[13px] text-ink-3">Aucune relance envoyée pour l’instant.</Card>
            ) : (
              <Card className="px-4 py-2 md:px-5">
                <ol className="relative">
                  {fx.reminders.slice(0, 10).map((r, i, arr) => {
                    const f = s.factures.find((x) => x.id === r.factureId);
                    const paid = f && liveStatus(f) === 'payee';
                    const I = CH[r.channel].icon;
                    return (
                      <li key={r.id} className="relative flex gap-3 py-3">
                        {i < arr.length - 1 && <span aria-hidden className="absolute bottom-0 left-[15px] top-[44px] w-px bg-line" />}
                        <span className={cn('relative grid h-8 w-8 shrink-0 place-items-center rounded-full', r.by === 'bob' ? 'bg-night text-white' : 'bg-sub text-ink-2')}><I className="h-3.5 w-3.5" /></span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 text-[13px]">
                            <span className="font-medium">{CH[r.channel].label} à {s.clients.find((c) => c.id === f?.clientId)?.name}</span>
                            {paid && <span className="inline-flex items-center gap-1 text-[12px] font-medium text-ok"><Check className="h-3 w-3" />payée depuis</span>}
                          </div>
                          <div className="text-[12px] text-ink-3">
                            {r.by === 'bob' ? 'Par Bob' : 'Par vous'} · {dateShort(r.at.slice(0, 10))} à {r.at.slice(11, 16)} · {f?.number}
                          </div>
                          <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-ink-2">{r.text}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </Card>
            )}
          </section>
        </div>
        <div className="min-w-0">
          <div className="lg:sticky lg:top-20">
            <ScenarioCard sample={late[0]} />
          </div>
        </div>
      </div>

      {target && <ReminderSheet f={s.factures.find((x) => x.id === target.id) ?? target} open={!!target} onClose={() => setTarget(null)} />}
    </div>
  );
}

function Mini({ label, value, sub, ok, className }: { label: string; value: string; sub: string; ok?: boolean; className?: string }) {
  return (
    <div className={cn('min-w-0 border-line p-4 max-md:border-t md:border-l md:p-6', className)}>
      <Label>{label}</Label>
      <div className={cn('num mt-3 truncate text-[22px] font-semibold leading-none tracking-[-0.035em]', ok && 'text-ok')}>{value}</div>
      <div className="mt-2 truncate text-[12px] text-ink-3">{sub}</div>
    </div>
  );
}
