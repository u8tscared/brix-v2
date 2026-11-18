import { useParams } from 'react-router-dom';
import { CalendarDays, MapPin } from 'lucide-react';
import { HaloBackdrop } from '@/components/layout/HaloBackdrop';
import { Ring } from '@/components/motion';
import '@/parcours/parcours.css';
import { EnTete } from './ui/EnTete';
import { LogoIcon } from '@/components/brand/Logo';
import { Avatar, Card, Toaster } from '@/components/ui';
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
    <div className="bx-root relative isolate min-h-dvh overflow-x-clip">
      <HaloBackdrop />
      <EnTete company={d.company} sous="Votre espace chantier" />

      <main className="bx-stagger relative mx-auto max-w-[560px] space-y-3.5 px-4 pb-[calc(32px+var(--safe-b))] pt-7">
        <div className="px-1 pb-1">
          <h1 className="title-halo">
            Bonjour {civ},
            <br />
            <span className="text-halo-mute">votre chantier avance.</span>
          </h1>
          {settings.welcome && (
            <div className="mt-3 flex items-start gap-2.5">
              {boss && <Avatar initials={boss.initials} size={32} />}
              <p className="rounded-[18px] rounded-tl-md bg-white px-3.5 py-2.5 text-[14px] leading-relaxed text-ink-2 shadow-halo">{settings.welcome}</p>
            </div>
          )}
        </div>

        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-5 sm:gap-7">
            <Ring value={d.chantier.progress} size={124} stroke={11} tone="dawn">
              <span className="flex flex-col items-center">
                <span className="num-halo text-[28px] leading-none">{d.chantier.progress} %</span>
                <span className="mt-1 text-[11.5px] font-medium text-ink-3">réalisés</span>
              </span>
            </Ring>
            <div className="min-w-0 flex-1">
              <div className="label-halo">{d.chantier.name.split('·')[0].trim()}</div>
              <div className="mt-1 text-[22px] font-semibold leading-tight tracking-[-0.035em]">{d.chantier.progress >= 100 ? 'Travaux terminés' : d.chantier.progress >= 50 ? 'Plus de la moitié faite' : 'Le chantier est lancé'}</div>
              <div className="mt-3 space-y-1.5 text-[13px]">
                <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-deep-p" strokeWidth={1.9} /><span className="text-ink-2">{d.chantier.address}, {d.chantier.city}</span></div>
                <div className="flex items-start gap-2"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-deep-v" strokeWidth={1.9} /><span className="text-ink-2">Fin prévue {dateLong(d.chantier.endDate)}</span></div>
              </div>
            </div>
          </div>
        </Card>

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
          <span className="glass mt-2 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2">Espace sécurisé par <LogoIcon className="h-4 w-4" /> <b className="font-semibold text-ink">Brix</b></span>
        </footer>
      </main>
      <Toaster />
    </div>
  );
}
