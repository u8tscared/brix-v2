import { lazy, Suspense } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { PageLoader } from '@/components/layout/PageLoader';
import { ModuleGate } from '@/components/layout/ModuleGate';
import { MODULE_ROUTES } from '@/modules/registry';
import { useBrix } from '@/lib/store';
import { Accueil, DemarrageCloud, GardeCompte } from '@/pages/connexion/Garde';

const Cockpit = lazy(() => import('@/pages/cockpit/Cockpit'));
// Coque de l'appli (menu, barre du haut, palette, notifications) : chargée seulement pour /app,
// en même temps que l'accueil, pour que les pages publiques et l'inscription démarrent plus vite.
const loadShell = () => import('@/components/layout/AppShell');
const AppShell = lazy(loadShell);
// Ouverture directe de l'accueil (#/app) ou de la démo (#/demo) : coque et accueil se chargent en parallèle,
// sans attendre que le routeur les demande l'un après l'autre.
if (/^#\/demo(\?|$)/.test(window.location.hash) || (/^#\/app\/?$/.test(window.location.hash) && useBrix.getState().onboarded)) {
  void loadShell();
  void import('@/pages/cockpit/Cockpit');
}
// Synchronisation entre onglets (démo, signature, achats) : pas utile au premier affichage.
const SyncParcours = lazy(() => import('@/parcours/SyncParcours').then((m) => ({ default: m.SyncParcours })));
const Onboarding = lazy(() => import('@/pages/onboarding/Onboarding'));
const Welcome = lazy(() => import('@/pages/Welcome'));
const Demo = lazy(() => import('@/pages/Demo'));
const Connexion = lazy(() => import('@/pages/connexion/Connexion'));
const MotDePasse = lazy(() => import('@/pages/connexion/MotDePasse'));
// Autorisation d'une IA (Brix AI MCP, OAuth) : écran fourni par l'espace MCP.
const Autoriser = lazy(() => import('@/pages/autoriser/Autoriser'));
const ClientPortal = lazy(() => import('@/pages/public/ClientPortal'));
// Parcours externes : devis à signer, facture à payer, boîte e-mail de la démo.
const DevisPublic = lazy(() => import('@/pages/public/devis/DevisPublic'));
const FacturePublique = lazy(() => import('@/pages/public/facture/FacturePublique'));
const BoiteDemo = lazy(() => import('@/pages/public/boite/BoiteDemo'));
const Parcours = lazy(() => import('@/pages/public/Parcours'));
// Portail fournisseur (espace fournisseurs, autre chantier) : chargé s'il est présent.
const portailFournisseur = import.meta.glob<{ default: React.ComponentType }>('./modules/fournisseurs/PortailFournisseurPage.tsx');
const PortailFournisseur = lazy(portailFournisseur['./modules/fournisseurs/PortailFournisseurPage.tsx'] ?? (() => import('@/components/layout/Placeholder')));

/** Pas encore inscrit : direction l'accueil, sans charger la coque de l'appli. */
function SiInscrit({ children }: { children: React.ReactNode }) {
  const onboarded = useBrix((s) => s.onboarded);
  return onboarded ? <>{children}</> : <Navigate to="/bienvenue" replace />;
}

export default function App() {
  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Suspense fallback={null}>
        <SyncParcours />
      </Suspense>
      <DemarrageCloud />
      <Suspense fallback={<div className="p-8"><PageLoader /></div>}>
        <Routes>
          <Route path="/" element={<Accueil />} />
          <Route path="/bienvenue" element={<Welcome />} />
          <Route path="/inscription" element={<Onboarding />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/connexion" element={<Connexion />} />
          <Route path="/mot-de-passe" element={<MotDePasse />} />
          <Route path="/autoriser" element={<Autoriser />} />
          <Route path="/p/:token" element={<ClientPortal />} />
          <Route path="/d/:token" element={<DevisPublic />} />
          <Route path="/f/:token" element={<FacturePublique />} />
          <Route path="/parcours" element={<Parcours />} />
          <Route path="/boite" element={<BoiteDemo />} />
          <Route path="/boite/:id" element={<BoiteDemo />} />
          <Route path="/portail-fournisseur/:token" element={<PortailFournisseur />} />
          <Route path="/app" element={<GardeCompte><SiInscrit><AppShell /></SiInscrit></GardeCompte>}>
            <Route index element={<Cockpit />} />
            {MODULE_ROUTES.map(({ module, path, Component }) => (
              <Route key={path} path={path} element={<ModuleGate module={module}><Component /></ModuleGate>} />
            ))}
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Route>
          <Route path="*" element={<Accueil />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
