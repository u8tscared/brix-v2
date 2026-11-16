import { lazy, Suspense } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader, UnderlineTabs } from '@/components/ui';
import { PageLoader } from '@/components/layout/AppShell';

const TABS = {
  entreprise: { label: 'Entreprise', C: lazy(() => import('./components/reglages/EntrepriseTab')) },
  modules: { label: 'Modules', C: lazy(() => import('./components/reglages/ModulesTab')) },
  offre: { label: 'Offre', C: lazy(() => import('./components/reglages/OffreTab')) },
  equipe: { label: 'Équipe', C: lazy(() => import('./components/reglages/EquipeTab')) },
  integrations: { label: 'Intégrations', C: lazy(() => import('./components/reglages/IntegrationsTab')) },
  compte: { label: 'Compte', C: lazy(() => import('./components/reglages/CompteTab')) },
} as const;
type TabKey = keyof typeof TABS;

export default function Reglages() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const current: TabKey = tab && tab in TABS ? (tab as TabKey) : 'entreprise';
  const { C } = TABS[current];
  return (
    <div className="space-y-5">
      <PageHeader title="Réglages" subtitle="Votre entreprise, vos outils, votre offre." />
      <UnderlineTabs value={current} onChange={(v) => navigate(`/app/reglages/${v}`)} options={(Object.keys(TABS) as TabKey[]).map((k) => ({ value: k, label: TABS[k].label }))} />
      <Suspense fallback={<PageLoader />}>
        <C />
      </Suspense>
    </div>
  );
}
