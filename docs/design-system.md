# Brix — système de design « Halo » (famille Aube)

Objectif : « ultra clean, ultra stylé », niveau Alan / Apple Wallet / Qonto. Une app qu'un artisan trouve **belle, claire et vivante**. Jamais « générée par une IA » : pas d'icône `Sparkles`, pas d'émojis, pas de dégradés partout, pas de cartes toutes identiques.

Référence visuelle : maquette `directions/index.html`, objet `B` (`dash`, `devis`, `sign`), CSS `.dB`.

## Principes
1. **Fond nacré, halo Aube.** Le fond `#f7f5fc` porte un halo Aube diffus (taches violet / magenta / pêche + conic flou) posé une fois par la coque (`<HaloBackdrop />`). Il tourne doucement avec le défilement. **Les écrans ne posent pas de fond opaque** : pas de `bg-page` sur un bloc pleine largeur (on masquerait le halo). Pour une barre collante : `glass`.
2. **Cartes blanches qui flottent.** `<Card>` ou `.surface` : blanc, 22 px, ombre teintée violet, pas de bordure grise. Cliquable = `interactive` (se soulève de 3 px). Lignes de liste / ouvrages = cartes 16 px (`.row-card` ou `<Card size="sm">`). Éviter les cartes dans les cartes.
3. **Tout ce qui se clique est une pilule.** Boutons, chips, onglets, recherche, barre du haut, barre d'onglets mobile.
4. **Une chose importante par écran.** Le dégradé Aube plein (`variant="dawn"`, `dawn-text`, anneau `tone="dawn"`) marque l'action principale ou le chiffre clé, une seule fois.
5. **Couleur = sens.** Chaque domaine a son ton pâle (fond pâle + encre franche). Statuts : vert ok, ambre warn, rose bad, violet = en cours / Brix.
6. **Hiérarchie par la typo.** Titres 40 px serrés (Geist 600, −0,045 em), seconde ligne grisée ; grands chiffres serrés (−0,05 em) ; libellés 13 px `text-ink-2`.
7. **Le mouvement explique.** Apparition en cascade, anneau qui se ferme, chiffres qui comptent, ressorts légers sur les pastilles et indicateurs. Pas de boucle décorative (sauf « en direct »). `prefers-reduced-motion` coupe tout et fige le halo.

## Jetons (Tailwind + index.css)
| Rôle | Classe / valeur |
|---|---|
| Fond | `#f7f5fc` (`--page`), posé sur `html` ; halo par la coque |
| Encre | `text-ink` #15122a, `text-ink-2` #5d5a72, `text-ink-3` #706c86 (contraste AA), seconde ligne de titre `text-halo-mute` #8e89a8 (3:1, grands titres) |
| Carte | `rounded-card` (22 px), `rounded-card-sm` (16 px), `shadow-halo` (= `shadow-card`), survol `shadow-halo-lg` / `.lift` |
| Ligne en carte | `.row-card` (16 px, filet lavande, soulève 1 px), ombre `shadow-halo-sm` |
| Verre | `.glass` (blanc 72 %, flou 18 px), `.glass-strong` (86 %, flou 24 px), ombre `shadow-glass` |
| Pilules | `rounded-pill` (= `rounded-full`), pilule active `bg-white shadow-pill` |
| Pastille d'icône | `rounded-tile` (13 px) → utiliser `<IconTile>` |
| Champ | `rounded-field` (14 px), focus `shadow-focus` (anneau violet pâle) |
| Feuille | `rounded-sheet` (28 px) |
| Aube | `bg-dawn`, `bg-dawn-diag`, `bg-dawn-soft`, **`bg-dawn-pale`** (carte total), **`bg-dawn-mist`** (blanc qui rosit), `shadow-dawn`, `shadow-dawn-lg` |
| Texte dégradé | `.dawn-text` / `.text-dawn` ; `.text-dawn-shift` (glisse lentement, une fois max) |
| Tons pâles | `.tone-violet` `.tone-mag` `.tone-peach` `.tone-green` `.tone-blue` `.tone-cyan` `.tone-amber` `.tone-rose` `.tone-indigo` `.tone-neutral` `.tone-white` ; ou `bg-pale-{v,m,p,g,b,c,a,r,i,n}` + `text-deep-{…}` |
| Rails | `bg-halo-track` (#f1edf9), filet `border-halo-line` (#ece8f6), survol `bg-halo-hover` |
| Titres | `.title-halo` (30 → 40 px), `text-halo-title` (40), `text-halo-title-sm` (30) |
| Chiffres | `.num-halo` (600, −0,05 em, tabulaires) + taille ; ou `text-num-xl` (48) `text-num-lg` (38) `text-num-md` (30) avec `num` |
| Libellé | `.label-halo` (13 px, 500, ink-2) ; `.eyebrow` (petites capitales) reste pour les groupes |
| Halo local | `.halo-bg` sur un bloc `relative` (en-tête, carte héros, page publique sans coque) ; ajouter `.halo-clip` pour couper |
| Étapes | `<span class="step-halo" data-state="done|on"><b>1</b>Client</span>` |
| Easing | `ease-out-quint` (sorties), `ease-spring` (pastilles, indicateurs, boutons) |

## Composants (src/components/ui)
- **Button** — pilule. `variant` : `primary` (encre), `dawn` (dégradé + lueur, survol qui soulève ; action principale, une fois), `secondary` (blanc, défaut), `ghost`, `soft` (violet pâle), `glass` (sur un halo), `danger`, `link`. `size` : `xs` 28, `sm` 36, `md` 42, `lg` 52, `icon`, `icon-sm`. Props `icon`, `iconRight`, `kbd`, `loading`.
- **Card** — `interactive` (soulève 3 px), `tone="dawn"` (fond dégradé très pâle, carte total) / `tone="mist"`, `size="sm"` (16 px). **CardHeader** inchangé (filet lavande).
- **Badge** — pilule à fond pâle. `tone` : neutral, violet, ok, warn, bad, info, blue, peach, mag, dark, white, glass ; `size="md"` = chip 26 px ; `dot`, `pulse`.
- **Chip** — chip Halo 26 px (`tone`, `icon`) ; avec `onClick` devient une pilule filtrante (`active` = encre).
- **IconTile** — pastille 40 px / 13 px de rayon (`md`), `xs` `sm` `row` (34 px, lignes) `lg` `xl`. `dept` (ton du domaine) ou `tone` (HALO_TONE : violet, mag, peach, green, blue, cyan, amber, rose, indigo, neutral) ; `solid` (aplat) ; `dawn` (dégradé Aube, rare). `DEPT_TONE[dept]` = `{ fg, bg, ring, solid }`, `HALO_TONE[tone]` = `{ fg, bg, solid }`.
- **Segmented** — rail pilule lavande, pilule blanche qui glisse avec ressort. **UnderlineTabs** — onglets de page en pilules sans rail (même API, plus de soulignement).
- **Input / Textarea / Select / Field** — 44 px, 14 px de rayon, filet lavande, anneau violet pâle au focus.
- **Sheet** — verre très clair, 28 px, flotte à 12 px des bords (droite, centre, plein écran), monte du bas sur téléphone.
- **toast()** — pilule de verre en bas de l'écran, pastille de statut ronde, action en pilule encre.
- **PageHeader** — `kicker` (libellé au-dessus), `title` 40 px, **`titleMuted`** (seconde ligne grisée), `subtitle`, `actions`, `icon`, `size="md"` (30 px, écrans secondaires).
- **Stat** — `label`, `value` (chiffre serré), `sub`, `hero` (dégradé), **`icon`** (pastille au-dessus, carte KPI), **`size`** `md` 30 / `lg` 38 / `xl` 48.
- **Progress** — rail lavande 8 px, `tone` ink / dawn / ok / warn.
- **Avatar** — rond, pâle violet par défaut, **`dawn`** = dégradé Aube (l'utilisateur).
- EmptyState, Skeleton, Tip (pilule), Kbd, Row (survol lavande), Switch, Sparkline, Icon : mêmes API.

## Motion (src/components/motion)
- `Ring value size stroke tone` : rail lavande, arc qui se ferme ; `tone="dawn"` = anneau dégradé (objectif). Grand anneau : `size={150} stroke={12}` + enfants centrés.
- `AnimatedNumber`, `useCountUp` : les montants comptent jusqu'à leur valeur.
- `Reveal`, `.stagger` / `.stagger-fast` : cascades. `GrowBar`, `DrawCheck`, `SuccessDot`, `LiveDot`, `usePresence`, `Typewriter`.
Durées : micro 150-300 ms, éléments 300-500 ms, page 550 ms, chiffres 900 ms, anneau 1,6 s.

## Coque (src/components/layout)
- **HaloBackdrop** : halo Aube fixé derrière toutes les pages de `/app` (rotation liée au défilement, suit un peu la souris ; fixe si mouvement réduit). Réutilisable sur une page hors coque (le parent doit être `isolate`).
- **Ordinateur** : barre latérale **en verre qui flotte** (garde les 37 modules rangés par département ; pilule blanche qui glisse sous le lien actif) + barre du haut en **pilule de verre** (fil d'Ariane, recherche, notifications, Créer). Contenu : `max-w-[1320px]`, `px-8`.
- **Téléphone** : en-tête transparent qui devient une pilule de verre au défilement (56 px, les barres collantes des écrans restent à `top-14`), barre d'onglets en **pilule de verre flottante** (10 px du bas) avec pastille blanche qui glisse, micro de Bob au centre. Garder `pb` ≥ 112 px en bas des pages (déjà fait par la coque).
- Transition de page : fondu + montée 10 px + léger flou (550 ms).

## Recettes d'écran
- En-tête : `<PageHeader kicker="Mardi 18 novembre" title="Bonjour Karim," titleMuted="belle journée en vue." actions={<Button variant="dawn" icon={<Plus />}>Nouveau devis</Button>} />`
- Carte KPI : `<Card interactive><Stat icon={<IconTile name="FileSignature" tone="violet" />} label="Devis à signer" value="6" sub="24 380 € en jeu" /></Card>`
- Carte objectif : `<Card className="flex items-center gap-8 p-7"><Ring value={74} size={150} stroke={12} tone="dawn">…</Ring>…</Card>`
- Ligne de devis : `<div className="row-card"><IconTile size="row" name="Plug" tone="peach" /> … <b className="num">1 320,00 €</b></div>`
- Carte total : `<Card tone="dawn" className="p-6"><div className="label-halo">Total TTC</div><div className="num-halo text-[38px]">…</div></Card>`
- Statut : `<Badge tone="ok" dot>Signé</Badge>` ; chip : `<Chip tone="ok" icon={<TrendingUp />}>+12 % vs octobre</Chip>` (Badge/Chip prennent les tons de Badge ; IconTile prend `tone` HALO_TONE : green, blue…).

## Icônes
Lucide, trait 1,75 (1,9 sur pastille). Les modules s'affichent sur `IconTile` (ton du domaine). Pas d'émojis, pas de `Sparkles`.

## Téléphone
Cibles 44 px. Feuilles qui montent du bas. Listes en cartes plutôt qu'en tableaux. Action principale collée en bas dans un formulaire. Aucun débordement horizontal à 390 px.

## Tactile (iPad, téléphone) et PWA
- `hover:` / `group-hover:` n'agissent qu'à la souris (`future.hoverOnlyWhenSupported`) : rien ne reste « collé » après un tap. Une action qui n'apparaît qu'au survol doit aussi porter `touch:opacity-100` (variante `touch:` = pas de survol ou doigt ; `mouse:` = souris).
- Cibles de 44 px au doigt : `touch:h-11` (déjà fait dans Button `sm`/`icon`/`icon-sm`, Segmented, onglets, menu latéral).
- Raccourcis clavier (`<Kbd>`, prop `kbd`, classe `kbd-hint`) : masqués au doigt.
- Liens, images et icônes ne se glissent pas et n'ouvrent pas la bulle iOS (règle de base dans `index.css`) ; ce qu'on copie reste sélectionnable (champs, `.num`, `.font-mono`, `address`, `.selectable`).
- Bords d'écran : `--safe-t/-b/-l/-r` (encoche, barre d'accueil), `--kb` = hauteur du clavier virtuel (`src/lib/viewport.ts`, classe `kb-open` sur `<html>`).
- Fenêtres modales : `useModal` (`src/components/ui/useModal.ts`) pour Échap, piège de focus, fond inerte et blocage du défilement iOS.
- PWA : `public/manifest.webmanifest`, icônes et écrans de démarrage générés par `scripts/generate-icons.cjs` (même dessin que `BrandTile`), service worker généré au build (`scripts/pwa/`), enregistré par `src/lib/pwa.ts` (production seulement).
