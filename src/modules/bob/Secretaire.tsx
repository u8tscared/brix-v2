import { useMemo, useState } from 'react';
import { ChevronDown, Copy, Phone, Volume2 } from 'lucide-react';
import { AnimatedNumber, LiveDot, SuccessDot } from '@/components/motion';
import { Badge, Button, Card, CardHeader, Field, Icon, IconTile, Input, PageHeader, Select, Switch, Textarea, cn, toast } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { todayISO, uid } from '@/lib/format';
import { useBobLocal } from './store';
import { BOB_LINE, callsFor, type MissedCall } from './secretaryData';
import { speak } from './useSpeech';
import { BobNav } from './components/BobNav';
import { Toggle } from './components/SettingToggle';

const URG: Record<MissedCall['urgency'], { label: string; tone: 'bad' | 'neutral' | 'info' }> = {
  urgent: { label: 'Urgent', tone: 'bad' },
  normal: { label: 'À rappeler', tone: 'info' },
  info: { label: 'Sans suite', tone: 'neutral' },
};

export default function Secretaire() {
  const { secretary: sec, setSecretary, callsDone, markCall } = useBobLocal();
  const upsertLead = useBrix((s) => s.upsertLead);
  const trade = useBrix((s) => s.company.trade);
  const company = useBrix((s) => s.company.name);
  const boss = useBrix((s) => s.user.firstName);
  const DEMO_CALLS = useMemo(() => callsFor(trade, company, boss), [trade, company, boss]);
  const [open, setOpen] = useState<string | null>('call1');
  const [leads, setLeads] = useState<Record<string, boolean>>({});
  const todo = DEMO_CALLS.filter((c) => c.urgency !== 'info' && !callsDone[c.id]).length;
  const forwardCode = `**61*${BOB_LINE.replace(/\s/g, '')}**${sec.forwardAfter * 5}#`;

  const createLead = (c: MissedCall) => {
    if (!c.lead) return;
    upsertLead({ id: uid('ld'), name: c.name, phone: c.phone, city: c.lead.city, request: c.lead.request, source: 'telephone', receivedAt: todayISO(), status: c.urgency === 'urgent' ? 'nouveau' : 'rdv', estimate: c.lead.estimate, score: c.urgency === 'urgent' ? 90 : 78 });
    setLeads((l) => ({ ...l, [c.id]: true }));
    toast('Demande ajoutée à ta boîte de réception.');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<IconTile name="PhoneCall" tone="blue" size="lg" />}
        kicker="Bob"
        title="Secrétaire téléphonique"
        subtitle="Quand tu ne peux pas décrocher, Bob répond, comprend la demande et prend les rendez-vous."
        actions={
          <span className={cn('inline-flex h-10 items-center gap-2 rounded-full px-3.5 text-[13px] font-medium', sec.enabled ? 'glass text-ink' : 'bg-halo-track text-ink-3')}>
            {sec.enabled ? <LiveDot /> : <span className="h-2 w-2 rounded-full bg-ink-3" />}
            {sec.enabled ? <>Bob décroche au <span className="num">{BOB_LINE}</span></> : 'Secrétaire coupée'}
          </span>
        }
      />
      <BobNav />

      <div className="grid gap-5 [&>*]:min-w-0 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <Card className="grid grid-cols-3 divide-x divide-halo-line">
            <Kpi label="Appels traités" value={23} sub="ce mois" />
            <Kpi label="Rendez-vous pris" value={7} sub="sans toi" />
            <Kpi label="À rappeler" value={todo} sub={todo ? 'maintenant' : 'tout est fait'} strong={todo > 0} />
          </Card>

          <Card>
            <CardHeader title="Appels manqués" meta="transcrits et résumés par Bob" />
            {DEMO_CALLS.map((c) => {
              const isOpen = open === c.id;
              const done = callsDone[c.id];
              return (
                <div key={c.id} className="border-b border-halo-line last:border-b-0">
                  <button onClick={() => setOpen(isOpen ? null : c.id)} className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-halo-hover">
                    <span className={cn('relative mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors', done ? 'bg-ok-bg text-ok' : c.urgency === 'urgent' ? 'bg-pale-r text-deep-r' : 'bg-pale-b text-deep-b')}>
                      {done ? <SuccessDot size={20} /> : <Phone className="h-4 w-4" strokeWidth={1.75} />}
                      {!done && c.urgency === 'urgent' && <span className="absolute inset-0 animate-ping2 rounded-full ring-2 ring-[#ef444466]" aria-hidden />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn('text-[13.5px] font-semibold', done && 'text-ink-3')}>{c.name}</span>
                        <Badge tone={done ? 'ok' : URG[c.urgency].tone}>{done ? 'Traité' : URG[c.urgency].label}</Badge>
                      </div>
                      <div className="mt-0.5 text-[13px] leading-snug text-ink-2">{c.summary}</div>
                      <div className="mt-1.5 flex items-center gap-1.5 text-[12px] font-medium text-ink">
                        <Icon name={c.outcomeIcon} className="h-3.5 w-3.5 text-ink-3" /> {c.outcome}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[12px] text-ink-3">{c.when}</div>
                      <div className="num text-[12px] text-ink-3">{c.time.replace(':', ' h ')}</div>
                      <ChevronDown className={cn('ml-auto mt-1 h-4 w-4 text-ink-3 transition', isOpen && 'rotate-180')} />
                    </div>
                  </button>
                  {isOpen && (
                    <div className="animate-fade-up space-y-3 px-4 pb-4 sm:pl-16">
                      <div className="rounded-card-sm bg-halo-hover p-3">
                        <div className="mb-2 text-[11.5px] font-medium text-ink-3">Transcription · {c.duration}</div>
                        <div className="space-y-2">
                          <div className="stagger-fast space-y-2">
                          {c.transcript.map((t, i) => (
                            <div key={i} className={cn('flex', t.who === 'client' && 'justify-end')}>
                              <div className={cn('max-w-[88%] rounded-[16px] px-3 py-2 text-[13px] leading-snug', t.who === 'bob' ? 'bg-white text-ink shadow-halo-sm' : 'bg-ink text-white')}>
                                {t.text}
                              </div>
                            </div>
                          ))}
                        </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {c.phone !== 'Masqué' && (
                          <a href={`tel:${c.phone.replace(/\s/g, '')}`} className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-white shadow-ink">
                            <Phone className="h-4 w-4" /> Rappeler
                          </a>
                        )}
                        {c.lead && <Button disabled={leads[c.id]} onClick={() => createLead(c)}>{leads[c.id] ? 'Demande créée' : 'Créer la demande'}</Button>}
                        <Button variant="ghost" onClick={() => { markCall(c.id, !done); if (!done) toast('Appel traité.', 'ok', { label: 'Annuler', run: () => markCall(c.id, false) }); }}>{done ? 'Remettre à traiter' : 'Marquer comme traité'}</Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold">Bob répond à ta place</div>
                <div className="text-[12.5px] text-ink-2">{sec.enabled ? 'Actif : aucun appel perdu.' : 'Coupé : les appels vont sur ta messagerie.'}</div>
              </div>
              <Switch checked={sec.enabled} onChange={(v) => setSecretary({ enabled: v })} label="Activer la secrétaire" />
            </div>
            <div className="mt-4 space-y-3">
              <Field label="Message d’accueil" hint="Bob le dit avec une voix naturelle, puis écoute la demande.">
                <Textarea value={sec.greeting} onChange={(e) => setSecretary({ greeting: e.target.value })} className="min-h-[110px]" />
              </Field>
              <Button size="sm" variant="secondary" icon={<Volume2 className="h-4 w-4" />} onClick={() => speak(sec.greeting) || toast('La lecture audio n’est pas disponible sur ce navigateur.', 'info')}>Écouter</Button>
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-[14px] font-semibold">Horaires</div>
            <p className="text-[12.5px] text-ink-2">En dehors, Bob prend un message et propose un créneau.</p>
            <div className="mt-3 grid grid-cols-2 items-end gap-2">
              <Field label="Jours" className="col-span-2">
                <Select value={sec.hours.days} onChange={(e) => setSecretary({ hours: { ...sec.hours, days: e.target.value } })}>
                  {['Du lundi au vendredi', 'Du lundi au samedi', 'Tous les jours'].map((d) => <option key={d}>{d}</option>)}
                </Select>
              </Field>
              <Field label="De"><Input type="time" value={sec.hours.from} onChange={(e) => setSecretary({ hours: { ...sec.hours, from: e.target.value } })} /></Field>
              <Field label="À"><Input type="time" value={sec.hours.to} onChange={(e) => setSecretary({ hours: { ...sec.hours, to: e.target.value } })} /></Field>
            </div>
            <div className="mt-4">
              <Toggle label="Urgence : me prévenir par SMS" hint="Panne, fuite, plus de courant : tu le sais tout de suite." checked={sec.urgentToSms} onChange={(v) => setSecretary({ urgentToSms: v })} />
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-[14px] font-semibold">Renvoi d’appel</div>
            <p className="text-[12.5px] text-ink-2">Ton numéro ne change pas : si tu ne décroches pas, l’appel bascule sur la ligne de Bob.</p>
            <div className="mt-3 space-y-3">
              <Field label="Ton numéro professionnel">
                <Input value={sec.forwardNumber} onChange={(e) => setSecretary({ forwardNumber: e.target.value })} placeholder="06 12 45 78 90" inputMode="tel" />
              </Field>
              <Field label="Basculer après">
                <Select value={sec.forwardAfter} onChange={(e) => setSecretary({ forwardAfter: Number(e.target.value) })}>
                  {[2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} sonneries (environ {n * 5} secondes)</option>)}
                </Select>
              </Field>
              <div className="rounded-card-sm bg-halo-hover p-3">
                <div className="text-[12px] text-ink-2">Sur ton portable, compose ce code puis appuie sur Appeler :</div>
                <div className="mt-1 flex items-center gap-2">
                  <code className="num min-w-0 flex-1 truncate font-mono text-[15px] font-semibold">{forwardCode}</code>
                  <button onClick={() => { navigator.clipboard?.writeText(forwardCode).then(() => toast('Code copié.'), () => toast('Copie impossible : recopiez le code à la main.', 'info')); }} className="grid h-10 w-10 place-items-center rounded-lg text-ink-2 hover:bg-white" aria-label="Copier le code"><Copy className="h-4 w-4" /></button>
                </div>
              </div>
              <Button className="w-full justify-center" disabled={!sec.forwardNumber.trim()} onClick={() => toast(`Appel test lancé vers ${sec.forwardNumber} (simulé en démo).`, 'info')}>
                Tester avec un appel
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, strong }: { label: string; value: number; sub: string; strong?: boolean }) {
  return (
    <div className="p-4">
      <div className="text-[12px] font-medium text-ink-2">{label}</div>
      <div className={cn('num mt-1 font-display text-[24px] font-semibold leading-none', strong && 'dawn-text')}><AnimatedNumber value={value} /></div>
      <div className="mt-1 text-[11.5px] text-ink-3">{sub}</div>
    </div>
  );
}
