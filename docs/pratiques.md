# Pratiques

## La lecture des fiches

Le site ne touche à aucun système : il n'a donc pas de ports vers le système d'exploitation. Sa seule frontière est le dépôt de données, lu **dans le navigateur**, à la visite, dans le dépôt que le visiteur désigne (cadrage 2026-002 de `ssk-it/skarden-cadrage`).

- **Le port** : `src/depot/lecteur.ts` — la liste des fichiers du commit lu avec leur empreinte, lire un texte, lire une photo. **L'adaptateur** : `src/depot/github.ts`. Les tests fournissent `lecteur-en-memoire.ts`.
- **Le domaine** : `src/fiches/depot-de-fiches.ts` dit, dans le vocabulaire des fiches, ce que les pages demandent — une plante, les cultures d'une plante, le journal d'une culture, l'accueil. Les pages ne nomment ni GitHub ni une URL ; elles reçoivent l'ouverture d'un dépôt par injection (`CLE_OUVRIR_DEPOT`).
- **Les portes de GitHub**, mesurées pendant le cadrage : l'API pour le commit de la branche par défaut (`commits/HEAD`) et l'arbre de ce commit ; `raw.githubusercontent.com` au SHA du commit pour le contenu public — il refuse l'en-tête `Authorization` ; l'API `contents` (contenu brut) quand il y a un jeton ; `media.githubusercontent.com` pour une photo LFS, raw ne rendant que son pointeur.
- **Le coût d'une visite** : sans jeton, l'API admet 60 appels par heure et par adresse IP, réponses 304 comprises. Une visite sans changement n'en coûte qu'un : l'arbre d'un commit déjà lu, et chaque fichier, viennent du cache par empreinte (`src/depot/cache.ts`, Cache Storage, un cache par dépôt). Ce qu'aucun commit lu ne désigne plus s'en efface.
- **Le journal** se lit d'après la date en tête du nom de ses fichiers : le journal d'une culture ne lit que les entrées de sa période, l'accueil que celles d'après le plus ancien début des cultures en cours. Une entrée qui désigne un élevage plutôt qu'une culture est laissée de côté : le site ne présente pas encore les élevages, et ne la dit pas invalide pour autant.
- **Le jeton** est mémorisé en `localStorage`, ne paraît jamais dans une adresse, ne part que vers GitHub. Le Markdown d'une fiche passe par `rendreMarkdown`, qui l'assainit : c'est le seul `v-html` admis. La politique de sécurité du contenu, posée au build (`vite.config.ts`), n'ouvre le réseau qu'aux trois hôtes de GitHub.

Le format des fiches est celui que le dépôt de données déclare (`referentiel.yml`, `schemas/`) : le site ne le redéfinit pas.

## Les tests

Vitest sous jsdom, un fichier `*.test.ts` à côté de ce qu'il éprouve, `@vue/test-utils` pour monter un composant. Test rouge d'abord : un test qui n'a jamais échoué n'a rien prouvé. Un test éprouve ce que l'utilisateur voit — un texte, un lien —, pas la structure interne d'un composant.

## Les erreurs

Une fiche absente ou illisible se dit à l'écran, dans le vocabulaire des fiches, sans casser le reste de la page : le site montre ce qu'il a pu lire.

## La mise en page

Une seule colonne lisible, qui tient sur un téléphone ; les couleurs de Skarden en variables CSS (`src/style.css`), en clair et en sombre selon `prefers-color-scheme`. Tout ce que l'utilisateur lit est en français.

## Le cycle de livraison

Une copie liée par sujet, une branche, une demande de fusion vers `main` : les contrôles de `.github/workflows/controles.yml` doivent passer. La branche distante disparaît à la fusion. Le site ne publie pas de versions : chaque arrivée sur `main` est déployée sur le bucket Scaleway `skarden` par `.github/workflows/deploiement.yml`, et servie à https://skarden.s3-website.fr-par.scw.cloud/. Le bucket, sa politique et la clé du déploiement se posent par `outils/preparer-deploiement.sh` ([deploiement.md](deploiement.md)).
