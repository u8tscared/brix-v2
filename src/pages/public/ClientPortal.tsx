import { useParams } from 'react-router-dom';
import { CalendarDays, MapPin } from 'lucide-react';
import '@/parcours/parcours.css';
import { EnTete } from './ui/EnTete';
import { LogoIcon } from '@/components/brand/Logo';
import { Avatar, Toaster } from '@/components/ui';
import { dateLong } from '@/lib/format';
import { Chat, Review } from '@/modules/visibilite/portal/Chat';
import { usePortalData } from '@/modules/visibilite/portal/data';
import { Docs } from '@/modules/visibilite/portal/Docs';
import { NextVisit, PCard, Photos, Steps } from '@/modules/visibilite/portal/Sections';
import { useVisi } from '@/modules/visibilite/store';

/** Espace public du client final (/p/:token) : suivi du chantier, documents, paiement, messages, avis. */
export default function ClientPortal() {
  const { token = 'demo' } = useParams();
  const d = usePortalData(token);
  const settings = useVisi((v) => v.portal);
  const boss = d.team.find((e) => e.role === 'patron') ?? d.team[0];
  const first = d.client.name.split(' ')[0];
  const civ = d.client.kind === 'particulier' ? first : d.client.contact ?? d.client.name;

  return (
    <div className="bx-root relative min-h-dvh overflow-x-clip bg-page">
      <div className="bx-sky bx-sky-top" />
      <EnTete company={d.company} sous="Votre espace chantier" />

      <main className="bx-stagger relative mx-auto max-w-[560px] space-y-3.5 px-4 pb-[calc(32px+var(--safe-b))] pt-5">
        <div className="px-1">
          <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.04em]">Bonjour {civ}</h1>
          {settings.welcome && (
            <div className="mt-3 flex items-start gap-2.5">
              {boss && <Avatar initials={boss.initials} color="#1F389D" size={32} />}
              <p className="rounded-[18px] rounded-tl-md bg-white px-3.5 py-2.5 text-[14px] leading-relaxed text-ink-2 shadow-[0_0_0_1px_#ececf1]">{settings.welcome}</p>
            </div>
          )}
        </div>

        <PCard>
          <div className="text-[12.5px] font-medium text-ink-3">{d.chantier.name.split('·')[0].trim()}</div>
          <div className="mt-1 flex items-end justify-between gap-3">
            <span className="num font-display text-[52px] font-semibold leading-none tracking-[-0.03em] dawn-text">{d.chantier.progress} %</span>
            <span className="pb-1.5 text-right text-[12.5px] text-ink-2">des travaux<br />réalisés</span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-sub"><div className="h-full rounded-full bg-ink transition-[width] duration-1000" style={{ width: `${d.chantier.progress}%` }} /></div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
            <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" strokeWidth={1.75} /><span className="text-ink-2">{d.chantier.address}, {d.chantier.city}</span></div>
            <div className="flex items-start gap-2"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" strokeWidth={1.75} /><span className="text-ink-2">Fin prévue {dateLong(d.chantier.endDate)}</span></div>
          </div>
        </PCard>

        {settings.nextVisit && (
          <PCard title="Prochain passage">
            <NextVisit next={d.next} team={d.nextTeam} />
          </PCard>
        )}

        {settings.steps && (
          <PCard title="Où en est le chantier">
            <Steps chantier={d.chantier} />
          </PCard>
        )}

        {settings.photos && (
          <PCard title="Photos" meta="mises à jour chaque soir">
            <Photos count={d.chantier.photos} />
          </PCard>
        )}

        {settings.documents && (
          <PCard title="Documents et factures">
            <Docs devis={d.devis} factures={d.factures} situation={d.situation} payment={settings.payment} companyName={d.company.name} />
          </PCard>
        )}

        {settings.chat && (
          <PCard title="Messages" meta={`avec ${boss?.firstName ?? d.company.name}`}>
            <Chat proName={boss?.firstName ?? d.company.name} proInitials={boss?.initials ?? 'BE'} />
          </PCard>
        )}

        {settings.review && (
          <PCard title="Votre avis compte" meta="30 secondes">
            <Review proName={boss?.firstName ?? d.company.name} />
          </PCard>
        )}

        <footer className="flex flex-col items-center gap-1.5 pb-2 pt-4 text-center text-[11.5px] text-ink-3">
          <span>{d.company.legalName} · SIRET {d.company.siret}</span>
          <span className="flex items-center gap-1.5">Espace sécurisé par <LogoIcon className="h-4 w-4" /> Brix</span>
        </footer>
      </main>
      <Toaster />
    </div>
  );
}
