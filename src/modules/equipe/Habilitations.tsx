import { useState } from 'react';
import { AlertOctagon, BadgeCheck, CalendarPlus, Check, Plus } from 'lucide-react';
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, IconTile, PageHeader, cn, toast } from '@/components/ui';
import { SuccessDot } from '@/components/motion';
import { DaysRing, SectionHead } from '@/modules/finance/components/kit';
import { useBrix } from '@/lib/store';
import { dateFull, dateShort, money, uid } from '@/lib/format';
import { addDays } from './data';
import { ALERT_DAYS, habState, habType } from './lib/habs';
import { useEquipe, type HabRecord, type TrainingPlan } from './store';
import { HabSheet } from './components/HabSheet';

const COLS = ['elec_b0', 'elec_b1v', 'elec_br', 'elec_bc', 'caces_r482', 'caces_r486', 'hauteur', 'sst', 'amiante_ss4'];
const STATUS: Record<TrainingPlan['status'], { label: string; tone: 'warn' | 'info' | 'ok' }> = { a_planifier: { label: 'À planifier', tone: 'warn' }, inscrit: { label: 'Inscrit', tone: 'info' }, fait: { label: 'Fait', tone: 'ok' } };

export default function Habilitations() {
  const employees = useBrix((s) => s.employees);
  const { habs: allHabs, trainings: allTrainings, upsertTraining, upsertHab } = useEquipe();
  const [open, setOpen] = useState(false);
  const ids = new Set(employees.map((e) => e.id));
  const habs = allHabs.filter((h) => ids.has(h.employeeId));
  const trainings = allTrainings.filter((t) => ids.has(t.employeeId)).sort((a, b) => a.date.localeCompare(b.date));
  const empOf = (id: string) => employees.find((e) => e.id === id)!;
  const alerts = habs.map((h) => ({ h, st: habState(h.expires) })).filter((x) => x.st.level !== 'ok').sort((a, b) => a.st.days - b.st.days);

  const plan = (h: HabRecord) => {
    const existing = trainings.find((t) => t.employeeId === h.employeeId && t.type === h.type && t.status !== 'fait');
    if (existing) {
      upsertTraining({ ...existing, status: 'inscrit' });
      toast(`${empOf(h.employeeId).firstName} est inscrit le ${dateShort(existing.date)} (demande envoyée à ${existing.organisme}, démo).`);
    } else {
      upsertTraining({ id: uid('t'), employeeId: h.employeeId, type: h.type, date: addDays(h.expires, -14), organisme: h.organisme, cost: 450, funded: true, status: 'inscrit' });
      toast('Recyclage ajouté au plan de formation.');
    }
  };
  const markDone = (t: TrainingPlan) => {
    upsertTraining({ ...t, status: 'fait' });
    const h = habs.find((x) => x.employeeId === t.employeeId && x.type === t.type);
    const years = habType(t.type)?.years ?? 3;
    const today = new Date().toISOString().slice(0, 10);
    upsertHab({ id: h?.id ?? uid('h'), employeeId: t.employeeId, type: t.type, organisme: t.organisme, obtained: today, expires: addDays(today, Math.round(years * 365.25)) });
    toast('Formation faite : l’habilitation est renouvelée.');
  };

  const funded = trainings.filter((t) => t.funded && t.status !== 'fait').reduce((s, t) => s + t.cost, 0);

  return (
    <div className="space-y-5">
      <PageHeader icon={<IconTile name="BadgeCheck" dept="equipe" size="lg" />} title="Habilitations" subtitle={`Électriques, CACES, hauteur, secourisme, amiante. Brix vous prévient ${ALERT_DAYS} jours avant chaque échéance.`}
        actions={<Button variant="secondary" icon={<Plus />} onClick={() => setOpen(true)} className="max-sm:w-full">Ajouter</Button>} />

      {employees.length === 0 ? <EmptyState icon={<BadgeCheck />} title="Aucune personne à suivre" text="Ajoutez votre équipe pour suivre ses habilitations." /> : (
        <>
          {alerts.length > 0 ? (
            <section className="space-y-3">
              <SectionHead title="À renouveler" meta={`${alerts.length} habilitation${alerts.length > 1 ? 's' : ''}`} />
              <div className="stagger grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {alerts.map(({ h, st }) => {
                  const e = empOf(h.employeeId);
                  const t = habType(h.type)!;
                  const planned = trainings.find((x) => x.employeeId === h.employeeId && x.type === h.type && x.status === 'inscrit');
                  return (
                    <Card key={h.id} className="relative flex flex-col overflow-hidden p-4">
                      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-[3px]', st.level === 'expired' ? 'bg-bad' : 'bg-[#f59e0b]')} />
                      <div className="flex items-start gap-3.5">
                        <DaysRing days={st.days} horizon={ALERT_DAYS} size={58} stroke={5} />
                        <div className="min-w-0 flex-1 pt-0.5">
                          <div className="flex items-center gap-2">
                            <Avatar initials={e.initials} color={e.color} size={20} />
                            <span className="truncate text-[14px] font-semibold">{e.firstName} · {t.short}</span>
                          </div>
                          <div className="mt-0.5 truncate text-[12.5px] text-ink-2">{t.label}</div>
                          <div className={cn('mt-1 text-[12.5px] font-medium', st.level === 'expired' ? 'text-bad' : 'text-warn')}>{st.level === 'expired' ? `Expirée depuis ${-st.days} jours` : `Expire le ${dateShort(h.expires)}`}</div>
                        </div>
                      </div>
                      {st.level === 'expired' && (
                        <p className="mt-3 flex items-start gap-2 text-[12.5px] leading-snug text-ink-2">
                          <AlertOctagon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-bad" />
                          {h.type.startsWith('caces') ? `${e.firstName} ne conduit plus de nacelle jusqu’au recyclage.` : `${e.firstName} ne fait plus ces travaux jusqu’au recyclage.`}
                        </p>
                      )}
                      <div className="mt-auto pt-3.5">
                        {planned ? (
                          <span className="flex h-10 items-center gap-2 text-[13px] font-medium text-ok"><SuccessDot size={20} />Recyclage le {dateShort(planned.date)} · {planned.organisme}</span>
                        ) : (
                          <Button size="sm" variant={st.level === 'expired' ? 'primary' : 'secondary'} icon={<CalendarPlus />} onClick={() => plan(h)} className="max-sm:w-full">Planifier le recyclage</Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          ) : (
            <Card className="flex items-center gap-3 p-5 text-[13.5px]"><SuccessDot size={24} />Tout le monde est à jour. Brix vous prévient {ALERT_DAYS} jours avant la prochaine échéance.</Card>
          )}

          {/* Tableau complet (ordinateur) */}
          <Card className="hidden overflow-hidden xl:block">
            <CardHeader title="Toute l’équipe" meta="date de fin de validité" />
            <table className="w-full table-fixed text-[12.5px]">
              <colgroup><col className="w-[180px]" />{COLS.map((c) => <col key={c} />)}</colgroup>
              <thead>
                <tr className="border-b border-line bg-[#fafafc] text-[11.5px] text-ink-2">
                  <th className="px-4 py-2.5 text-left font-medium">Salarié</th>
                  {COLS.map((c) => <th key={c} className="px-1 py-2.5 text-center font-medium" title={habType(c)?.label}>{habType(c)?.short}</th>)}
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-2"><span className="flex items-center gap-2"><Avatar initials={e.initials} color={e.color} size={24} /><span className="truncate font-medium">{e.firstName} {e.lastName[0]}.</span></span></td>
                    {COLS.map((c) => {
                      // BR couvre B1V/B2V ; on affiche la plus haute détenue dans sa colonne.
                      const h = habs.find((x) => x.employeeId === e.id && (x.type === c || (c === 'elec_br' && x.type === 'elec_b2v')));
                      const st = h && habState(h.expires);
                      return (
                        <td key={c} className="px-1 py-2 text-center">
                          {h && st ? (
                            <span title={st.label} className={cn('num inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11.5px] font-medium', st.level === 'expired' ? 'bg-bad-bg text-bad' : st.level === 'soon' ? 'bg-warn-bg text-warn' : 'text-ink-2')}>{st.level === 'ok' && <i className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />}{dateFull(h.expires).slice(0, 6) + dateFull(h.expires).slice(8)}</span>
                          ) : <span className="text-line2">·</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Par personne (téléphone et tablette) */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:hidden">
            {employees.map((e) => {
              const mine = habs.filter((h) => h.employeeId === e.id).sort((a, b) => a.expires.localeCompare(b.expires));
              return (
                <Card key={e.id}>
                  <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
                    <Avatar initials={e.initials} color={e.color} size={30} />
                    <span className="text-[14px] font-semibold">{e.firstName} {e.lastName}</span>
                  </div>
                  {mine.length === 0 && <div className="px-4 py-4 text-[13px] text-ink-3">Aucune habilitation enregistrée.</div>}
                  {mine.map((h) => {
                    const st = habState(h.expires);
                    return (
                      <div key={h.id} className="flex min-h-[52px] items-center gap-3 border-b border-line px-4 py-2 last:border-0">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13.5px] font-medium">{habType(h.type)?.label}</div>
                          <div className="text-[11.5px] text-ink-3">jusqu’au {dateFull(h.expires)} · {h.organisme}</div>
                        </div>
                        {st.level === 'ok' ? <Badge tone="ok" dot>Valide</Badge> : <DaysRing days={st.days} horizon={ALERT_DAYS} size={40} />}
                      </div>
                    );
                  })}
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader title="Plan de formation" meta={funded ? `${money(funded, true)} pris en charge par l’OPCO Constructys` : undefined} />
            {trainings.length === 0 && <div className="px-4 py-6 text-center text-[13px] text-ink-3">Aucune formation prévue.</div>}
            {trainings.map((t) => {
              const e = empOf(t.employeeId);
              return (
                <div key={t.id} className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-0">
                  <Avatar initials={e.initials} color={e.color} size={30} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-medium">{e.firstName} · {habType(t.type)?.label}</div>
                    <div className="text-[12px] text-ink-3">{dateFull(t.date)} · {t.organisme} · <span className="num">{money(t.cost, true)}</span>{t.funded && ' · financé OPCO'}</div>
                  </div>
                  <div className="flex w-full items-center gap-2 pl-[42px] sm:w-auto sm:pl-0">
                  <Badge tone={STATUS[t.status].tone}>{STATUS[t.status].label}</Badge>
                  {t.status === 'a_planifier' && <Button size="sm" variant="secondary" onClick={() => { upsertTraining({ ...t, status: 'inscrit' }); toast(`Inscription envoyée à ${t.organisme} (démo).`); }}>Inscrire</Button>}
                  {t.status === 'inscrit' && <Button size="sm" variant="ghost" icon={<Check className="h-3.5 w-3.5" />} onClick={() => markDone(t)}>Marquer faite</Button>}
                  </div>
                </div>
              );
            })}
            <p className="border-t border-line px-4 py-3 text-[11.5px] text-ink-3">Validités conseillées : électriques 3 ans, CACES nacelle 5 ans, CACES engins 10 ans, travail en hauteur 3 ans, SST 2 ans, amiante 3 ans.</p>
          </Card>
        </>
      )}

      <HabSheet open={open} onClose={() => setOpen(false)} employees={employees} />
    </div>
  );
}
