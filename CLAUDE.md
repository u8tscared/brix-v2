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

## Direction artistique « Aube »
- Fond lavande `--page #f4f3fa`, surfaces blanches, filets fins `--line #ececf1`, encre `#17171f`, texte secondaire `#5f5f70` / `#9898a8`, bleu marque `#1F389D`.
- Dégradé d'aube `bg-dawn` (violet #6d28d9 → magenta #d946ef → pêche #fb923c) : **une seule fois par écran**, sur le chiffre qui compte ou l'action principale (`Button variant="dawn"`, `.dawn-text`).
- Titres Poppins (`font-display`), texte Inter, chiffres en `num` (tabular). Icônes Lucide uniquement, trait 1,75. Rien qui « fasse IA » (pas d'étincelles partout, pas de violet fluo gratuit).
- Logo officiel uniquement via `src/components/brand/Logo.tsx`, jamais redessiné.
- Responsive obligatoire : téléphone (< 768 px, barre d'onglets en bas, cibles 44 px), tablette (768-1279 px, menu replié), ordinateur (≥ 1280 px).
- Textes en français simple, tutoiement pour Bob, vouvoiement ailleurs. Public non technophile : une action principale par écran, jamais de jargon.

## Règles
- Fichiers de 500 lignes maximum idéalement, 1000 au grand maximum : découper en sous-composants.
- Imports absolus `@/…`.
- `npm run typecheck` et `npm run build` doivent passer.
