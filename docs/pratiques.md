# Pratiques

## La lecture des fiches

Le site ne touche à aucun système : il n'a donc pas de ports vers le système d'exploitation. Sa seule frontière est le dépôt de données. Elle passera par un seul module, qui déclare dans le vocabulaire du domaine ce que le site attend — lister les plantes, lire une fiche, lister les cultures d'une plante — et par un adaptateur qui la réalise ; les vues ne nomment ni GitHub ni une URL. Les tests fournissent un adaptateur en mémoire. Le moment de la lecture — au build ou dans le navigateur — est une décision à cadrer : cette frontière permet de la changer sans toucher aux vues.

Le format des fiches est celui que le dépôt de données déclare (`referentiel.yml`, `schemas/`) : le site ne le redéfinit pas.

## Les tests

Vitest sous jsdom, un fichier `*.test.ts` à côté de ce qu'il éprouve, `@vue/test-utils` pour monter un composant. Test rouge d'abord : un test qui n'a jamais échoué n'a rien prouvé. Un test éprouve ce que l'utilisateur voit — un texte, un lien —, pas la structure interne d'un composant.

## Les erreurs

Une fiche absente ou illisible se dit à l'écran, dans le vocabulaire des fiches, sans casser le reste de la page : le site montre ce qu'il a pu lire.

## La mise en page

Une seule colonne lisible, qui tient sur un téléphone ; les couleurs de Skarden en variables CSS (`src/style.css`), en clair et en sombre selon `prefers-color-scheme`. Tout ce que l'utilisateur lit est en français.

## Le cycle de livraison

Une copie liée par sujet, une branche, une demande de fusion vers `main` : les contrôles de `.github/workflows/controles.yml` doivent passer. La branche distante disparaît à la fusion. Le site ne publie pas de versions : chaque arrivée sur `main` est déployée sur le bucket Scaleway `skarden` par `.github/workflows/deploiement.yml`, et servie à https://skarden.s3-website.fr-par.scw.cloud/. Le bucket, sa politique et la clé du déploiement se posent par `outils/preparer-deploiement.sh` ([deploiement.md](deploiement.md)).
