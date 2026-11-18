# Brief Halo pour l'app Brix (à supprimer avant la PR)

Marceau (fondateur de Brix, logiciel de gestion pour artisans du bâtiment) a choisi la direction design **Halo** et veut qu'elle soit appliquée à **tout le logiciel**. Ce sont des améliorations dans le même thème : DA « Aube » (dégradé violet #6d28d9 → magenta #d946ef → pêche #fb923c), logo tuile Aube + B blanc (src/components/brand/Logo.tsx), Geist + Geist Mono, icônes Lucide. Objectif : « ultra clean, ultra stylé, une expérience de dingue », niveau Alan / Apple Wallet / Qonto. Rien qui « fasse IA » : pas d'icône `Sparkles`, pas d'émojis.

## Référence visuelle
Maquette Halo validée : `/home/claude/directions/index.html`, objet `B` (fonctions `dash` = tableau de bord, `devis` = éditeur de devis, `sign` = signature client sur téléphone) et CSS `.dB`. Ouvre-la (Playwright ou lecture du code) et reproduis son langage :
- fond nacré #f7f5fc avec **halos Aube diffus** (taches floues violet / magenta / pêche) en haut de l'écran ;
- barre de navigation en **pilule de verre** flottante, onglets en pilules (actif = pilule blanche avec ombre) ;
- **cartes blanches 22 px** qui flottent, ombres teintées violet (`0 1px 2px rgba(60,30,120,.04), 0 12px 36px -14px rgba(60,30,120,.14)`), survol qui soulève ;
- **pastilles d'icônes colorées par domaine** (fond pâle + encre franche : violet, magenta, pêche, vert, bleu…) ;
- boutons **pilule** ; action principale en **dégradé Aube avec lueur** ; secondaires blancs ;
- chips arrondies, grands chiffres serrés (Geist 600, -0.05em), titres 40 px ;
- anneau d'objectif qui se ferme, compteurs, entrées en cascade, ressorts légers ;
- devis : étapes en pastilles (faite = vert, en cours = dégradé), lignes en cartes 16 px avec pastille, aperçu A4 flottant légèrement incliné, carte total en dégradé très pâle ;
- signature client : en-tête halo, carte « Vérifié », montant énorme, liste en carte, « glisser pour signer », écran de succès avec anneaux concentriques et coche qui se dessine, paiement Apple Pay.

## Code
Dépôt : `/home/claude/brix-app` (Vite + React 18 + TS + Tailwind 3 + zustand, HashRouter). Système de design actuel : `docs/design-system.md`, `tailwind.config.js`, `src/index.css`, kit `src/components/ui`, motion `src/components/motion`, coque `src/components/layout`. Couleurs par département : `DEPT_TONE` dans `src/components/ui/IconTile.tsx`.
Démo : `npm run dev` puis `#/demo` (Benali Électricité), `#/demo?metier=plombier`, parcours publics `#/parcours`.
Contrôles : `npx tsc -b`, `npm test`, `npx vite build`. Captures Playwright (`require('playwright')`, chromium installé) en 1440×900 et 390×844. Regarde vraiment tes captures et corrige ce qui est moche ou cassé.

## Règles
- Garde toutes les fonctionnalités, routes, textes, l'accessibilité et `prefers-reduced-motion`. Aucun débordement horizontal à 390 px, aucune erreur console.
- **Ne fais aucun commit git.** Plusieurs agents peuvent travailler dans ce dossier ; ne touche qu'à ton lot.
- Pour lancer un serveur, utilise le port indiqué dans ta mission.
- Rapport final court : fichiers modifiés, ce qui a changé, ce qui reste.

## Phase écrans (après le socle)
Le socle Halo est posé et commité : lis `docs/design-system.md` (section « Recettes d'écran » et la liste des nouvelles classes/props), puis regarde `src/components/ui`, `src/components/layout/HaloBackdrop.tsx`.
Règles écrans : pas de `bg-page` ni de fond opaque pleine largeur (ça cache le halo, utiliser `glass`) ; remplacer les `rounded-[16px]`, `shadow-card`, `bg-sub`, `bg-[#f4f3f8]` codés en dur par `<Card>`, `rounded-card`, tons pâles ; `variant="dawn"` une seule fois par écran sur l'action principale ; pastilles `IconTile` colorées ; grands chiffres `num-halo` ; listes en `row-card` ; bannières sombres de Bob adoucies (Bob = assistant calme, logo B, jamais d'étincelles).
Ne modifie pas `src/components/*`, `src/lib/*`, `src/modules/registry.tsx`, `tailwind.config.js`, `src/index.css` : si tu as besoin d'un ajout au socle, crée un composant local dans ton module ou note-le dans ton rapport.
Build sans gêner les autres : `npx vite build --outDir /tmp/<lot>-dist` ; serveur : `npx vite --port <ton port>`. Avant de rendre : `npx tsc -b` sans erreur sur tes fichiers.
