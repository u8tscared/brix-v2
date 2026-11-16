import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronLeft, DoorOpen, FileText, Minus, Plus, RotateCcw, Square } from 'lucide-react';
import { Button, Card, CardHeader, EmptyState, Field, Input, PageHeader, Select, Sheet, cn, toast } from '@/components/ui';
import { useMediaQuery } from '@/components/layout/useMediaQuery';
import { useBrix } from '@/lib/store';
import { TRADE_BY_KEY } from '@/lib/catalog';
import { money, todayISO, totals, uid } from '@/lib/format';
import { ROOM_TYPES, buildLines, m2, measures, ml, type Room, type RoomType } from './components/cotes/compute';
import { RoomSketch, type Focus } from './components/cotes/RoomSketch';
import { MeasureInput } from './components/cotes/MeasureInput';

type Step = 'type' | 'L' | 'W' | 'H' | 'ouvertures' | 'recap';
const FLOW: Step[] = ['L', 'W', 'H', 'ouvertures', 'recap'];
const KEY = 'brix-v2-cotes';

const INSTR: Record<Exclude<Step, 'type' | 'recap'>, [string, string]> = {
  L: ['Mesurez la longueur', 'Le mur le plus long, d’un angle à l’autre, au ras du sol.'],
  W: ['Puis la largeur', 'Le mur d’à côté, toujours d’un angle à l’autre.'],
  H: ['Puis la hauteur', 'Du sol fini jusqu’au plafond.'],
  ouvertures: ['Portes et fenêtres', 'Leurs surfaces sont déduites des murs automatiquement.'],
};

const load = (): { rooms: Room[]; current?: string } => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '') as { rooms: Room[]; current?: string };
  } catch {
    return { rooms: [] };
  }
};

function Stepper({ label, value, onChange, icon }: { label: string; value: number; onChange: (v: number) => void; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-sub text-ink-2">{icon}</span>
      <span className="flex-1 text-[15px] font-medium">{label}</span>
      <Button size="icon" onClick={() => onChange(Math.max(0, value - 1))} aria-label={`Moins de ${label.toLowerCase()}`} className="h-12 w-12"><Minus className="h-5 w-5" /></Button>
      <span className="num w-8 text-center text-[22px] font-semibold">{value}</span>
      <Button size="icon" onClick={() => onChange(value + 1)} aria-label={`Plus de ${label.toLowerCase()}`} className="h-12 w-12"><Plus className="h-5 w-5" /></Button>
    </div>
  );
}

export default function Cotes() {
  const navigate = useNavigate();
  const isMobile = !useMediaQuery('(min-width: 768px)');
  const { company, clients, upsertDevis, nextNumber } = useBrix();
  const [rooms, setRooms] = useState<Room[]>(() => load().rooms);
  const [current, setCurrent] = useState<string | undefined>(() => load().current);
  const [step, setStep] = useState<Step>(() => (load().rooms.length ? 'recap' : 'type'));
  const [creating, setCreating] = useState(false);
  const [clientId, setClientId] = useState('');
  const [title, setTitle] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ rooms, current }));
    } catch {
      /* stockage indisponible */
    }
  }, [rooms, current]);

  const room = rooms.find((r) => r.id === current);
  const update = (patch: Partial<Room>) => room && setRooms((rs) => rs.map((r) => (r.id === room.id ? { ...r, ...patch } : r)));
  const next = () => setStep((s) => FLOW[Math.min(FLOW.length - 1, FLOW.indexOf(s) + 1)]);
  const back = () => setStep((s) => (FLOW.indexOf(s) <= 0 ? 'type' : FLOW[FLOW.indexOf(s) - 1]));

  const addRoom = (type: RoomType) => {
    const label = ROOM_TYPES.find((t) => t.key === type)!.label;
    const same = rooms.filter((r) => r.type === type).length;
    const r: Room = { id: uid('room'), type, name: same ? `${label} ${same + 1}` : label, doors: type === 'wc' || type === 'sdb' ? 1 : 1, windows: type === 'wc' || type === 'couloir' || type === 'entree' ? 0 : 1, H: rooms[rooms.length - 1]?.H };
    setRooms((rs) => [...rs, r]);
    setCurrent(r.id);
    setStep('L');
  };

  const simulate = useMemo(() => {
    const vals: Record<string, string[]> = { L: ['4 mètres 20', '3 mètres 85', '5 mètres 10', '3 mètres 40'], W: ['3 mètres 15', '2 mètres 90', '3 mètres 60'], H: ['2 mètres 50', '2 mètres 48', '2 mètres 55'] };
    return () => {
      const l = vals[step] ?? ['3 mètres'];
      return l[Math.floor(Math.random() * l.length)];
    };
  }, [step]);

  const done = rooms.filter((r) => r.L && r.W);
  const all = done.map(measures);
  const sum = (k: keyof ReturnType<typeof measures>) => all.reduce((s, m) => s + m[k], 0);
  const lines = useMemo(() => buildLines(done, company.trade, company.hourlyRate || 50, company.defaultVat || 10), [done, company]);
  const est = totals(lines);

  const openCreate = () => {
    setTitle(`${TRADE_BY_KEY[company.trade]?.name ?? 'Travaux'} · ${done.map((r) => r.name).join(', ')}`.slice(0, 80));
    setCreating(true);
  };
  const createDevis = () => {
    const id = uid('q');
    upsertDevis({ id, number: nextNumber('devis'), clientId, title: title.trim() || 'Travaux', status: 'brouillon', createdAt: todayISO(), validityDays: 30, depositPercent: 30, lines, notes: `Métrés issus de la prise de cotes : ${m2(sum('floor'))} au sol, ${m2(sum('wallsNet'))} de murs (ouvertures déduites).` });
    toast('Devis brouillon créé à partir des cotes');
    setCreating(false);
    navigate(`/app/devis/${id}`);
  };

  const focus: Focus = step === 'L' || step === 'W' || step === 'H' || step === 'ouvertures' ? step : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Prise de cotes"
        subtitle="Mesurez pièce par pièce : Brix calcule les surfaces et prépare le devis."
        actions={rooms.length > 0 && (
          <Button variant="ghost" icon={<RotateCcw className="h-4 w-4" />} onClick={() => { if (window.confirm('Effacer toutes les pièces mesurées ?')) { setRooms([]); setCurrent(undefined); setStep('type'); } }}>
            Recommencer
          </Button>
        )}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="overflow-hidden">
          {/* Pièces */}
          <div className="flex items-center gap-1.5 overflow-x-auto border-b border-line px-3 py-2.5 scrollbar-none">
            {rooms.map((r) => (
              <button key={r.id} onClick={() => { setCurrent(r.id); setStep(r.L && r.W && r.H ? 'recap' : !r.L ? 'L' : !r.W ? 'W' : 'H'); }} className={cn('flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] transition', r.id === current && step !== 'type' ? 'border-ink bg-ink text-white' : 'border-line2 bg-white text-ink-2 hover:text-ink')}>
                {r.L && r.W && r.H && <Check className="h-3.5 w-3.5" />} {r.name}
              </button>
            ))}
            <button onClick={() => setStep('type')} className={cn('flex h-9 shrink-0 items-center gap-1 rounded-full border border-dashed px-3 text-[13px] transition', step === 'type' ? 'border-vi-300 bg-vi-50 text-vi-700' : 'border-line2 text-ink-2 hover:text-ink')}>
              <Plus className="h-3.5 w-3.5" /> Pièce
            </button>
          </div>

          {step === 'type' || !room ? (
            <div className="p-4 md:p-6">
              <h2 className="text-[18px] font-semibold">Quelle pièce mesurez-vous ?</h2>
              <p className="mt-1 text-[13px] text-ink-2">Brix vous guide mur par mur. Comptez 30 secondes par pièce.</p>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ROOM_TYPES.map((t) => (
                  <button key={t.key} onClick={() => addRoom(t.key)} className="flex h-16 items-center justify-center rounded-2xl border border-line bg-white text-[15px] font-medium transition hover:border-ink active:scale-[.98]">
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="border-b border-line bg-[#fbfbfd] p-3 md:border-b-0 md:border-r md:p-5">
                <div className="mb-1 flex items-center justify-between text-[13px]">
                  <span className="font-semibold">{room.name}</span>
                  <span className="flex gap-1">
                    {FLOW.slice(0, 4).map((s) => (
                      <i key={s} className={cn('h-1.5 w-6 rounded-full', FLOW.indexOf(s) < FLOW.indexOf(step) ? 'bg-ink' : s === step ? 'bg-vi-500' : 'bg-line2')} />
                    ))}
                  </span>
                </div>
                <RoomSketch room={room} focus={focus} className={cn(isMobile && 'max-h-[190px]')} />
              </div>
              <div className="p-4 md:p-5">
                {step === 'recap' ? (
                  (() => {
                    const m = measures(room);
                    return (
                      <div className="space-y-4">
                        <h2 className="text-[18px] font-semibold">{room.name} : c’est mesuré</h2>
                        <dl className="divide-y divide-line rounded-xl border border-line text-[13.5px]">
                          {[
                            ['Sol', m2(m.floor)],
                            ['Plafond', m2(m.ceiling)],
                            ['Murs (bruts)', m2(m.wallsGross)],
                            ['Ouvertures déduites', `− ${m2(m.openings)}`],
                            ['Murs à traiter', m2(m.wallsNet)],
                            ['Périmètre', ml(m.perimeter)],
                            ['Plinthes (portes déduites)', ml(m.plinths)],
                          ].map(([k, v]) => (
                            <div key={k} className="flex justify-between px-3.5 py-2.5">
                              <dt className="text-ink-2">{k}</dt>
                              <dd className={cn('num font-medium', k === 'Murs à traiter' && 'font-semibold')}>{v}</dd>
                            </div>
                          ))}
                        </dl>
                        <div className="grid grid-cols-2 gap-2">
                          <Button size="lg" className="justify-center" onClick={() => setStep('L')}>Corriger</Button>
                          <Button size="lg" variant="primary" className="justify-center" icon={<Plus className="h-4 w-4" />} onClick={() => setStep('type')}>Pièce suivante</Button>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-start gap-2">
                      <button onClick={back} className="-ml-2 grid h-10 w-10 shrink-0 place-items-center rounded-lg text-ink-2 hover:bg-sub" aria-label="Étape précédente"><ChevronLeft className="h-5 w-5" /></button>
                      <div>
                        <h2 className="text-[20px] font-semibold leading-tight">{INSTR[step][0]}</h2>
                        <p className="mt-0.5 text-[13px] text-ink-2">{INSTR[step][1]}</p>
                      </div>
                    </div>
                    {step === 'ouvertures' ? (
                      <>
                        <Stepper label="Portes" value={room.doors} onChange={(doors) => update({ doors })} icon={<DoorOpen className="h-5 w-5" />} />
                        <Stepper label="Fenêtres" value={room.windows} onChange={(windows) => update({ windows })} icon={<Square className="h-5 w-5" />} />
                        <p className="text-xs text-ink-3">Tailles standard : porte 83 × 204 cm, fenêtre 120 × 135 cm.</p>
                        <Button variant="primary" size="lg" className="w-full justify-center" onClick={next}>Terminer la pièce</Button>
                      </>
                    ) : (
                      <MeasureInput key={room.id + step} initial={room[step]} isMobile={isMobile} simulate={simulate} onSubmit={(v) => { update({ [step]: v }); next(); }} />
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Métrés" meta={`${done.length} pièce${done.length > 1 ? 's' : ''}`} />
            {done.length === 0 ? (
              <EmptyState className="m-4 border-0 py-8" title="Rien de mesuré" text="Les surfaces s’additionnent ici au fil des pièces." />
            ) : (
              <>
                <div className="divide-y divide-line">
                  {done.map((r) => {
                    const m = measures(r);
                    return (
                      <div key={r.id} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
                        <span className="min-w-0 flex-1 truncate font-medium">{r.name}</span>
                        <span className="num text-ink-2">{m2(m.floor)}</span>
                        <span className="num w-[86px] text-right text-ink-2">{m2(m.wallsNet)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="grid grid-cols-2 gap-px border-t border-line bg-line">
                  {[
                    ['Sol', m2(sum('floor'))],
                    ['Murs nets', m2(sum('wallsNet'))],
                    ['Plafonds', m2(sum('ceiling'))],
                    ['Plinthes', ml(sum('plinths'))],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-white px-4 py-3">
                      <div className="text-xs text-ink-2">{k}</div>
                      <div className="num text-[16px] font-semibold">{v}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
          <Card className="p-4">
            <div className="text-xs text-ink-2">Devis estimé · {TRADE_BY_KEY[company.trade]?.name.toLowerCase()}</div>
            <div className="num mt-1 text-[26px] font-semibold tracking-[-0.02em]">{money(est.ht, true)} <span className="text-[14px] font-normal text-ink-3">HT</span></div>
            <div className="mt-0.5 text-xs text-ink-3">{lines.filter((l) => l.kind !== 'section').length} lignes calculées · marge {Math.round(est.marginRate)} %</div>
            <Button variant="dawn" size="lg" className="mt-4 w-full justify-center" icon={<FileText className="h-4 w-4" />} disabled={!done.length} onClick={openCreate}>
              Créer le devis
            </Button>
          </Card>
        </div>
      </div>

      <Sheet open={creating} onClose={() => setCreating(false)} title="Créer le devis" subtitle="Un brouillon que vous pourrez relire et ajuster." width={460} footer={<><Button variant="ghost" onClick={() => setCreating(false)}>Annuler</Button><Button variant="primary" disabled={!clientId} onClick={createDevis}>Créer et ouvrir</Button></>}>
        <div className="space-y-4">
          <Field label="Client">
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Choisir un client</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Titre du devis">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <div className="rounded-xl bg-sub px-4 py-3 text-[13px] text-ink-2">
            {done.length} pièce{done.length > 1 ? 's' : ''}, {lines.filter((l) => l.kind !== 'section').length} lignes, <b className="num text-ink">{money(est.ht)} HT</b>.
          </div>
        </div>
      </Sheet>
    </div>
  );
}
