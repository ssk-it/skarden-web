# Invariants

Les contraintes que le site ne transgresse pas. Les citer par leur numéro, en revue, en message de commit, en commentaire.

**En changer** se fait par une décision explicite : un cadrage dans `ssk-it/skarden-cadrage`, puis une demande de fusion qui modifie ce fichier. Jamais par contournement. Un invariant levé garde son numéro, marqué comme levé, avec la date et la raison.

La liste est à compléter à mesure que le site prend forme.

## INV-1 — Le dépôt de données est la seule source

Le site lit les fiches et les photos dans [sskorupski/skarden](https://github.com/sskorupski/skarden) et ne les tient nulle part ailleurs : ni base, ni copie éditée à la main, ni fiche écrite dans ce dépôt. S'il écrit un jour, il n'écrit que dans le dépôt de données, par des commits. Ce que la règle protège : une seule vérité, dont Git garde l'histoire. Sans elle, une copie dans le site diverge de la fiche, et l'on ne sait plus laquelle croire.

## INV-2 — Un site statique, sans serveur applicatif

Ce que `pnpm build` produit se sert tel quel par un hébergement de fichiers. Ce que la règle protège : rien à faire tourner, à surveiller ni à mettre à jour côté serveur pour un site personnel. Sans elle, une fonction qui « demande juste une petite API » installe un serveur qu'il faudra tenir pour toujours.
