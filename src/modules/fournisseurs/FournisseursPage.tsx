// Espace Achats › Fournisseurs : point d'entrée chargé par src/modules/registry.tsx sur /app/fournisseurs/*.
import { lazy, Suspense } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { PageLoader } from '@/components/layout/AppShell';
import { cn } from '@/components/ui';
import { useAchatsPrets } from './data/useAchatsPrets';

const Accueil = lazy(() => import('./pages/Accueil'));
const Demandes = lazy(() => import('./pages/Demandes'));
const DemandeDetail = lazy(() => import('./pages/DemandeDetail'));
const Commandes = lazy(() => import('./pages/Commandes'));
const CommandeDetail = lazy(() => import('./pages/CommandeDetail'));
const Catalogue = lazy(() => import('./pages/Catalogue'));
const Annuaire = lazy(() => import('./pages/Annuaire'));
const Connecteurs = lazy(() => import('./pages/Connecteurs'));

const ONGLETS = [
  { to: '', label: 'Vue d’ensemble', end: true },
  { to: 'demandes', label: 'Demandes de prix' },
  { to: 'commandes', label: 'Commandes' },
  { to: 'catalogue', label: 'Prix' },
  { to: 'annuaire', label: 'Mes fournisseurs' },
  { to: 'connecteurs', label: 'Connexions' },
];

export default function FournisseursPage() {
  const pret = useAchatsPrets();
  return (
    <div className="space-y-5">
      <nav className="-mx-4 overflow-x-auto px-4 scrollbar-none md:mx-0 md:px-0" aria-label="Achats">
        <div className="flex w-max gap-1 rounded-[12px] border border-line bg-white p-1">
          {ONGLETS.map((o) => (
            <NavLink
              key={o.to}
              to={o.to}
              end={o.end}
              className={({ isActive }) => cn('flex h-10 items-center whitespace-nowrap md:h-9 rounded-[9px] px-3 text-[13px] font-medium transition', isActive ? 'bg-ink text-white' : 'text-ink-2 hover:bg-sub hover:text-ink')}
            >
              {o.label}
            </NavLink>
          ))}
        </div>
      </nav>
      {pret ? (
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route index element={<Accueil />} />
            <Route path="demandes" element={<Demandes />} />
            <Route path="demandes/:id" element={<DemandeDetail />} />
            <Route path="commandes" element={<Commandes />} />
            <Route path="commandes/:id" element={<CommandeDetail />} />
            <Route path="catalogue" element={<Catalogue />} />
            <Route path="annuaire" element={<Annuaire />} />
            <Route path="connecteurs" element={<Connecteurs />} />
            <Route path="*" element={<Navigate to="" replace />} />
          </Routes>
        </Suspense>
      ) : (
        <PageLoader />
      )}
    </div>
  );
}
