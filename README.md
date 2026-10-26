# Skarden — web

Que faut-il à chacune de mes plantes, et qu'ai-je appris en les cultivant ?

Le site statique qui présente et parcourt les fiches de Skarden. Le site ne contient aucune fiche : il lit, dans le navigateur, le dépôt GitHub que le visiteur désigne — celui de Skarden est [sskorupski/skarden](https://github.com/sskorupski/skarden) —, avec un jeton s'il est privé. Il n'en est pas la source, et n'écrit nulle part. Les décisions produit se prennent dans le référentiel de cadrage `ssk-it/skarden-cadrage`.

## Lancer

```bash
pnpm install
pnpm dev
```

La documentation technique commence à [docs/README.md](docs/README.md).
