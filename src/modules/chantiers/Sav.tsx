import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button, Card, PageHeader, Segmented, Stat } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { dateShort, money, todayISO } from '@/lib/format';
import { useChantiersLocal, useChantiersSeed } from './store';
import { addMonths, contractState, dueOf } from './components/sav/savUtils';
import { ContractsList, InterventionsList } from './components/sav/SavLists';
import { Carnet } from './components/sav/Carnet';
import { NewContractSheet, NewInterventionSheet, PlanSheet, type PlanTarget } from './components/sav/SavSheets';

type Tab = 'interventions' | 'contrats' | 'carnet';

export default function Sav() {
  useChantiersSeed();
  const clients = useBrix((s) => s.clients);
  const { contracts, interventions } = useChantiersLocal();
  const [tab, setTab] = useState<Tab>('interventions');
  const [done, setDone] = useState<'ouvertes' | 'terminees'>('ouvertes');
  const [plan, setPlan] = useState<PlanTarget | null>(null);
  const [newIt, setNewIt] = useState(false);
  const [newCt, setNewCt] = useState(false);

  const known = (id: string) => clients.some((c) => c.id === id);
  const myContracts = contracts.filter((c) => known(c.clientId));
  const open = interventions.filter((i) => known(i.clientId) && i.status !== 'terminee');
  const urgent = open.filter((i) => i.priority === 'urgente').length;
  const toPlan = myContracts.filter((c) => ['retard', 'bientot'].includes(contractState(c).key));
  const recurring = myContracts.reduce((s, c) => s + c.priceHt * (12 / c.frequencyMonths), 0);
  const nextReminder = myContracts.filter((c) => c.reminder && contractState(c).key !== 'planifie').map((c) => addMonths(dueOf(c), -1)).filter((d) => d >= todayISO()).sort()[0];

  return (
    <div className="space-y-5">
      <PageHeader
        title="SAV et entretien"
        subtitle="Pannes à traiter, contrats d’entretien et rappels annuels automatiques."
        actions={
          <>
            <Button onClick={() => setNewCt(true)} icon={<Plus className="h-4 w-4" />}>Contrat</Button>
            <Button variant="primary" onClick={() => setNewIt(true)} icon={<Plus className="h-4 w-4" />}>Demande de SAV</Button>
          </>
        }
      />

      <Card className="grid grid-cols-2 gap-px overflow-hidden bg-line md:grid-cols-4">
        <Stat className="bg-white" label="Revenu d’entretien annuel" value={money(recurring, true)} hero sub={`${myContracts.length} contrats HT`} />
        <Stat className="bg-white" label="Demandes ouvertes" value={String(open.length)} sub={urgent ? <span className="text-bad">{urgent} urgente{urgent > 1 ? 's' : ''}</span> : 'rien d’urgent'} />
        <Stat className="bg-white" label="Entretiens à planifier" value={String(toPlan.length)} sub={toPlan.length ? `dont ${toPlan.filter((c) => contractState(c).key === 'retard').length} en retard` : 'tout est calé'} />
        <Stat className="bg-white" label="Rappels automatiques" value={String(myContracts.filter((c) => c.reminder).length)} sub={nextReminder ? `prochain le ${dateShort(nextReminder)}${nextReminder.slice(0, 4) !== todayISO().slice(0, 4) ? ' ' + nextReminder.slice(0, 4) : ''}` : 'envoyés par Bob au client'} />
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'interventions', label: 'Interventions', count: open.length },
            { value: 'contrats', label: 'Contrats d’entretien', count: myContracts.length },
            { value: 'carnet', label: 'Carnet par client' },
          ]}
        />
        {tab === 'interventions' && (
          <Segmented size="sm" value={done} onChange={setDone} options={[{ value: 'ouvertes', label: 'À traiter' }, { value: 'terminees', label: 'Terminées' }]} />
        )}
      </div>

      <div key={tab} className="animate-fade-up">
        {tab === 'interventions' && <InterventionsList onPlan={setPlan} filter={done} />}
        {tab === 'contrats' && <ContractsList onPlan={setPlan} />}
        {tab === 'carnet' && <Carnet />}
      </div>

      <PlanSheet target={plan} onClose={() => setPlan(null)} />
      <NewInterventionSheet open={newIt} onClose={() => setNewIt(false)} />
      <NewContractSheet open={newCt} onClose={() => setNewCt(false)} />
    </div>
  );
}
