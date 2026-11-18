// Registre des écrans de modules : chaque route de /app est rattachée à un module
// du catalogue. Une route dont le module est désactivé affiche l'écran
// « Activer ce module » au lieu de la page.

import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { ModuleKey } from '@/lib/catalog';

export interface ModuleRouteDef {
  module: ModuleKey | null; // null = toujours accessible
  path: string; // relatif à /app
  Component: LazyExoticComponent<ComponentType>;
}

const r = (module: ModuleKey | null, path: string, load: () => Promise<{ default: ComponentType }>): ModuleRouteDef => ({ module, path, Component: lazy(load) });

// Espace fournisseurs construit dans un autre chantier (src/modules/fournisseurs/FournisseursPage.tsx).
// S'il n'est pas encore présent, on affiche l'écran d'attente.
const fournisseursLoaders = import.meta.glob<{ default: ComponentType }>('./fournisseurs/FournisseursPage.tsx');
const loadFournisseurs = fournisseursLoaders['./fournisseurs/FournisseursPage.tsx'] ?? (() => import('@/components/layout/Placeholder'));

export const MODULE_ROUTES: ModuleRouteDef[] = [
  // Vendre
  r('leads', 'demandes', () => import('./vendre/Demandes')),
  r('clients', 'clients', () => import('./vendre/Clients')),
  r('clients', 'clients/:id', () => import('./vendre/ClientDetail')),
  r('rdv', 'rendez-vous', () => import('./vendre/RendezVous')),
  r('avis', 'avis', () => import('./vendre/Avis')),
  r('devis', 'devis', () => import('./devis/DevisList')),
  r('devis', 'devis/:id', () => import('./devis/DevisEditor')),
  // Facturer
  r('factures', 'factures', () => import('./factures/FacturesList')),
  r('factures', 'factures/:id', () => import('./factures/FactureDetail')),
  r('efacture', 'facture-electronique', () => import('./factures/EFacture')),
  r('paiements', 'paiements', () => import('./finance/Paiements')),
  r('relances', 'relances', () => import('./finance/Relances')),
  r('tresorerie', 'tresorerie', () => import('./finance/Tresorerie')),
  r('frais', 'notes-de-frais', () => import('./finance/NotesDeFrais')),
  // Chantiers
  r('chantiers', 'chantiers', () => import('./chantiers/ChantiersList')),
  r('chantiers', 'chantiers/:id', () => import('./chantiers/ChantierDetail')),
  r('planning', 'planning', () => import('./chantiers/Planning')),
  r('cotes', 'prise-de-cotes', () => import('./chantiers/Cotes')),
  r('photos', 'photos', () => import('./chantiers/Photos')),
  r('pv', 'pv-reception', () => import('./chantiers/PvReception')),
  r('sav', 'sav', () => import('./chantiers/Sav')),
  // Équipe
  r('equipe', 'equipe', () => import('./equipe/Equipe')),
  r('pointage', 'pointage', () => import('./equipe/Pointage')),
  r('conges', 'conges', () => import('./equipe/Conges')),
  r('habilitations', 'habilitations', () => import('./equipe/Habilitations')),
  r('paie', 'paie', () => import('./equipe/Paie')),
  // Achats
  r('fournisseurs', 'fournisseurs/*', loadFournisseurs),
  r('stocks', 'stock', () => import('./achats/Stock')),
  r('vehicules', 'vehicules', () => import('./achats/Vehicules')),
  r('soustraitants', 'sous-traitants', () => import('./achats/SousTraitants')),
  // Bob
  r('bob', 'bob', () => import('./bob/BobPage')),
  r('brief', 'bob/brief', () => import('./bob/Brief')),
  r('agent_nuit', 'bob/nuit', () => import('./bob/AgentNuit')),
  r('secretaire', 'bob/secretaire', () => import('./bob/Secretaire')),
  r('mcp', 'bob/mcp', () => import('./fournisseurs/mcp/BrixAiPage')),
  // Métier
  r('outils_metier', 'outils', () => import('./metier/Outils')),
  r('outils_metier', 'outils/:tool', () => import('./metier/Outils')),
  // Visibilité
  r('site', 'site', () => import('./visibilite/SiteVitrine')),
  r('reseaux', 'reseaux', () => import('./visibilite/Reseaux')),
  r('portail', 'portail', () => import('./visibilite/Portail')),
  // Gestion
  r('compta', 'compta', () => import('./finance/Compta')),
  r('documents', 'documents', () => import('./gestion/Documents')),
  r(null, 'reglages', () => import('./gestion/Reglages')),
  r(null, 'reglages/:tab', () => import('./gestion/Reglages')),
];
