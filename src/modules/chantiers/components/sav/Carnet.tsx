import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Wrench } from 'lucide-react';
import { Avatar, Badge, Card, CardHeader, EmptyState, Icon, IconTile, Select } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { dateFull, dateShort } from '@/lib/format';
import { useChantiersLocal } from '../../store';
import { EQUIPMENT, contractState, dueOf } from './savUtils';

/** Carnet d'entretien d'un client : ses équipements et l'historique des visites. */
export function Carnet() {
  const { clients, employees } = useBrix();
  const { contracts, visits } = useChantiersLocal();
  const withHistory = clients.filter((c) => contracts.some((x) => x.clientId === c.id) || visits.some((v) => v.clientId === c.id));
  const [clientId, setClientId] = useState(withHistory[0]?.id ?? '');
  const client = clients.find((c) => c.id === clientId);
  const eq = contracts.filter((c) => c.clientId === clientId);
  const hist = visits.filter((v) => v.clientId === clientId).sort((a, b) => b.date.localeCompare(a.date));

  if (!withHistory.length) return <EmptyState icon={<BookOpen />} title="Carnet vide" text="Chaque entretien et chaque dépannage s’ajoutent ici, client par client." />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select value={clientId} onChange={(e) => setClientId(e.target.value)} className="sm:w-72" aria-label="Client">
          {withHistory.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        {client && <Link to={`/app/clients/${client.id}`} className="text-[13px] text-ink-2 hover:text-ink sm:ml-2">{client.address}, {client.city}</Link>}
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Card className="h-fit">
          <CardHeader title="Équipements suivis" meta={String(eq.length)} />
          {eq.length === 0 && <p className="p-4 text-[13px] text-ink-3">Aucun contrat pour ce client.</p>}
          {eq.map((c) => {
            const st = contractState(c);
            return (
              <div key={c.id} className="flex items-center gap-3 border-b border-halo-line px-4 py-3 last:border-b-0">
                <IconTile tone="peach" icon={<Icon name={EQUIPMENT[c.equipment].icon} />} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-medium">{c.label}</div>
                  <div className="text-xs text-ink-3">{c.brand ? `${c.brand} · ` : ''}posé le {dateFull(c.installedAt)}</div>
                </div>
                <div className="text-right">
                  <Badge tone={st.tone}>{st.label}</Badge>
                  <div className="mt-1 text-[11px] text-ink-3">échéance {dateShort(dueOf(c))}</div>
                </div>
              </div>
            );
          })}
        </Card>
        <Card>
          <CardHeader title="Historique des visites" meta={String(hist.length)} />
          {hist.length === 0 && <p className="p-4 text-[13px] text-ink-3">Pas encore de visite.</p>}
          <ol className="px-4 py-3">
            {hist.map((v, i) => {
              const emp = employees.find((e) => e.id === v.employeeId);
              const ct = contracts.find((c) => c.id === v.contractId);
              return (
                <li key={v.id} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < hist.length - 1 && <span className="absolute left-[15px] top-8 h-[calc(100%-24px)] w-px bg-halo-line" />}
                  {emp ? <Avatar initials={emp.initials} color={emp.color} size={30} /> : <span className="grid h-[30px] w-[30px] place-items-center rounded-full bg-pale-p text-deep-p"><Wrench className="h-3.5 w-3.5" /></span>}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-[13px]">
                      <span className="font-medium">{v.kind === 'entretien' ? 'Entretien' : 'Dépannage'}</span>
                      {ct && <span className="text-ink-3">· {EQUIPMENT[ct.equipment].label}</span>}
                      <span className="num ml-auto text-xs text-ink-3">{dateFull(v.date)}</span>
                    </div>
                    <p className="mt-0.5 text-[13px] text-ink-2">{v.notes}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>
      </div>
    </div>
  );
}
