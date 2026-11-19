import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BellRing, CalendarClock, Check, Hourglass, Mail, MessageSquareText, PenLine, Send, Stamp, Wallet } from 'lucide-react';
import { Avatar, Button, Card, CardHeader, EmptyState, IconTile, PageHeader, cn, toast, type HaloTone } from '@/components/ui';
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
    toast(n ? `${n} relance${n > 1 ? 's' : ''} envoyée${n > 1 ? 's' : ''}, Brix AI suit les réponses` : 'Les mises en demeure attendent votre validation', n ? 'ok' : 'info');
    setTimeout(() => setBusy({}), 2400);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<IconTile name="BellRing" dept="facturer" size="lg" />}
        kicker="Facturer et encaisser"
        title="Relances"
        titleMuted={late.length ? 'poliment, au bon moment.' : 'tout le monde est à jour.'}
        subtitle="Brix AI relance pour vous, poliment et au bon moment. Vous gardez la main."
        actions={
          late.length > 0 && (
            <Button variant="dawn" loading={bulk} icon={<BellRing />} onClick={remindAll} className="w-full sm:w-auto">
              Relancer les {late.length} retards
            </Button>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
        <Card className="col-span-2 p-5 md:p-7 lg:col-span-1">
          <IconTile icon={<Hourglass />} tone={late.length ? 'rose' : 'green'} />
          <Label className="mt-4">En retard de paiement</Label>
          <BigMoney value={lateSum} className={cn('mt-1.5 block text-[40px] md:text-[48px]', late.length && 'text-deep-r')} />
          <div className="mt-2 text-[12.5px] text-ink-2">{late.length} facture{late.length > 1 ? 's' : ''} · {avgLate} j de retard en moyenne</div>
        </Card>
        <Mini icon={<Send />} tone="violet" label="Relances ce mois" value={String(sentThisMonth)} sub={`dont ${fx.reminders.filter((r) => r.by === 'bob' && r.at.startsWith(month)).length} par Brix AI`} />
        <Mini icon={<Wallet />} tone="green" label="Récupéré grâce aux relances" value={money(recovered, true)} sub="ce mois-ci" ok={recovered > 0} />
        <Mini icon={<CalendarClock />} tone="peach" label="À échéance cette semaine" value={String(soon.length)} sub={soon.length ? money(soon.reduce((t, f) => t + amounts(f).remaining, 0), true) : 'rien à signaler'} className="max-lg:col-span-2" />
      </div>

      <RelanceTimeline late={late} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <section className="space-y-3">
            <SectionHead title="Qui est en retard" meta={late.length ? 'les plus anciens d’abord' : undefined} />
            {late.length === 0 ? (
              <EmptyState icon={<Check />} title="Aucun retard" text="Tous vos clients sont à jour. Bravo." />
            ) : (
              <div>
                <ul className="stagger-fast space-y-2">
                  {late.map((f) => {
                    const client = s.clients.find((c) => c.id === f.clientId);
                    const dl = daysLate(f);
                    const st = busy[f.id];
                    const level = Math.min(2, f.remindersSent) + 1;
                    return (
                      <li key={f.id} className="lift-sm relative flex flex-col gap-3 rounded-card-sm bg-white px-4 py-4 shadow-halo-sm sm:flex-row sm:items-center md:px-5">
                        <Link to={`/app/factures/${f.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                          <Avatar initials={initials(client?.name ?? '?')} size={40} color={dl >= 15 ? '#fde9ee' : '#fff0e4'} fg={dl >= 15 ? '#c81e4a' : '#d4661b'} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="truncate text-[14px] font-medium">{client?.name}</span>
                              <span className="num-halo shrink-0 text-[18px] sm:hidden">{money(amounts(f).remaining)}</span>
                            </div>
                            <div className="mt-0.5 truncate text-[12.5px]">
                              <span className={cn('chip !h-[22px] !px-2 !text-[11.5px]', dl >= 15 ? 'tone-rose' : 'tone-amber')}>{dl} j de retard</span>
                              <span className="text-ink-3"> · {f.number} · {f.remindersSent} relance{f.remindersSent > 1 ? 's' : ''}</span>
                            </div>
                            <div className="mt-0.5 truncate text-[12px] text-ink-3">{fx.relanceAuto ? nextStep(f) : 'Relance automatique en pause'}</div>
                          </div>
                        </Link>
                        <span className="num-halo hidden w-28 shrink-0 text-right text-[19px] sm:block">{money(amounts(f).remaining)}</span>
                        <div className="flex shrink-0 items-center gap-2 sm:w-[200px] sm:justify-end">
                          {st === 'sent' ? (
                            <span className="flex h-10 flex-1 items-center justify-center gap-2 text-[13px] font-medium text-deep-g sm:flex-none" role="status"><SuccessDot size={24} />Envoyée</span>
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
              </div>
            )}
          </section>

          {soon.length > 0 && (
            <Card>
              <CardHeader title="Bientôt à échéance" meta="dans les 7 jours" />
              <ul className="divide-y divide-halo-line">
                {soon.map((f) => (
                  <li key={f.id}>
                    <Link to={`/app/factures/${f.id}`} className="flex min-h-[56px] items-center gap-3 px-4 py-2.5 transition hover:bg-halo-hover md:px-5">
                      <IconTile icon={<CalendarClock />} tone="peach" size="row" />
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
                        {i < arr.length - 1 && <span aria-hidden className="absolute bottom-0 left-[16px] top-[46px] w-px bg-halo-line" />}
                        <IconTile icon={<I />} tone={r.channel === 'email' ? 'blue' : r.channel === 'sms' ? 'violet' : 'rose'} size="sm" className="relative" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 text-[13px]">
                            <span className="font-medium">{CH[r.channel].label} à {s.clients.find((c) => c.id === f?.clientId)?.name}</span>
                            {paid && <span className="chip tone-green !h-[22px] !px-2 !text-[11.5px]"><Check className="!h-3 !w-3" />payée depuis</span>}
                          </div>
                          <div className="text-[12px] text-ink-3">
                            {r.by === 'bob' ? 'Par Brix AI' : 'Par vous'} · {dateShort(r.at.slice(0, 10))} à {r.at.slice(11, 16)} · {f?.number}
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

function Mini({ icon, tone, label, value, sub, ok, className }: { icon: React.ReactNode; tone: HaloTone; label: string; value: string; sub: string; ok?: boolean; className?: string }) {
  return (
    <Card className={cn('min-w-0 p-4 md:p-5', className)}>
      <IconTile icon={icon} tone={tone} size="sm" />
      <Label className="mt-3">{label}</Label>
      <div className={cn('num-halo mt-1.5 truncate text-[26px] leading-none', ok && 'text-deep-g')}>{value}</div>
      <div className="mt-2 truncate text-[12px] text-ink-3">{sub}</div>
    </Card>
  );
}
