// Espace Achats › Fournisseurs : point d'entrée chargé par src/modules/registry.tsx sur /app/fournisseurs/*.
import '@/parcours/parcours.css';
import '@/modules/fournisseurs/fournisseurs.css';
import { lazy, Suspense } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { BookUser, Cable, LayoutGrid, PackageCheck, Scale, Tags } from 'lucide-react';
import { PageLoader } from '@/components/layout/AppShell';
import { cn } from '@/components/ui';
import { useSyncOnglets } from '@/parcours/sync';
import { useAchats } from '@/modules/fournisseurs/data/store';
import { useAchatsPrets } from '@/modules/fournisseurs/data/useAchatsPrets';

const Accueil = lazy(() => import('./pages/Accueil'));
const Demandes = lazy(() => import('./pages/Demandes'));
const DemandeDetail = lazy(() => import('./pages/DemandeDetail'));
const Commandes = lazy(() => import('./pages/Commandes'));
const CommandeDetail = lazy(() => import('./pages/CommandeDetail'));
const Catalogue = lazy(() => import('./pages/Catalogue'));
const Annuaire = lazy(() => import('./pages/Annuaire'));
const Connecteurs = lazy(() => import('./pages/Connecteurs'));

const BASE = '/app/fournisseurs';
const ONGLETS = [
  { to: BASE, label: 'Vue d’ensemble', icon: LayoutGrid, end: true },
  { to: `${BASE}/demandes`, label: 'Demandes de prix', icon: Scale },
  { to: `${BASE}/commandes`, label: 'Commandes', icon: PackageCheck },
  { to: `${BASE}/catalogue`, label: 'Prix', icon: Tags },
  { to: `${BASE}/annuaire`, label: 'Mes fournisseurs', icon: BookUser },
  { to: `${BASE}/connecteurs`, label: 'Connexions', icon: Cable },
];

export default function FournisseursPage() {
  const pret = useAchatsPrets();
  // Démo : le fournisseur répond dans un autre onglet, l'artisan le voit aussitôt ici.
  useSyncOnglets([useAchats]);
  return (
    <div className="bx-root space-y-6">
      <nav className="fx-nobar -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0" aria-label="Achats">
        <div className="glass flex w-max gap-1 rounded-pill p-1">
          {ONGLETS.map((o) => (
            <NavLink
              key={o.to}
              to={o.to}
              end={o.end}
              className={({ isActive }) =>
                cn(
                  'flex h-10 items-center gap-2 whitespace-nowrap rounded-pill px-4 text-[13px] font-medium transition-[background,color,box-shadow] duration-300 ease-out-quint md:h-9',
                  isActive ? 'bg-white text-ink shadow-pill' : 'text-ink-2 hover:bg-white/60 hover:text-ink',
                )
              }
            >
              <o.icon className="h-4 w-4" strokeWidth={1.75} />
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
            <Route path="*" element={<Navigate to={BASE} replace />} />
          </Routes>
        </Suspense>
      ) : (
        <PageLoader />
      )}
    </div>
  );
}
