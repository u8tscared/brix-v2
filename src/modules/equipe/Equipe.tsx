import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, UserPlus, Users } from 'lucide-react';
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, IconTile, PageHeader, UnderlineTabs, cn, type HaloTone } from '@/components/ui';
import { LiveDot } from '@/components/motion';
import { DaysRing } from '@/modules/finance/components/kit';
import { NowBoard } from './components/NowBoard';
import { useBrix } from '@/lib/store';
import { money, num, relative } from '@/lib/format';
import type { Employee } from '@/lib/types';
import { roleFromStore, roleName } from './data';
import { habState, habType } from './lib/habs';
import { useEquipe } from './store';
import { EmployeeSheet } from './components/EmployeeSheet';
import { InviteSheet } from './components/InviteSheet';
import { RightsMatrix } from './components/RightsMatrix';
import { useTeamNow } from './components/useTeamNow';
import { WorkerAppPreview } from './components/WorkerAppPreview';

type Tab = 'now' | 'fiches' | 'roles' | 'app';

export default function Equipe() {
  const employees = useBrix((s) => s.employees);
  const leaves = useEquipe((s) => s.leaves);
  const habs = useEquipe((s) => s.habs);
  const invitations = useEquipe((s) => s.invitations);
  const team = useTeamNow();
  const [tab, setTab] = useState<Tab>('now');
  const [invite, setInvite] = useState(false);
  const [open, setOpen] = useState<Employee | null>(null);

  const ids = new Set(employees.map((e) => e.id));
  const onSite = team.filter((t) => ['chantier', 'bureau', 'pause'].includes(t.status)).length;
  const pendingLeaves = leaves.filter((l) => l.status === 'en_attente' && ids.has(l.employeeId)).length;
  const habAlerts = habs.filter((h) => ids.has(h.employeeId) && habState(h.expires).level !== 'ok');
  const missing = team.filter((t) => t.status === 'pas_pointe' && t.planned);
  const payroll = useMemo(() => employees.reduce((s, e) => s + e.grossMonthly, 0), [employees]);

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<IconTile name="Users" dept="equipe" size="lg" />}
        title="Équipe"
        subtitle={<span className="inline-flex items-center gap-2">{onSite > 0 && <LiveDot />}{onSite} sur {employees.length} sur le terrain en ce moment</span>}
        actions={<Button variant="dawn" icon={<UserPlus />} onClick={() => setInvite(true)} className="max-sm:w-full">Inviter quelqu’un</Button>}
      />

      <div className="stagger-fast grid grid-cols-2 gap-3 md:grid-cols-4">
        <QuickTile to="/app/pointage" icon="Timer" color="green" label="Pointage" value={`${onSite} / ${employees.length}`} sub={missing.length ? `${missing.length} pas encore pointé` : 'tout le monde a pointé'} tone={missing.length ? 'warn' : undefined} />
        <QuickTile to="/app/conges" icon="Palmtree" color="peach" label="Congés à valider" value={String(pendingLeaves)} sub={pendingLeaves ? 'en un geste' : 'rien en attente'} tone={pendingLeaves ? 'warn' : undefined} />
        <QuickTile to="/app/habilitations" icon="BadgeCheck" color="amber" label="Habilitations" value={String(habAlerts.length)} sub="à renouveler sous 60 j" tone={habAlerts.some((h) => habState(h.expires).level === 'expired') ? 'bad' : habAlerts.length ? 'warn' : undefined} />
        <QuickTile to="/app/paie" icon="FileSpreadsheet" color="blue" label="Masse salariale" value={money(payroll, true)} sub="brut par mois" />
      </div>

      <UnderlineTabs<Tab> value={tab} onChange={setTab} options={[
        { value: 'now', label: 'Maintenant' },
        { value: 'fiches', label: 'Fiches', count: employees.length },
        { value: 'roles', label: 'Rôles et droits' },
        { value: 'app', label: 'App ouvrier' },
      ]} />

      {employees.length === 0 && tab !== 'roles' && (
        <EmptyState icon={<Users />} title="Votre équipe arrive ici" text="Invitez vos compagnons : ils pointent depuis leur téléphone et vous voyez qui est où." action={<Button variant="soft" onClick={() => setInvite(true)}>Inviter une personne</Button>} />
      )}

      {tab === 'now' && employees.length > 0 && (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <NowBoard team={team} onOpen={(t) => setOpen(t.emp)} />
          <div className="space-y-3">
            {habAlerts.length > 0 && (
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-[14.5px] font-semibold tracking-[-0.015em]"><IconTile size="sm" tone="amber" name="BadgeCheck" />À surveiller</div>
                  <Link to="/app/habilitations" className="text-[12.5px] font-medium text-ink-2 hover:text-ink">Tout voir</Link>
                </div>
                <ul className="mt-2 space-y-1">
                  {habAlerts.slice(0, 4).map((h) => {
                    const e = employees.find((x) => x.id === h.employeeId)!;
                    const st = habState(h.expires);
                    const t = habType(h.type);
                    return (
                      <li key={h.id}>
                        <Link to="/app/habilitations" className="-mx-2 flex min-h-[52px] items-center gap-3 rounded-[14px] px-2 transition hover:bg-halo-hover">
                          <DaysRing days={st.days} horizon={60} size={38} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-medium">{e.firstName} · {t?.short ?? 'Formation'}</span>
                            <span className={cn('block text-[12px]', st.level === 'expired' ? 'text-bad' : 'text-warn')}>{st.label}</span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            )}
            <Link to="/app/planning" className="lift flex items-center gap-3 rounded-card bg-white p-4 shadow-halo">
              <IconTile name="CalendarRange" dept="chantiers" size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-medium">Planning de la semaine</span>
                <span className="block text-[12px] text-ink-3">Qui va où, demain et après</span>
              </span>
              <ChevronRight className="h-4 w-4 text-ink-3" />
            </Link>
          </div>
        </div>
      )}

      {tab === 'fiches' && employees.length > 0 && (
        <div className="space-y-4">
          <div className="stagger-fast space-y-2">
            <div className="hidden grid-cols-[minmax(0,1.6fr)_1fr_.8fr_.8fr_1fr_.7fr_20px] gap-3 px-4 pb-1 text-[12.5px] font-medium text-ink-2 lg:grid">
              <span>Personne</span><span>Contrat</span><span className="text-right">Coût horaire</span><span className="text-right">Congés</span><span>Habilitations</span><span>Téléphone</span><span />
            </div>
            {employees.map((e) => {
              const mine = habs.filter((h) => h.employeeId === e.id);
              const worst = mine.map((h) => habState(h.expires)).sort((a, b) => a.days - b.days)[0];
              return (
                <button key={e.id} onClick={() => setOpen(e)} className="row-card grid w-full grid-cols-[auto_minmax(0,1fr)_auto] gap-3 text-left lg:grid-cols-[minmax(0,1.6fr)_1fr_.8fr_.8fr_1fr_.7fr_20px]">
                  <span className="flex min-w-0 items-center gap-3 max-lg:contents">
                    <Avatar initials={e.initials} color={e.color} size={36} />
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-semibold">{e.firstName} {e.lastName}</span>
                      <span className="block truncate text-[12.5px] text-ink-2">{roleName(roleFromStore(e.role))}<span className="lg:hidden"> · {e.contract} · {e.role === 'patron' ? '' : `${num(e.leaveBalance, 1)} j de congés`}</span></span>
                    </span>
                  </span>
                  <span className="hidden text-[13px] lg:block">{e.contract}<span className="block text-[11.5px] text-ink-3">depuis {relative(e.hireDate)}</span></span>
                  <span className="num hidden text-right text-[13px] lg:block">{e.role === 'patron' ? '—' : `${money(e.hourlyCost)}`}</span>
                  <span className="num hidden text-right text-[13px] lg:block">{e.role === 'patron' ? '—' : `${num(e.leaveBalance, 1)} j`}</span>
                  <span className="hidden lg:block">{worst ? <Badge tone={worst.tone} dot>{worst.level === 'ok' ? `${mine.length} à jour` : worst.label}</Badge> : <span className="text-ink-3">—</span>}</span>
                  <span className="num hidden text-[13px] text-ink-2 lg:block">{e.phone}</span>
                  <ChevronRight className="h-4 w-4 text-ink-3" />
                </button>
              );
            })}
          </div>

          {invitations.length > 0 && (
            <Card>
              <CardHeader title="Invitations envoyées" meta={`${invitations.length}`} />
              {invitations.map((i) => (
                <div key={i.id} className="flex min-h-[52px] items-center gap-3 border-b border-halo-line px-4 py-2 last:border-0">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-medium">{i.name}</div>
                    <div className="text-[12px] text-ink-3">{roleName(i.role)} · par {i.via === 'qr' ? 'QR code' : i.via === 'sms' ? 'SMS' : 'lien'}</div>
                  </div>
                  <Badge tone="info">En attente</Badge>
                </div>
              ))}
            </Card>
          )}
        </div>
      )}

      {tab === 'roles' && <RightsMatrix />}
      {tab === 'app' && employees.length > 0 && <WorkerAppPreview />}

      <InviteSheet open={invite} onClose={() => setInvite(false)} />
      <EmployeeSheet emp={open} onClose={() => setOpen(null)} />
    </div>
  );
}

function QuickTile({ to, icon, label, value, sub, tone, color }: { to: string; icon: string; label: string; value: string; sub: string; tone?: 'warn' | 'bad'; color: HaloTone }) {
  return (
    <Link to={to} className="lift group relative flex min-w-0 flex-col rounded-card bg-white p-4 shadow-halo md:p-5">
      <IconTile name={icon} tone={color} size="sm" className="transition-transform duration-300 ease-spring group-hover:scale-110" />
      <span className="mt-3 truncate text-[13px] font-medium text-ink-2">{label}</span>
      <span className="num-halo mt-1.5 text-[26px] leading-none md:text-[30px]">{value}</span>
      <span className={cn('mt-1.5 flex items-center gap-1.5 truncate text-[12px] text-ink-3', tone === 'warn' && 'text-warn', tone === 'bad' && 'text-bad')}>
        {tone && <i className={cn('h-1.5 w-1.5 shrink-0 rounded-full', tone === 'bad' ? 'bg-bad' : 'bg-[#f59e0b]')} />}
        {sub}
      </span>
    </Link>
  );
}
