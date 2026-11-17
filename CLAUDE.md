# Brix V2 — conventions

App de gestion pour artisans du bâtiment (devis, factures, facture électronique, chantiers, planning, équipe, paie, achats, IA « Bob »).

## Stack
- Front : Vite + React 18 + TypeScript + Tailwind 3 + lucide-react + react-router-dom 6 (**HashRouter**, l'app tourne en statique), zustand.
- Back : Cloudflare Worker (`worker/src`), sans framework. Chaque module expose `handleXRoutes(request, env, pathname): Promise<Response | null>`. D1 en SQL brut, `schema.sql` par module.
- Pas de backend requis en preview : `src/lib/store.ts` (zustand persisté) contient toutes les données, avec la démo `src/lib/demo.ts` (Benali Électricité, Karim Benali, électricien à Villeurbanne, 4 personnes).

## Où mettre quoi
- `src/lib/catalog.ts` : départements, modules, métiers, tailles, offres. Source unique.
- `src/lib/types.ts`, `src/lib/format.ts` (money, totals, dates), `src/lib/status.ts` (libellés et couleurs de statuts).
- `src/components/ui` : kit maison (Button, Card, Badge, Input, Select, Field, Segmented, Sheet, PageHeader, EmptyState, Stat, Avatar, Progress, Row, Switch, Sparkline, toast, Icon). Toujours l'utiliser, ne rien dupliquer.
- `src/modules/<module>/` : pages des modules, enregistrées dans `src/modules/registry.tsx`.
- `src/pages/` : écrans CORE (cockpit, onboarding, accueil, portail public).
- `site/` : site vitrine (autre chantier). `src/modules/fournisseurs`, `worker/src/modules/{fournisseurs,api-publique,mcp}` : espace fournisseurs (autre chantier).

## Direction artistique « Aube » V3 (17/11/2026)
Voir `docs/design-system.md` pour le détail. En bref :
- Police **Geist** partout (titres, texte, chiffres), Geist Mono pour les références (D-2026-118). Titres serrés (-0,03 em).
- Fond lavande `--page #f6f5fb`, surfaces blanches `shadow-card` (filet 1 px + ombre légère), encre violet nuit `--ink #15122a`, secondaires `#5d5a72` / `#9794aa`.
- Dégradé d'aube `bg-dawn` : **une seule fois par écran**, sur le chiffre qui compte ou l'action principale.
- Chaque département a sa couleur (`DEPT_TONE` dans `src/components/ui/IconTile.tsx`) : icônes de modules sur `IconTile`.
- Motion : `src/components/motion` (AnimatedNumber, Reveal, Ring, GrowBar, DrawCheck, SuccessDot, LiveDot, usePresence). Sorties douces `ease-out-quint`, 150-600 ms.
- Logo : `BrandTile` / `BrandLogo` / `BrandSymbol` dans `src/components/brand/Logo.tsx`, jamais redessiné.
- Icônes Lucide, trait 1,75. Rien qui « fasse IA » : pas d'étincelles, pas de violet fluo gratuit.
- Responsive obligatoire : téléphone (< 768 px, barre d'onglets en bas, cibles 44 px), tablette (768-1279 px, menu replié), ordinateur (≥ 1280 px).
- Textes en français simple, tutoiement pour Bob, vouvoiement ailleurs. Public non technophile : une action principale par écran, jamais de jargon.

## Règles
- Fichiers de 500 lignes maximum idéalement, 1000 au grand maximum : découper en sous-composants.
- Imports absolus `@/…`.
- `npm run typecheck` et `npm run build` doivent passer.
