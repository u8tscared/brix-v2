import { useState } from 'react';
import { CalendarCheck, Check, Copy, Link2, MessageSquare, QrCode } from 'lucide-react';
import { Badge, Button, Card, CardHeader, cn, PageHeader, Select, Switch, toast } from '@/components/ui';
import { capitalize, dateLong, todayISO } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { BookingPreview } from './components/BookingPreview';
import { useVendre } from './store';

const DAYS = [1, 2, 3, 4, 5, 6, 0];
const DAY_LABEL = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const AGENDAS = [
  { name: 'Google Agenda', sub: 'Gmail, Android' },
  { name: 'Outlook', sub: 'Microsoft 365' },
  { name: 'Agenda Apple', sub: 'iPhone, iCloud' },
];
const HOURS = Array.from({ length: 27 }, (_, i) => `${String(6 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`);

export default function RendezVous() {
  const rdv = useVendre((v) => v.rdv);
  const setRdv = useVendre((v) => v.setRdv);
  const events = useBrix((s) => s.events);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const link = `brix.fr/rdv/${rdv.slug}`;
  const upcoming = events.filter((e) => e.kind === 'rdv' && e.date >= todayISO()).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)).slice(0, 5);

  const copy = () => {
    navigator.clipboard?.writeText('https://' + link).catch(() => {});
    toast('Lien copié : collez-le dans vos SMS, votre fiche Google ou votre site');
  };
  const connect = (name: string) => {
    if (rdv.agenda === name) {
      setRdv({ agenda: null });
      return toast(`${name} déconnecté`, 'info');
    }
    setConnecting(name);
    setTimeout(() => {
      setRdv({ agenda: name });
      setConnecting(null);
      toast(`${name} relié : vos indisponibilités sont bloquées (démo)`);
    }, 1100);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Rendez-vous en ligne" subtitle="Vos clients réservent une visite tout seuls, uniquement sur vos créneaux libres." actions={<Button className="xl:hidden" icon={<CalendarCheck className="h-4 w-4" />} onClick={() => setPreview((v) => !v)}>{preview ? 'Masquer l\'aperçu' : 'Voir la page client'}</Button>} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-4">
          <Card className="overflow-hidden">
            <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:p-5">
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-medium text-ink-3">Votre lien de réservation</div>
                <div className="mt-1 flex items-center gap-2">
                  <Link2 className="h-4 w-4 shrink-0 text-ink-3" />
                  <span className="truncate font-display text-[18px] font-semibold md:text-[20px]">{link}</span>
                </div>
                <div className="mt-1 text-[12.5px] text-ink-2"><b className="num text-ink">{rdv.bookings}</b> visites réservées en ligne ce mois-ci, sans un seul coup de fil.</div>
              </div>
              <div className="grid grid-cols-3 gap-2 md:flex">
                <Button variant="dawn" icon={<Copy className="h-4 w-4" />} onClick={copy} className="col-span-3 justify-center md:col-span-1">Copier le lien</Button>
                <Button icon={<MessageSquare className="h-4 w-4" />} className="col-span-2 justify-center md:col-span-1" onClick={() => toast('Modèle de SMS copié avec votre lien')}>Par SMS</Button>
                <Button icon={<QrCode className="h-4 w-4" />} className="justify-center" onClick={() => toast('QR code prêt à imprimer sur votre camion (démo)')}>QR</Button>
              </div>
            </div>
          </Card>

          {preview && <div className="xl:hidden"><BookingPreview /></div>}

          <Card>
            <CardHeader title="Types de visite" meta="ce que le client peut réserver" />
            {rdv.types.map((t) => (
              <div key={t.id} className="flex min-h-[60px] items-center gap-3 border-b border-line px-4 py-2 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <div className={cn('text-[13.5px] font-medium', !t.on && 'text-ink-3')}>{t.label}</div>
                  <div className="text-[12px] text-ink-3">{t.price}</div>
                </div>
                <div className="w-[108px] shrink-0">
                  <Select value={t.minutes} onChange={(e) => setRdv({ types: rdv.types.map((x) => (x.id === t.id ? { ...x, minutes: Number(e.target.value) } : x)) })} aria-label="Durée">
                    {[30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}
                  </Select>
                </div>
                <Switch checked={t.on} onChange={(on) => setRdv({ types: rdv.types.map((x) => (x.id === t.id ? { ...x, on } : x)) })} label={t.label} />
              </div>
            ))}
          </Card>

          <Card>
            <CardHeader title="Quand peut-on réserver ?" />
            <div className="space-y-4 p-4">
              <div className="grid max-w-md grid-cols-7 gap-1.5">
                {DAYS.map((d) => {
                  const on = rdv.days.includes(d);
                  return (
                    <button key={d} onClick={() => setRdv({ days: on ? rdv.days.filter((x) => x !== d) : [...rdv.days, d] })} className={cn('h-11 w-full rounded-xl border text-[13px] font-medium transition', on ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-2')}>
                      {DAY_LABEL[d]}
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <label className="block"><span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">De</span><Select value={rdv.from} onChange={(e) => setRdv({ from: e.target.value })}>{HOURS.map((h) => <option key={h}>{h}</option>)}</Select></label>
                <label className="block"><span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">À</span><Select value={rdv.to} onChange={(e) => setRdv({ to: e.target.value })}>{HOURS.map((h) => <option key={h}>{h}</option>)}</Select></label>
                <label className="block"><span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">Prévenir au moins</span><Select value={rdv.minNotice} onChange={(e) => setRdv({ minNotice: Number(e.target.value) })}>{[[4, '4 h avant'], [24, 'la veille'], [48, '2 jours avant'], [72, '3 jours avant']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></label>
                <label className="block"><span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">Trajet entre 2 visites</span><Select value={rdv.buffer} onChange={(e) => setRdv({ buffer: Number(e.target.value) })}>{[15, 30, 45, 60].map((v) => <option key={v} value={v}>{v} min</option>)}</Select></label>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Agenda relié" meta="pour ne jamais être réservé deux fois" />
              {AGENDAS.map((a) => {
                const on = rdv.agenda === a.name;
                return (
                  <div key={a.name} className="flex min-h-[58px] items-center gap-3 border-b border-line px-4 last:border-b-0">
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-medium">{a.name}</div>
                      <div className="text-[12px] text-ink-3">{on ? 'Synchronisé il y a 2 min' : a.sub}</div>
                    </div>
                    {on ? <Badge tone="ok" icon={<Check />}>Relié</Badge> : null}
                    <Button size="sm" variant={on ? 'ghost' : 'secondary'} loading={connecting === a.name} onClick={() => connect(a.name)}>{on ? 'Retirer' : 'Relier'}</Button>
                  </div>
                );
              })}
            </Card>
            <Card>
              <CardHeader title="Prochaines visites" meta={`${upcoming.length}`} />
              {upcoming.map((e) => (
                <div key={e.id} className="flex min-h-[58px] items-center gap-3 border-b border-line px-4 last:border-b-0">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sub text-center leading-none">
                    <span className="num text-[14px] font-semibold">{new Date(e.date + 'T12:00').getDate()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-medium">{e.title}</div>
                    <div className="text-[12px] text-ink-3">{capitalize(dateLong(e.date))} · {e.start.replace(':', ' h ')}</div>
                  </div>
                </div>
              ))}
              {!upcoming.length && <div className="px-4 py-8 text-center text-[13px] text-ink-3">Aucune visite prévue.</div>}
            </Card>
          </div>
        </div>

        <div className="hidden xl:block">
          <div className="sticky top-6">
            <div className="mb-3 flex items-center gap-2 text-[12.5px] font-medium text-ink-2">Ce que voit votre client <Badge tone="violet">Aperçu cliquable</Badge></div>
            <BookingPreview />
          </div>
        </div>
      </div>
    </div>
  );
}
