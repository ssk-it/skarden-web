# Pour l'agent

skarden-web : le site statique Vue 3 qui présente et parcourt les fiches du dépôt de données `sskorupski/skarden`.

## Que lire, et quand

| Avant de…                                                       | Lire                                                                                                   |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Cadrer ou développer une évolution fonctionnelle                | Le référentiel `ssk-it/skarden-cadrage`, par le skill `consulter-referentiel`                          |
| Toucher au code                                                 | [docs/developpement.md](docs/developpement.md)                                                         |
| Lire une fiche, toucher à la frontière avec le dépôt de données | [docs/invariants.md](docs/invariants.md) — **obligatoire** — et [docs/pratiques.md](docs/pratiques.md) |
| Écrire une fonction ou un composant                             | [docs/clean-code.md](docs/clean-code.md)                                                               |
| Nommer quoi que ce soit                                         | [docs/conventions.md](docs/conventions.md)                                                             |

L'index complet : [docs/README.md](docs/README.md).

## Comportement attendu

**Vérifier plutôt que supposer.** Ne jamais annoncer qu'une chose fonctionne sans l'avoir exécutée : `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm build`.

**Test rouge d'abord.** Un test qui n'a jamais échoué n'a rien prouvé.

**Ne pas contourner un invariant.** Les citer par leur numéro (`INV-1`, `INV-2`) ; s'il gêne, le dire.

**Ne jamais écrire une fiche ici.** Les fiches vivent dans `sskorupski/skarden` (`INV-1`).

**pnpm, jamais npm.**

**Ne pas committer sur `main`.** Une copie liée par sujet, une demande de fusion.

**Tenir la documentation à jour** dans le même changement que le code : une commande citée dans `docs/` existe dans `package.json`, un renvoi pointe vers un fichier réel.

**Échanges en français.**
