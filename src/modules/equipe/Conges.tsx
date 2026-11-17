import { useMemo, useState } from 'react';
import { AlertTriangle, Check, Landmark, Palmtree, Plus, X } from 'lucide-react';
import { Avatar, Badge, Button, Card, CardHeader, cn, EmptyState, Field, IconTile, Input, PageHeader, Select, Sheet, Textarea, toast } from '@/components/ui';
import { GrowBar, SuccessDot } from '@/components/motion';
import { leaveCls, SectionHead, useLeaving } from '@/modules/finance/components/kit';
import { useBrix } from '@/lib/store';
import { dateShort, num, relative, todayISO } from '@/lib/format';
import type { Employee } from '@/lib/types';
import { useEquipe, type LeaveRequest, type LeaveType } from './store';
import { LeaveCalendar } from './components/LeaveCalendar';
import { LEAVE_TYPES, workingDays } from './components/leaveTypes';

const period = (l: LeaveRequest) => (l.from === l.to ? `le ${dateShort(l.from)}` : `du ${dateShort(l.from)} au ${dateShort(l.to)}`);

function NewLeaveSheet({ open, onClose, employees }: { open: boolean; onClose: () => void; employees: Employee[] }) {
  const addLeave = useEquipe((s) => s.addLeave);
  const [emp, setEmp] = useState(employees[0]?.id ?? '');
  const [type, setType] = useState<LeaveType>('cp');
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [note, setNote] = useState('');
  const days = workingDays(from, to);
  return (
    <Sheet open={open} onClose={onClose} title="Nouvelle demande" subtitle="Le salarié peut aussi la faire depuis son téléphone." width={460}
      footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button variant="primary" disabled={!days} onClick={() => { addLeave({ employeeId: emp, type, from, to, days, note }); toast('Demande enregistrée, à valider.'); onClose(); }}>Enregistrer · {days} j</Button></>}
    >
      <div className="space-y-4">
        <Field label="Salarié">
          <Select value={emp} onChange={(e) => setEmp(e.target.value)}>{employees.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}</Select>
        </Field>
        <Field label="Type" hint={LEAVE_TYPES[type].paidBy}>
          <Select value={type} onChange={(e) => setType(e.target.value as LeaveType)}>{Object.entries(LEAVE_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Du"><Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); if (to < e.target.value) setTo(e.target.value); }} /></Field>
          <Field label="Au"><Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>
        <Field label="Note (facultatif)"><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex. mariage de ma sœur" className="min-h-[72px]" /></Field>
      </div>
    </Sheet>
  );
}

export default function Conges() {
  const employees = useBrix((s) => s.employees);
  const upsertEmployee = useBrix((s) => s.upsertEmployee);
  const { leaves: all, setLeaveStatus } = useEquipe();
  const [open, setOpen] = useState(false);
  const staff = employees.filter((e) => e.role !== 'patron');
  const ids = new Set(staff.map((e) => e.id));
  const leaves = all.filter((l) => ids.has(l.employeeId));
  const pending = leaves.filter((l) => l.status === 'en_attente').sort((a, b) => a.from.localeCompare(b.from));
  const upcoming = leaves.filter((l) => l.status === 'validee' && l.to >= todayISO()).sort((a, b) => a.from.localeCompare(b.from));
  const empOf = (id: string) => employees.find((e) => e.id === id)!;

  const overlaps = useMemo(() => {
    const out: Record<string, string[]> = {};
    pending.forEach((l) => {
      out[l.id] = leaves.filter((o) => o.id !== l.id && o.employeeId !== l.employeeId && o.status !== 'refusee' && o.from <= l.to && o.to >= l.from).map((o) => empOf(o.employeeId).firstName);
    });
    return out;
  }, [leaves]);

  const { leaving, leave } = useLeaving(700);
  const decide = (l: LeaveRequest, ok: boolean) => {
    if (ok) leave(l.id, () => setLeaveStatus(l.id, 'validee'));
    else setLeaveStatus(l.id, 'refusee');
    const e = empOf(l.employeeId);
    if (ok && l.type === 'cp') upsertEmployee({ ...e, leaveBalance: Math.max(0, e.leaveBalance - l.days) });
    toast(ok ? `Congé de ${e.firstName} validé. Il est prévenu sur son téléphone.` : `Demande de ${e.firstName} refusée.`, ok ? 'ok' : 'info', { label: 'Annuler', run: () => { setLeaveStatus(l.id, 'en_attente'); if (ok && l.type === 'cp') upsertEmployee(e); } });
  };

  // Période de référence BTP : 1er avril au 31 mars (2,5 jours ouvrables par mois travaillé).
  const now = new Date();
  const monthsAcquired = ((now.getMonth() - 3 + 12) % 12) + 1;

  return (
    <div className="space-y-5">
      <PageHeader icon={<IconTile name="Palmtree" dept="equipe" size="lg" />} title="Congés et absences" subtitle="Les demandes arrivent ici, vous validez d’un geste, l’équipe est prévenue."
        actions={<Button variant="secondary" icon={<Plus />} onClick={() => setOpen(true)} className="max-sm:w-full">Nouvelle demande</Button>} />

      {staff.length === 0 ? (
        <EmptyState icon={<Palmtree />} title="Aucun salarié pour l’instant" text="Les demandes de congés de votre équipe arriveront ici." />
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-4">
            <section className="space-y-3">
              <SectionHead title="À valider" meta={pending.length ? `${pending.length} demande${pending.length > 1 ? 's' : ''}` : undefined} />
              {pending.length === 0 ? (
                <Card className="flex items-center gap-3 p-5 text-[13.5px] text-ink-2"><SuccessDot size={22} />Rien à valider. Tout le monde sait quand il part.</Card>
              ) : (
                <div className="stagger space-y-3">
                  {pending.map((l) => {
                    const e = empOf(l.employeeId);
                    const short = l.type === 'cp' && l.days > e.leaveBalance;
                    return (
                      <Card key={l.id} className={cn('flex flex-col gap-4 p-4 sm:flex-row sm:items-center md:px-5', leaveCls(leaving[l.id]))}>
                        <div className="flex min-w-0 flex-1 items-start gap-3.5">
                          <Avatar initials={e.initials} color={e.color} size={40} />
                          <div className="min-w-0">
                            <div className="text-[14.5px]"><span className="font-semibold">{e.firstName}</span> <span className="text-ink-2">· {LEAVE_TYPES[l.type].label.toLowerCase()}</span></div>
                            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                              <DateChip iso={l.from} />
                              {l.to !== l.from && <><span className="h-px w-3 bg-line2" /><DateChip iso={l.to} /></>}
                              <span className="num ml-1 text-[13px] font-semibold">{l.days} j</span>
                            </div>
                            <div className="mt-1.5 text-[12.5px] text-ink-3">{l.note && `« ${l.note} » · `}demandé {relative(l.createdAt)}</div>
                            {(overlaps[l.id]?.length > 0 || short) && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {overlaps[l.id]?.length > 0 && <Badge tone="warn" icon={<AlertTriangle />}>{overlaps[l.id].join(', ')} absent{overlaps[l.id].length > 1 ? 's' : ''} aussi</Badge>}
                                {short && <Badge tone="bad">Solde insuffisant ({num(e.leaveBalance, 1)} j)</Badge>}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 sm:shrink-0">
                          {leaving[l.id] ? (
                            <span className="flex h-11 items-center gap-2 px-2 text-[13.5px] font-medium text-ok"><SuccessDot size={22} />Validé</span>
                          ) : (
                            <>
                              <Button variant="ghost" className="h-11 flex-1 sm:flex-none" icon={<X />} onClick={() => decide(l, false)}>Refuser</Button>
                              <Button variant="primary" className="h-11 flex-[2] sm:flex-none" icon={<Check />} onClick={() => decide(l, true)}>Valider</Button>
                            </>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>

            <div className="hidden md:block"><LeaveCalendar employees={staff} leaves={leaves} focus={[...pending].sort((a, b) => b.days - a.days)[0]?.from ?? upcoming[0]?.from} /></div>

            <Card className="md:hidden">
              <CardHeader title="Prochaines absences" />
              {upcoming.length === 0 && <div className="px-4 py-6 text-center text-[13px] text-ink-3">Personne d’absent prochainement.</div>}
              {upcoming.map((l) => {
                const e = empOf(l.employeeId);
                return (
                  <div key={l.id} className="flex min-h-[56px] items-center gap-3 border-b border-line px-4 py-2 last:border-0">
                    <Avatar initials={e.initials} color={e.color} size={30} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-medium">{e.firstName} · {period(l)}</div>
                      <div className="text-[12px] text-ink-3">{LEAVE_TYPES[l.type].label} · {l.days} j</div>
                    </div>
                    <Badge tone={LEAVE_TYPES[l.type].tone}>{LEAVE_TYPES[l.type].label.split(' ')[0]}</Badge>
                  </div>
                );
              })}
            </Card>
          </div>

          <Card>
            <CardHeader title="Soldes de congés payés" meta="en jours ouvrables" />
            {staff.map((e) => {
              const acquired = Math.min(30, monthsAcquired * 2.5);
              const pendingDays = pending.filter((l) => l.employeeId === e.id && l.type === 'cp').reduce((s, l) => s + l.days, 0);
              return (
                <div key={e.id} className="border-b border-line px-4 py-3 last:border-0">
                  <div className="flex items-center gap-2.5">
                    <Avatar initials={e.initials} color={e.color} size={28} />
                    <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{e.firstName} {e.lastName}</span>
                    <span className="num text-[16px] font-semibold">{num(e.leaveBalance, 1)} j</span>
                  </div>
                  <GrowBar value={(e.leaveBalance / 30) * 100} className="mt-2.5" barClassName={e.leaveBalance < 5 ? 'bg-[#f59e0b]' : 'bg-[#0891b2]'} />
                  <div className="num mt-1.5 text-[11.5px] text-ink-3">{num(acquired, 1)} j en cours d’acquisition{pendingDays ? ` · ${pendingDays} j demandés` : ''}</div>
                </div>
              );
            })}
            <div className="m-3 flex gap-3 rounded-[12px] bg-sub/70 p-3">
              <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
              <p className="text-[12px] leading-relaxed text-ink-2"><span className="font-medium text-ink">Dans le BTP, la caisse paie les congés.</span> La CIBTP verse l’indemnité au salarié, vous cotisez déjà chaque mois dans la paie. 2,5 jours par mois, du 1er avril au 31 mars.</p>
            </div>
          </Card>
        </div>
      )}

      <NewLeaveSheet open={open} onClose={() => setOpen(false)} employees={staff} />
    </div>
  );
}

function DateChip({ iso }: { iso: string }) {
  const d = new Date(iso + 'T12:00:00');
  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-[8px] bg-[#e8f7fa] px-2 text-[12.5px] text-[#0e7490] shadow-[inset_0_0_0_1px_#c5e9f0]">
      <span className="text-[10.5px] font-medium uppercase">{d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}</span>
      <span className="font-semibold">{d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).replace('.', '')}</span>
    </span>
  );
}
