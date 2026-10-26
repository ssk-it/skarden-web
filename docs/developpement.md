# Développement

## L'arborescence

```
index.html       la page, ses icônes et son manifeste
public/          les icônes et les logotypes de Skarden, servis tels quels
src/main.ts      le point d'entrée : monte l'application
src/App.vue      la page d'accueil
src/style.css    les couleurs de Skarden, claires et sombres
src/*.test.ts    les tests, à côté de ce qu'ils éprouvent
outils/          les scripts de mise en place : le dépôt GitHub, le déploiement
```

## Les gestes courants

| Commande                            | Ce qu'elle fait                                    |
| ----------------------------------- | -------------------------------------------------- |
| `pnpm install`                      | Installe les dépendances, d'après `pnpm-lock.yaml` |
| `pnpm dev`                          | Le serveur de développement de Vite                |
| `pnpm typecheck`                    | Les types, par `vue-tsc`                           |
| `pnpm lint`                         | ESLint, sans correction                            |
| `pnpm format` / `pnpm format:check` | Prettier, qui corrige / qui constate               |
| `pnpm test` / `pnpm test:watch`     | Vitest sous jsdom, une fois / en veille            |
| `pnpm build`                        | Les types, puis le site statique dans `dist/`      |

## Les pièges d'outillage

- **pnpm, jamais npm** : la version est fixée par `packageManager`, Node par `.nvmrc`.
- **Un script d'installation est bloqué tant que `pnpm-workspace.yaml` ne l'autorise pas** (`allowBuilds`). En autoriser un se justifie dans ce fichier, en une ligne.
- **Les icônes viennent du dossier `web/` du logo de Skarden** : les remplacer en bloc, avec `site.webmanifest`, plutôt qu'une à une.
