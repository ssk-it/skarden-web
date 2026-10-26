# Code propre

Ce qui gouverne l'intérieur d'une unité. Les frontières — la lecture des fiches, les tests — sont dans [pratiques.md](pratiques.md).

## Lisibilité

- **Un composant affiche, il ne va pas chercher.** `App.vue` ne lit aucune fiche lui-même : ce qu'il montre lui vient du module de lecture (pratiques.md), ce qui le rend testable sans réseau.
- **Les textes affichés sont dans les gabarits**, en français, jamais construits dans la logique.

## Conception

- **Une seule raison de changer par unité** : une vue change quand l'écran change, le module de lecture quand le dépôt de données change.

## Refactoring

Un changement de forme ne se mêle pas à un changement de comportement : deux commits, et les tests verts entre les deux.

## Outillage

Ce que les contrôles de chaque demande de fusion font respecter, et rien de plus :

- **TypeScript strict** (`tsconfig.json`) : `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noImplicitOverride`.
- **ESLint** (`eslint.config.js`) : `recommended` de JavaScript, `strict` de typescript-eslint, `flat/recommended` de Vue, et `no-console` en erreur. Tout est bloquant.
- **Prettier** (`.prettierrc.json`), en vérification seule ; `proseWrap: "preserve"` laisse les paragraphes Markdown sur une ligne.

Aucun seuil de taille ni de complexité n'est configuré : le code tient en une page. Le premier seuil s'ajoute à `eslint.config.js` et à ce paragraphe dans le même changement.
