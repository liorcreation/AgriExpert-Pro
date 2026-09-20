# AgriExpert Pro — Design System v1

## Direction

Le système visuel exprime un territoire agricole fiable et une technologie institutionnelle accessible : vert émeraude pour l’action et la confiance, or pour les repères premium et institutionnels, crème pour le mode clair médical, obsidian pour le mode sombre et rouge réservé aux urgences.

## Tokens principaux

| Rôle | Clair | Sombre | Usage |
| --- | --- | --- | --- |
| Brand | `territory-900` `#0F3D2E` | `territory-500` `#10B981` | navigation active, CTA principal |
| Accent | `territory-500` `#10B981` | `territory-400` `#34D399` | disponibilité, progression, liens |
| Institution | `gold-500` `#D4AF37` | `gold-300` `#E8D48A` | badges, indicateurs, distinction |
| Fond | `cream-100` `#FAF8F1` | `obsidian-950` `#090D16` | arrière-plan global |
| Surface | `cream-50` `#FFFEFB` | `obsidian-900` `#101722` | cartes et formulaires |
| Urgence | `danger-600` `#D92D20` | `danger-500` `#F04438` | SOS uniquement |

## Typographie

- Police prioritaire : **Plus Jakarta Sans**.
- Repli : **Inter**, puis les polices système.
- Titres : graisse 700, approche légèrement resserrée.
- Corps : taille minimale de 16 px pour les parcours terrain importants.
- Libellés et aides : 14 px minimum ; les informations critiques ne reposent jamais sur la couleur seule.

## Composants de base

Les classes réutilisables sont disponibles dans `apps/web/src/styles/design-system.css` :

- `.ag-glass` : surface glassmorphism avec transparence, blur et bordure douce.
- `.ag-card` et `.ag-card-interactive` : cartes de contenu et cartes cliquables.
- `.ag-button-primary`, `.ag-button-secondary`, `.ag-button-ghost` : hiérarchie d’actions.
- `.ag-button-emergency` : bouton SOS à contraste élevé et zone tactile renforcée.
- `.ag-input` et `.ag-label` : formulaires cohérents et accessibles.
- `.ag-badge-online` : présence temps réel avec point animé.
- `.ag-section-kicker` et `.ag-section-title` : hiérarchie éditoriale des écrans.

## Règles d’ergonomie terrain

- Zone tactile minimale : 44 × 44 px ; 48 px pour SOS et commandes vocales.
- Contraste élevé sur les boutons, messages de statut et actions critiques.
- Les icônes Lucide sont toujours accompagnées d’un libellé pour les actions essentielles.
- Les animations disposent d’une alternative automatique via `prefers-reduced-motion`.
- Les états `hover`, `focus-visible`, `disabled`, `loading` et `error` sont prévus avant l’implémentation d’un composant.
- Le mode vocal doit pouvoir remplacer la saisie textuelle dans les parcours producteur.

## Responsive

| Point de rupture | Intention |
| --- | --- |
| base / mobile | une colonne, actions larges, navigation compacte |
| `md` | grille deux colonnes et sidebar repliable |
| `lg` | shell complet, cartes de synthèse et panneau contextualisé |
| `2xl` | largeur de lecture plafonnée à 1440 px |

## Exemple d’utilisation

```tsx
<section className="ag-card-interactive p-5">
  <span className="ag-section-kicker">Conseil technique</span>
  <h2 className="ag-section-title">Un expert peut vous répondre</h2>
  <button className="ag-button-primary mt-5">
    Poser une question
  </button>
</section>
```

Le prochain incrément (Étape 3) utilisera directement ces primitives pour construire le Header institutionnel, la Sidebar, le sélecteur de rôle et le sélecteur de langue/voix.
