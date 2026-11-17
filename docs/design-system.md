# Brix — système de design « Aube » V3

Objectif : une app qu'un artisan trouve **belle, claire et vivante**. Épurée comme Linear, chaleureuse comme Things, précise comme Stripe. Jamais « générée par une IA » : pas de cartes toutes identiques, pas de dégradés partout, pas d'étincelles.

## Principes
1. **Une chose importante par écran.** Le reste est calme. Le dégradé Aube marque cette chose (chiffre clé ou action principale), une seule fois.
2. **Hiérarchie par la typo, pas par les boîtes.** Grands titres serrés (26-30 px, 600, -0,035 em), chiffres en `num`, libellés 12,5 px `text-ink-2`. Éviter d'empiler des cartes dans des cartes.
3. **Rythme.** Grille de 4 px. Espacement entre sections 20-28 px. Cartes `rounded-[16px]`, champs 11 px, boutons 9-13 px.
4. **Couleur = sens.** Chaque département a sa teinte (`DEPT_TONE`). Statuts : ok (vert), warn (ambre), bad (rouge), violet = en cours/Brix.
5. **Le mouvement explique.** Chaque animation dit quelque chose : apparition (la page arrive), progression (une barre se remplit), confirmation (une coche se dessine), lien de cause (ce qui change bouge). Jamais de boucle décorative permanente sauf indicateur « en direct ».

## Jetons
| Rôle | Valeur |
|---|---|
| Fond | `bg-page` #f6f5fb |
| Surface | `bg-white shadow-card` (ou `<Card>`) ; survol `lift` |
| Encre | `text-ink` #15122a, `text-ink-2` #5d5a72, `text-ink-3` #9794aa |
| Filets | `border-line` #ebe9f2, `border-line2` #dfdce9 |
| Violet nuit (logo, Bob) | `bg-night` #130f26 |
| Aube | `bg-dawn`, `bg-dawn-diag`, `.dawn-text`, `bg-dawn-soft` (fond très pâle) |
| Ombres | `shadow-xs`, `shadow-card`, `shadow-raise`, `shadow-lift`, `shadow-pop`, `shadow-dawn`, `shadow-ink` |
| Easing | `ease-out-quint` (sorties), `ease-spring` (petits rebonds : interrupteurs, pastilles) |

## Composants (src/components/ui)
Button (primary, dawn, secondary, ghost, soft, danger, link ; tailles xs à lg ; `icon`, `iconRight`, `kbd`, `loading`), Card / CardHeader, Badge (tons + `dot` + `pulse`), Input / Textarea / Select / Field, Segmented et UnderlineTabs (indicateur qui glisse), Sheet (droite, centre, plein écran ; entrée et sortie animées), PageHeader (`icon` = IconTile du domaine), EmptyState (petite scène), Stat, Skeleton, Tip (info-bulle), Avatar, Progress, Row, Switch, Sparkline (tracé qui se dessine), toast, Icon, IconTile.

## Motion (src/components/motion)
- `AnimatedNumber value format` : les montants comptent jusqu'à leur valeur.
- `Reveal` : apparition à l'arrivée dans l'écran. `.stagger` / `.stagger-fast` sur un parent : cascade des enfants.
- `Ring`, `GrowBar` : progression qui se remplit à l'arrivée.
- `DrawCheck`, `SuccessDot` : confirmation.
- `LiveDot` : en direct (pointage, synchro).
- `usePresence(open)` : garder monté le temps de la sortie.
- `Typewriter` : réponses de Bob.
Durées : micro 150-200 ms, éléments 300-450 ms, page 500 ms, chiffres 900 ms. `prefers-reduced-motion` coupe tout.

## Icônes
Lucide, trait 1,75 (1,9 sur tuile). Les modules s'affichent sur `IconTile` (teinte du département). Pas d'émojis dans l'interface.

## Téléphone
Barre d'onglets en bas avec pastille qui glisse, micro de Bob au centre. Cibles 44 px. Feuilles qui montent du bas. Listes en cartes plutôt qu'en tableaux. Action principale collée en bas quand c'est un formulaire.
