import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Mic, Plus } from 'lucide-react';
import { LiveDot } from '@/components/motion';
import { Button, EmptyState, PageHeader } from '@/components/ui';
import { capitalize, dateLong, greeting, todayISO } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { useUI } from '@/lib/ui';
import { AgendaCard } from './parts/AgendaCard';
import { GoalCard } from './parts/GoalCard';
import { KpiCards } from './parts/KpiCards';
import { NightShift } from './parts/NightShift';
import { PipelineCard } from './parts/PipelineCard';
import { ReminderCard } from './parts/ReminderCard';
import { SetupBar } from './parts/SetupBar';
import { SitesCard } from './parts/SitesCard';
import { TeamTimeline } from './parts/TeamTimeline';
import { TodayActions } from './parts/TodayActions';
import { TradeTools } from './parts/TradeTools';
import { useCockpitData } from './useCockpitData';

const clock = () => {
  const d = new Date();
  return `${d.getHours()} h ${String(d.getMinutes()).padStart(2, '0')}`;
};

/** Seconde ligne du titre, grisée : le ton de la journée. */
function mood(late: number, h = new Date().getHours()) {
  if (h >= 18) return 'la journée se termine.';
  if (late > 2) return 'quelques relances, et c’est bon.';
  return h < 12 ? 'belle journée en vue.' : 'bel après-midi en vue.';
}

/**
 * Accueil Halo. L'objectif du mois en grand (anneau qui se ferme), trois cartes chiffrées,
 * puis la journée : agenda, rappel de Bob, choses à faire, devis, chantiers et équipe.
 * Ordinateur : colonne principale + colonne de 360 px. Téléphone : une seule pile pensée pour le pouce.
 */
export default function Cockpit() {
  const s = useBrix();
  const ui = useUI();
  const navigate = useNavigate();
  const data = useCockpitData();
  const solo = s.company.size === 'solo' || s.employees.length < 2;
  const onSite = s.employees.filter((e) => e.clockedInAt).length;
  const empty = s.devis.length === 0 && s.factures.length === 0;
  const [time, setTime] = useState(clock);
  useEffect(() => {
    const t = setInterval(() => setTime(clock()), 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-6 md:space-y-7">
      <PageHeader
        kicker={
          <>
            {capitalize(dateLong(todayISO()))} · <span className="num">{time}</span>
          </>
        }
        title={`${greeting()} ${s.user.firstName},`}
        titleMuted={empty ? 'on commence ?' : mood(data.late.length)}
        actions={
          <div className="hidden items-center gap-2 md:flex">
            {!solo && onSite > 0 && (
              <span className="glass mr-1 hidden h-9 items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-[12.5px] font-medium text-ink-2 xl:inline-flex">
                <LiveDot /> {onSite} sur chantier
              </span>
            )}
            <Button variant="secondary" icon={<Mic />} kbd="⌘J" onClick={() => ui.askBob('', true)}>
              Parler à Bob
            </Button>
            <Button variant="dawn" icon={<Plus />} kbd="N" onClick={() => navigate('/app/devis/nouveau')}>
              Nouveau devis
            </Button>
          </div>
        }
      />

      <SetupBar />

      {empty ? (
        <EmptyState
          icon={<FileText />}
          title="Votre accueil se remplira tout seul"
          text="Commencez par un devis : dites-le à Bob ou tapez-le. Dès qu’il est signé, le chantier, la facture d’acompte et le planning se créent."
          className="py-16"
          action={
            <div className="flex flex-col justify-center gap-2 sm:flex-row">
              <Button size="lg" icon={<Mic />} onClick={() => ui.askBob('', true)}>
                Dicter à Bob
              </Button>
              <Button variant="dawn" size="lg" icon={<Plus />} onClick={() => navigate('/app/devis/nouveau')}>
                Nouveau devis
              </Button>
            </div>
          }
        />
      ) : (
        <>
          {/* Téléphone : une pile ordonnée (les colonnes deviennent « contents »). Ordinateur : 2 colonnes. */}
          <div className="flex flex-col gap-4 md:gap-5 xl:grid xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start xl:gap-6">
            <div className="contents xl:flex xl:min-w-0 xl:flex-col xl:gap-6">
              <GoalCard data={data} className="order-1 min-w-0 animate-[fade-up_.55s_var(--ease)_both]" />
              <KpiCards data={data} className="order-3 min-w-0 animate-[fade-up_.55s_var(--ease)_both] [animation-delay:120ms]" />
              <TodayActions data={data} className="order-5 min-w-0 animate-[fade-up_.55s_var(--ease)_both] [animation-delay:240ms]" />
              <NightShift className="order-6 min-w-0 animate-[fade-up_.55s_var(--ease)_both] [animation-delay:300ms]" />
              <SitesCard data={data} className="order-8 min-w-0 animate-[fade-up_.55s_var(--ease)_both] [animation-delay:340ms]" />
            </div>
            <div className="contents xl:flex xl:flex-col xl:gap-6">
              <AgendaCard data={data} className="order-4 min-w-0 animate-[fade-up_.55s_var(--ease)_both] [animation-delay:80ms]" />
              <ReminderCard data={data} className="order-2 min-w-0 animate-[fade-up_.55s_var(--ease)_both] [animation-delay:160ms]" />
              <PipelineCard data={data} className="order-9 min-w-0 animate-[fade-up_.55s_var(--ease)_both] [animation-delay:260ms]" />
            </div>
            <div className="order-7 min-w-0 md:hidden">
              <TradeTools />
            </div>
          </div>
          {!solo && <TeamTimeline data={data} className="hidden md:flex" />}
        </>
      )}
    </div>
  );
}
