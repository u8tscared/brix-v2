import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Card, PageHeader, UnderlineTabs } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { Annuaire } from './components/efacture/Annuaire';
import { Inbox } from './components/efacture/Inbox';
import { Checklist, Countdown, PlatformCard } from './components/efacture/Overview';
import { EReporting, Journal } from './components/efacture/Reporting';
import { SUPPLIER_INVOICES } from './lib/suppliers';
import { useFactures } from './store';

type Tab = 'apercu' | 'recues' | 'annuaire' | 'ereporting' | 'journal';

export default function EFacture() {
  const [tab, setTab] = useState<Tab>('apercu');
  const inbox = useFactures((s) => s.inbox);
  const factures = useBrix((s) => s.factures);
  const todo = SUPPLIER_INVOICES.filter((i) => (inbox[i.id]?.state ?? 'a_traiter') === 'a_traiter').length;
  const sent = factures.filter((f) => f.einvoice.status !== 'non_transmise').length;

  return (
    <div className="space-y-5">
      <PageHeader title="Facture électronique" subtitle="La réforme 2026-2027, gérée pour vous de bout en bout." />
      <UnderlineTabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'apercu', label: 'Vue d’ensemble' },
          { value: 'recues', label: 'Factures reçues', count: todo || undefined },
          { value: 'annuaire', label: 'Annuaire' },
          { value: 'ereporting', label: 'E-reporting' },
          { value: 'journal', label: 'Journal' },
        ]}
      />

      {tab === 'apercu' && (
        <div className="space-y-5">
          <Countdown />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <QuickStat label="Factures envoyées par la plateforme" value={sent} onClick={() => setTab('journal')} />
            <QuickStat label="Factures fournisseurs à valider" value={todo} onClick={() => setTab('recues')} />
            <QuickStat label="Factures fournisseurs reçues ce mois" value={SUPPLIER_INVOICES.length} onClick={() => setTab('recues')} />
            <QuickStat label="Rejets ou litiges" value={factures.filter((f) => f.einvoice.status === 'refusee' || f.einvoice.status === 'litige').length} onClick={() => setTab('journal')} />
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <Checklist />
            <div className="space-y-5">
              <PlatformCard />
            </div>
          </div>
          <Journal limit={5} />
        </div>
      )}
      {tab === 'recues' && <Inbox />}
      {tab === 'annuaire' && <Annuaire />}
      {tab === 'ereporting' && <EReporting />}
      {tab === 'journal' && <Journal />}
    </div>
  );
}

function QuickStat({ label, value, onClick }: { label: string; value: number; onClick: () => void }) {
  return (
    <Card className="group cursor-pointer p-4 transition hover:shadow-card" onClick={onClick}>
      <div className="num text-[24px] font-semibold tracking-[-0.02em]">{value}</div>
      <div className="mt-1 flex items-end justify-between gap-2 text-[12.5px] leading-snug text-ink-2">
        {label}
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-3 transition group-hover:translate-x-0.5" />
      </div>
    </Card>
  );
}
