import { BellRing, CalendarCheck, Check, ShieldCheck, Wrench } from 'lucide-react';
import { Avatar, Badge, Button, EmptyState, Icon, IconTile, Switch, cn, toast } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { dateLong, dateShort, money, relative, todayISO, uid } from '@/lib/format';
import { useChantiersLocal, type Contract, type Intervention } from '../../store';
import { EQUIPMENT, PRIORITY, addMonths, contractState, dueOf } from './savUtils';
import type { PlanTarget } from './SavSheets';

const dY = (iso: string) => `${dateShort(iso)}${iso.slice(0, 4) !== todayISO().slice(0, 4) ? ' ' + iso.slice(0, 4) : ''}`;

const STATE_ORDER = { retard: 0, bientot: 1, planifie: 2, ok: 3 };

export function ContractsList({ onPlan }: { onPlan: (t: PlanTarget) => void }) {
  const clients = useBrix((s) => s.clients);
  const { contracts, upsertContract, addVisit } = useChantiersLocal();
  const me = useBrix((s) => s.employees[0]?.id ?? 'moi');
  const list = contracts.filter((c) => clients.some((x) => x.id === c.clientId)).sort((a, b) => STATE_ORDER[contractState(a).key] - STATE_ORDER[contractState(b).key] || dueOf(a).localeCompare(dueOf(b)));

  const markDone = (c: Contract) => {
    addVisit({ id: uid('v'), clientId: c.clientId, contractId: c.id, date: todayISO(), kind: 'entretien', employeeId: me, notes: 'Entretien annuel réalisé, attestation remise au client.' });
    upsertContract({ ...c, lastVisit: todayISO(), plannedAt: undefined, eventId: undefined });
    toast('Entretien noté dans le carnet, prochain rappel programmé');
  };

  if (!list.length) return <EmptyState icon={<CalendarCheck />} title="Aucun contrat d’entretien" text="Un contrat d’entretien, c’est un client qui revient chaque année. Brix le rappelle tout seul." />;

  return (
    <div className="stagger-fast space-y-2">
      {list.map((c) => {
        const client = clients.find((x) => x.id === c.clientId);
        const st = contractState(c);
        const due = dueOf(c);
        return (
          <div key={c.id} className="row-card flex-col items-stretch gap-3 md:flex-row md:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <IconTile tone="peach" icon={<Icon name={EQUIPMENT[c.equipment].icon} />} />
              <div className="min-w-0">
                <div className="truncate text-[14.5px] font-semibold tracking-[-0.015em]">{client?.name}</div>
                <div className="truncate text-xs text-ink-3">{c.label}{c.brand ? ` · ${c.brand}` : ''} · {money(c.priceHt, true)} HT / {c.frequencyMonths === 12 ? 'an' : `${c.frequencyMonths} mois`}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 md:w-[290px]">
              <div className="min-w-0 flex-1">
                <div className="text-[13px]">{st.key === 'planifie' ? `Visite le ${dY(c.plannedAt!)}` : `Prochaine visite ${dY(due)}`}</div>
                <div className="text-xs text-ink-3">{c.lastVisit > todayISO() ? `installation le ${dY(c.lastVisit)}` : `dernière le ${dY(c.lastVisit)}`}</div>
              </div>
              <Badge tone={st.tone}>{st.label}</Badge>
            </div>
            <div className="flex items-center gap-2 md:w-[250px] md:justify-end">
              <span className="flex flex-1 items-center gap-2 text-xs text-ink-2 md:flex-none" title={c.reminder ? `Rappel envoyé le ${dateLong(addMonths(due, -1))}` : 'Pas de rappel automatique'}>
                <Switch checked={c.reminder} onChange={(reminder) => { upsertContract({ ...c, reminder }); toast(reminder ? `Rappel programmé le ${dateShort(addMonths(due, -1))}` : 'Rappel désactivé', 'info'); }} label="Rappel automatique" />
                <BellRing className={cn('h-3.5 w-3.5', !c.reminder && 'opacity-40')} />
              </span>
              {st.key === 'planifie' ? (
                <Button size="sm" icon={<Check className="h-3.5 w-3.5" />} onClick={() => markDone(c)}>Fait</Button>
              ) : (
                <Button size="sm" variant={st.key === 'ok' ? 'secondary' : 'primary'} onClick={() => onPlan({ kind: 'contract', item: c })}>Planifier</Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function InterventionsList({ onPlan, filter }: { onPlan: (t: PlanTarget) => void; filter: 'ouvertes' | 'terminees' }) {
  const { clients, employees } = useBrix();
  const { interventions, upsertIntervention, addVisit } = useChantiersLocal();
  const order = { urgente: 0, normale: 1, faible: 2 };
  const list = interventions
    .filter((i) => clients.some((c) => c.id === i.clientId))
    .filter((i) => (filter === 'ouvertes' ? i.status !== 'terminee' : i.status === 'terminee'))
    .sort((a, b) => order[a.priority] - order[b.priority] || b.createdAt.localeCompare(a.createdAt));

  const finish = (i: Intervention) => {
    upsertIntervention({ ...i, status: 'terminee' });
    addVisit({ id: uid('v'), clientId: i.clientId, date: todayISO(), kind: 'depannage', employeeId: i.employeeId ?? employees[0]?.id ?? 'moi', notes: `${i.title}. ${i.underWarranty ? 'Pris en charge au titre de la garantie.' : ''}`.trim() });
    toast(i.underWarranty ? 'Intervention terminée, sous garantie : rien à facturer' : 'Intervention terminée, pensez à la facturer', 'ok');
  };

  if (!list.length) return <EmptyState icon={<Check />} title={filter === 'ouvertes' ? 'Aucune demande en attente' : 'Aucune intervention terminée'} text={filter === 'ouvertes' ? 'Les pannes signalées par vos clients arrivent ici.' : undefined} />;

  return (
    <div className="stagger-fast space-y-2">
      {list.map((i) => {
        const client = clients.find((c) => c.id === i.clientId);
        const emp = employees.find((e) => e.id === i.employeeId);
        return (
          <div key={i.id} className="row-card flex-col items-stretch gap-3 md:flex-row md:items-center">
            <div className="flex min-w-0 flex-1 items-start gap-3">
            <IconTile tone={i.priority === 'urgente' ? 'rose' : i.underWarranty ? 'blue' : 'peach'} icon={<Wrench />} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[14.5px] font-semibold tracking-[-0.015em]">{i.title}</span>
                {i.priority !== 'normale' && <Badge tone={PRIORITY[i.priority].tone} dot={i.priority === 'urgente'}>{PRIORITY[i.priority].label}</Badge>}
                {i.underWarranty && <Badge tone="info" icon={<ShieldCheck />}>Garantie</Badge>}
              </div>
              <div className="mt-0.5 text-xs text-ink-3">{client?.name} · signalé {relative(i.createdAt)}</div>
              {i.description && <p className="mt-1 line-clamp-2 text-[13px] text-ink-2">{i.description}</p>}
            </div>
            </div>
            <div className="flex items-center gap-2 md:w-[260px] md:justify-end">
              {i.status === 'planifiee' && i.plannedAt ? (
                <>
                  <span className="flex flex-1 items-center gap-2 text-[13px] md:flex-none">
                    {emp && <Avatar initials={emp.initials} color={emp.color} size={24} />} {relative(i.plannedAt)}
                  </span>
                  <Button size="sm" icon={<Check className="h-3.5 w-3.5" />} onClick={() => finish(i)}>Terminer</Button>
                </>
              ) : i.status === 'nouvelle' ? (
                <Button size="sm" variant={i.priority === 'urgente' ? 'primary' : 'secondary'} className="w-full justify-center md:w-auto" onClick={() => onPlan({ kind: 'intervention', item: i })}>
                  {i.priority === 'urgente' ? 'Envoyer quelqu’un' : 'Planifier'}
                </Button>
              ) : (
                <Badge tone="ok">Terminée {i.plannedAt ? dateShort(i.plannedAt) : ''}</Badge>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
