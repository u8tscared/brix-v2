import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellRing, ChevronRight, Phone, UserPlus, Users } from 'lucide-react';
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, PageHeader, UnderlineTabs, cn, toast } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { money, num, relative } from '@/lib/format';
import type { Employee } from '@/lib/types';
import { roleFromStore, roleName } from './data';
import { habState } from './lib/habs';
import { useEquipe } from './store';
import { EmployeeSheet } from './components/EmployeeSheet';
import { InviteSheet } from './components/InviteSheet';
import { RightsMatrix } from './components/RightsMatrix';
import { NOW_LABEL, useTeamNow, type TeamNow } from './components/useTeamNow';
import { WorkerAppPreview } from './components/WorkerAppPreview';

type Tab = 'now' | 'fiches' | 'roles' | 'app';

function NowRow({ t, onOpen }: { t: TeamNow; onOpen: () => void }) {
  const st = NOW_LABEL[t.status];
  const active = t.status === 'chantier' || t.status === 'bureau';
  return (
    <div className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
      <button onClick={onOpen} className="relative shrink-0" aria-label={`Fiche de ${t.emp.firstName}`}>
        <Avatar initials={t.emp.initials} color={t.emp.color} size={40} />
        {active && <i className="absolute -bottom-0.5 -right-0.5 h-3 w-3 animate-pulse2 rounded-full bg-ok ring-2 ring-white" />}
      </button>
      <button onClick={onOpen} className="min-w-0 flex-1 text-left">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[14px] font-semibold">{t.emp.firstName} {t.emp.lastName}</span>
          <Badge tone={st.tone}>{st.label}</Badge>
        </div>
        <div className="mt-0.5 truncate text-[12.5px] text-ink-2">
          {t.status === 'pas_pointe' ? (t.planned ? `Prévu : ${t.planned}` : 'Rien de prévu aujourd’hui') : <>{t.place}{t.since && <span className="text-ink-3"> · {t.status === 'parti' ? 'parti à' : 'depuis'} {t.since.replace(':', ' h ')}</span>}</>}
        </div>
      </button>
      {t.status === 'pas_pointe' && t.planned && (
        <Button size="sm" variant="soft" className="hidden sm:inline-flex" icon={<BellRing className="h-3.5 w-3.5" />} onClick={() => toast(`Rappel envoyé à ${t.emp.firstName} par notification (démo).`)}>Rappeler de pointer</Button>
      )}
      <a href={`tel:${t.emp.phone.replace(/\s/g, '')}`} aria-label={`Appeler ${t.emp.firstName}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line text-ink-2 hover:bg-sub"><Phone className="h-4 w-4" /></a>
    </div>
  );
}

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
        title="Équipe"
        subtitle={`${employees.length} personne${employees.length > 1 ? 's' : ''} · ${onSite} sur le terrain en ce moment`}
        actions={<Button variant="dawn" icon={<UserPlus className="h-4 w-4" />} onClick={() => setInvite(true)}>Inviter</Button>}
      />

      <Card className="grid grid-cols-2 overflow-hidden md:grid-cols-4">
        <Link to="/app/pointage" className="block border-b border-r border-line transition hover:bg-[#fafafc] md:border-b-0">
          <div className="p-4">
            <div className="text-xs font-medium text-ink-2">Sur le terrain</div>
            <div className="num mt-1 text-[22px] font-semibold">{onSite}<span className="text-ink-3"> / {employees.length}</span></div>
            <div className="mt-0.5 text-xs text-ink-2">{missing.length ? `${missing.length} pas encore pointé` : 'tout le monde a pointé'}</div>
          </div>
        </Link>
        <Link to="/app/conges" className="block border-b border-line transition hover:bg-[#fafafc] md:border-b-0 md:border-r">
          <div className="p-4">
            <div className="text-xs font-medium text-ink-2">Congés à valider</div>
            <div className={cn('num mt-1 text-[22px] font-semibold', pendingLeaves && 'text-warn')}>{pendingLeaves}</div>
            <div className="mt-0.5 text-xs text-ink-2">en un geste</div>
          </div>
        </Link>
        <Link to="/app/habilitations" className="block border-r border-line transition hover:bg-[#fafafc]">
          <div className="p-4">
            <div className="text-xs font-medium text-ink-2">Habilitations</div>
            <div className={cn('num mt-1 text-[22px] font-semibold', habAlerts.length && 'text-bad')}>{habAlerts.length}</div>
            <div className="mt-0.5 text-xs text-ink-2">à renouveler sous 60 jours</div>
          </div>
        </Link>
        <Link to="/app/paie" className="block transition hover:bg-[#fafafc]">
          <div className="p-4">
            <div className="text-xs font-medium text-ink-2">Masse salariale brute</div>
            <div className="num mt-1 text-[22px] font-semibold">{money(payroll, true)}</div>
            <div className="mt-0.5 text-xs text-ink-2">par mois, hors heures sup</div>
          </div>
        </Link>
      </Card>

      <UnderlineTabs<Tab> value={tab} onChange={setTab} options={[
        { value: 'now', label: 'Maintenant' },
        { value: 'fiches', label: 'Fiches', count: employees.length },
        { value: 'roles', label: 'Rôles et droits' },
        { value: 'app', label: 'App ouvrier' },
      ]} />

      {employees.length === 0 && tab !== 'roles' && (
        <EmptyState icon={<Users />} title="Votre équipe arrive ici" text="Invitez vos compagnons : ils pointent depuis leur téléphone et vous voyez qui est où." action={<Button variant="primary" onClick={() => setInvite(true)}>Inviter une personne</Button>} />
      )}

      {tab === 'now' && employees.length > 0 && (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card>
            <CardHeader title="Qui est où" meta={new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} action={<Link to="/app/planning" className="-my-2 inline-flex min-h-10 items-center px-1 text-[12.5px] font-medium text-ink-2 hover:text-ink">Planning</Link>} />
            {team.map((t) => <NowRow key={t.emp.id} t={t} onOpen={() => setOpen(t.emp)} />)}
          </Card>
          <div className="space-y-4">
            {missing.length > 0 && (
              <Card className="border-[#fde3b5] bg-warn-bg/60 p-4">
                <div className="text-[13.5px] font-semibold">{missing.map((m) => m.emp.firstName).join(', ')} n’{missing.length > 1 ? 'ont' : 'a'} pas pointé</div>
                <p className="mt-1 text-[12.5px] text-ink-2">Prévu : {missing[0].planned}. Un retard, un oubli ? Un rappel part sur son téléphone.</p>
                <Button size="sm" variant="secondary" className="mt-3" icon={<BellRing className="h-3.5 w-3.5" />} onClick={() => toast('Rappel envoyé (démo).')}>Envoyer un rappel</Button>
              </Card>
            )}
            {habAlerts.length > 0 && (
              <Card className="p-4">
                <div className="text-[13.5px] font-semibold">À surveiller</div>
                <ul className="mt-1 space-y-0.5">
                  {habAlerts.slice(0, 3).map((h) => {
                    const e = employees.find((x) => x.id === h.employeeId)!;
                    const st = habState(h.expires);
                    return (
                      <li key={h.id}>
                        <Link to="/app/habilitations" className="-mx-2 flex min-h-10 items-center gap-2 rounded-lg px-2 text-[13px] hover:bg-sub">
                          <Avatar initials={e.initials} color={e.color} size={24} />
                          <span className="min-w-0 flex-1 truncate">{e.firstName} · {h.type.startsWith('caces') ? 'CACES' : h.type.startsWith('elec') ? 'Habilitation électrique' : h.type === 'sst' ? 'SST' : 'Formation'}</span>
                          <Badge tone={st.tone}>{st.label}</Badge>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            )}
          </div>
        </div>
      )}

      {tab === 'fiches' && employees.length > 0 && (
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="hidden grid-cols-[minmax(0,1.6fr)_1fr_.8fr_.8fr_1fr_.7fr_20px] gap-3 border-b border-line bg-[#fafafc] px-4 py-2.5 text-[11.5px] font-medium text-ink-2 lg:grid">
              <span>Personne</span><span>Contrat</span><span className="text-right">Coût horaire</span><span className="text-right">Congés</span><span>Habilitations</span><span>Téléphone</span><span />
            </div>
            {employees.map((e) => {
              const mine = habs.filter((h) => h.employeeId === e.id);
              const worst = mine.map((h) => habState(h.expires)).sort((a, b) => a.days - b.days)[0];
              return (
                <button key={e.id} onClick={() => setOpen(e)} className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-line px-4 py-3 text-left transition last:border-0 hover:bg-[#fafafc] lg:grid-cols-[minmax(0,1.6fr)_1fr_.8fr_.8fr_1fr_.7fr_20px]">
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
          </Card>

          {invitations.length > 0 && (
            <Card>
              <CardHeader title="Invitations envoyées" meta={`${invitations.length}`} />
              {invitations.map((i) => (
                <div key={i.id} className="flex min-h-[52px] items-center gap-3 border-b border-line px-4 py-2 last:border-0">
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
