import { lazy, Suspense } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppShell, { PageLoader } from '@/components/layout/AppShell';
import { ModuleGate } from '@/components/layout/ModuleGate';
import { MODULE_ROUTES } from '@/modules/registry';
import { useBrix } from '@/lib/store';

const Cockpit = lazy(() => import('@/pages/cockpit/Cockpit'));
const Onboarding = lazy(() => import('@/pages/onboarding/Onboarding'));
const Welcome = lazy(() => import('@/pages/Welcome'));
const Demo = lazy(() => import('@/pages/Demo'));
const ClientPortal = lazy(() => import('@/pages/public/ClientPortal'));
// Parcours externes : devis à signer, facture à payer, boîte e-mail de la démo.
const DevisPublic = lazy(() => import('@/pages/public/devis/DevisPublic'));
const FacturePublique = lazy(() => import('@/pages/public/facture/FacturePublique'));
const BoiteDemo = lazy(() => import('@/pages/public/boite/BoiteDemo'));
// Portail fournisseur (espace fournisseurs, autre chantier) : chargé s'il est présent.
const portailFournisseur = import.meta.glob<{ default: React.ComponentType }>('./modules/fournisseurs/PortailFournisseurPage.tsx');
const PortailFournisseur = lazy(portailFournisseur['./modules/fournisseurs/PortailFournisseurPage.tsx'] ?? (() => import('@/components/layout/Placeholder')));

function Home() {
  const onboarded = useBrix((s) => s.onboarded);
  return <Navigate to={onboarded ? '/app' : '/bienvenue'} replace />;
}

export default function App() {
  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Suspense fallback={<div className="p-8"><PageLoader /></div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/bienvenue" element={<Welcome />} />
          <Route path="/inscription" element={<Onboarding />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/p/:token" element={<ClientPortal />} />
          <Route path="/d/:token" element={<DevisPublic />} />
          <Route path="/f/:token" element={<FacturePublique />} />
          <Route path="/boite" element={<BoiteDemo />} />
          <Route path="/boite/:id" element={<BoiteDemo />} />
          <Route path="/portail-fournisseur/:token" element={<PortailFournisseur />} />
          <Route path="/app" element={<AppShell />}>
            <Route index element={<Cockpit />} />
            {MODULE_ROUTES.map(({ module, path, Component }) => (
              <Route key={path} path={path} element={<ModuleGate module={module}><Component /></ModuleGate>} />
            ))}
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Route>
          <Route path="*" element={<Home />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
