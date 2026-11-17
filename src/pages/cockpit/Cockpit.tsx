import { useNavigate } from 'react-router-dom';
import { FileText, Mic, Plus } from 'lucide-react';
import { LiveDot } from '@/components/motion';
import { Button, cn } from '@/components/ui';
import { capitalize, dateLong, greeting, todayISO } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { useUI } from '@/lib/ui';
import { MoneyHero } from './parts/MoneyHero';
import { NightShift } from './parts/NightShift';
import { PipelineCard } from './parts/PipelineCard';
import { SetupBar } from './parts/SetupBar';
import { SitesCard } from './parts/SitesCard';
import { TeamTimeline } from './parts/TeamTimeline';
import { TodayActions } from './parts/TodayActions';
import { TradeTools } from './parts/TradeTools';
import { useCockpitData } from './useCockpitData';

/**
 * Accueil « Aujourd'hui ». Une seule chose en grand (l'argent du mois), puis ce qu'il faut faire,
 * ce que Bob a préparé, les devis, les chantiers et l'équipe. Sur téléphone : pensé pour le pouce.
 */
export default function Cockpit() {
  const s = useBrix();
  const ui = useUI();
  const navigate = useNavigate();
  const data = useCockpitData();
  const solo = s.company.size === 'solo' || s.employees.length < 2;
  const onSite = s.employees.filter((e) => e.clockedInAt).length;
  const empty = s.devis.length === 0 && s.factures.length === 0;
  const date = capitalize(dateLong(todayISO()));

  return (
    <div className="space-y-5 md:space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="text-[13px] font-medium text-ink-3">{date}</div>
          <h1 className="mt-0.5 text-[30px] font-semibold leading-[1.08] tracking-[-0.04em] md:text-[34px]">
            {greeting()} {s.user.firstName}
          </h1>
          {!empty && (
            <p className="mt-1.5 hidden text-[13.5px] text-ink-2 md:block">
              {data.activeChantiers.length} chantier{data.activeChantiers.length > 1 ? 's' : ''} en cours · {data.pending.length} devis attendent une signature{data.late.length ? ` · ${data.late.length} retard${data.late.length > 1 ? 's' : ''} de paiement` : ''}
            </p>
          )}
        </div>
        <div className="hidden items-center gap-2 md:flex">
          {!solo && onSite > 0 && (
            <span className="mr-1 hidden items-center gap-2 whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-[12.5px] text-ink-2 shadow-card xl:flex">
              <LiveDot /> {onSite} sur chantier
            </span>
          )}
          <Button variant="secondary" icon={<Mic className="h-4 w-4" />} kbd="⌘J" onClick={() => ui.askBob('', true)}>Parler à Bob</Button>
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} kbd="N" onClick={() => navigate('/app/devis/nouveau')}>Nouveau devis</Button>
        </div>
      </header>

      <SetupBar />

      {empty ? (
        <EmptyHome onBob={() => ui.askBob('', true)} onNew={() => navigate('/app/devis/nouveau')} />
      ) : (
        <div className="flex flex-col gap-5 md:gap-6 xl:grid xl:grid-cols-12">
          <MoneyHero data={data} className="order-1 xl:order-none xl:col-span-7" />
          <TodayActions data={data} className="order-2 xl:order-none xl:col-span-5" />
          <NightShift className="order-3 xl:order-none xl:col-span-7" />
          <PipelineCard data={data} className="order-6 xl:order-none xl:col-span-5" />
          <SitesCard data={data} className={cn('order-4 xl:order-none', 'xl:col-span-12')} />
          {!solo && <TeamTimeline data={data} className="order-7 hidden md:flex xl:order-none xl:col-span-12" />}
          <div className="order-5 md:hidden"><TradeTools /></div>
        </div>
      )}
    </div>
  );
}

function EmptyHome({ onBob, onNew }: { onBob: () => void; onNew: () => void }) {
  return (
    <section className="relative overflow-hidden rounded-[22px] bg-white px-6 py-12 text-center shadow-card md:py-16">
      <div className="pointer-events-none absolute inset-x-0 -top-32 mx-auto h-64 w-[520px] max-w-full rounded-full bg-dawn-soft blur-3xl" aria-hidden />
      <span className="relative mx-auto grid h-14 w-14 animate-float place-items-center rounded-[18px] bg-white text-vi-700 shadow-lift"><FileText className="h-6 w-6" strokeWidth={1.75} /></span>
      <h2 className="relative mt-5 text-[22px] font-semibold tracking-[-0.03em]">Votre accueil se remplira tout seul</h2>
      <p className="relative mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-ink-2">Commencez par un devis : dites-le à Bob ou tapez-le. Dès qu’il est signé, le chantier, la facture d’acompte et le planning se créent.</p>
      <div className="relative mt-6 flex flex-col justify-center gap-2 sm:flex-row">
        <Button variant="secondary" size="lg" icon={<Mic className="h-[18px] w-[18px]" />} onClick={onBob}>Dicter à Bob</Button>
        <Button variant="primary" size="lg" icon={<Plus className="h-[18px] w-[18px]" />} onClick={onNew}>Nouveau devis</Button>
      </div>
    </section>
  );
}
