# Conventions

## La règle en une phrase

**Le vocabulaire du domaine reste en français, partout ; la mécanique reste en anglais.** Fiche, plante, animal, culture, élevage, emplacement, installation, procédure, famille, journal, photo ne se traduisent pas, pas même dans un nom de variable : `loadPlantes()`, `findCultureById(id)`, `depotDeDonnees`. Tout ce qui n'appartient pas au domaine — verbes, types techniques, plateforme — s'écrit en anglais. C'est la convention de Skanon, reprise telle quelle.

## Identifiants

- Types du domaine : le terme français en PascalCase, sans accent — `Plante`, `Culture`, `Elevage`. Types techniques : anglais.
- Champs : ceux du frontmatter qu'ils décrivent, en camelCase là où le YAML est en snake_case (`nom_latin` → `nomLatin`).
- **Pas d'accents ni de cédilles dans les identifiants.** Les accents sont pour le contenu, les libellés et les commentaires.

## Fichiers

- Composants Vue : PascalCase, suffixe du rôle — `PlantePage.vue`.
- Le reste : kebab-case — `source-des-fiches.ts`. Un test à côté de ce qu'il éprouve : `source-des-fiches.test.ts`.

## Commentaires

En français. Ils disent le **pourquoi** — la contrainte, l'invariant, l'option écartée —, jamais le quoi. Ils citent l'invariant (`INV-1`) plutôt que de le reformuler.

## Commits

Impératif présent, en français, une ligne de titre courte ; le corps dit pourquoi, à 72 colonnes.

## Documentation

Les fichiers Markdown ne coupent pas leurs lignes : un paragraphe tient sur une ligne.
