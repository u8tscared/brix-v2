import { useState } from 'react';
import { ArrowUpRight, FileDown, Inbox as Inbox_, Send, TriangleAlert } from 'lucide-react';
import { IconTile, PageHeader, UnderlineTabs, type HaloTone } from '@/components/ui';
import { AnimatedNumber } from '@/components/motion';
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
      <PageHeader icon={<IconTile name="ShieldCheck" dept="facturer" size="lg" />} kicker="Facturer et encaisser" title="Facture électronique" titleMuted="tout est prêt, rien à apprendre." subtitle="La réforme 2026-2027, gérée pour vous de bout en bout." />
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
            <QuickStat icon={<Send />} tone="violet" label="Factures envoyées par la plateforme" value={sent} onClick={() => setTab('journal')} />
            <QuickStat icon={<Inbox_ />} tone="peach" label="Factures fournisseurs à valider" value={todo} onClick={() => setTab('recues')} />
            <QuickStat icon={<FileDown />} tone="blue" label="Factures fournisseurs reçues ce mois" value={SUPPLIER_INVOICES.length} onClick={() => setTab('recues')} />
            <QuickStat icon={<TriangleAlert />} tone="rose" label="Rejets ou litiges" value={factures.filter((f) => f.einvoice.status === 'refusee' || f.einvoice.status === 'litige').length} onClick={() => setTab('journal')} />
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

function QuickStat({ icon, tone, label, value, onClick }: { icon: React.ReactNode; tone: HaloTone; label: string; value: number; onClick: () => void }) {
  return (
    <button className="lift group flex flex-col rounded-card bg-white p-4 text-left shadow-halo md:p-5" onClick={onClick}>
      <div className="flex w-full items-start">
        <IconTile icon={icon} tone={tone} />
        <ArrowUpRight className="ml-auto h-4 w-4 text-[#b7b3c7] transition duration-300 ease-spring group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
      </div>
      <div className="num-halo mt-4 text-[30px]"><AnimatedNumber value={value} duration={600} /></div>
      <div className="mt-1 text-[12.5px] leading-snug text-ink-2">{label}</div>
    </button>
  );
}
