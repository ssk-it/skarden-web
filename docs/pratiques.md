# Pratiques

## La lecture des fiches

Le site ne touche à aucun système : il n'a donc pas de ports vers le système d'exploitation. Sa seule frontière est le dépôt de données, lu **dans le navigateur**, à la visite, dans le dépôt que le visiteur désigne (cadrage 2026-002 de `ssk-it/skarden-cadrage`).

- **Le port** : `src/depot/lecteur.ts` — la liste des fichiers du commit lu avec leur empreinte, lire un texte, lire une photo. **L'adaptateur** : `src/depot/github.ts`. Les tests fournissent `lecteur-en-memoire.ts`.
- **Le domaine** : `src/fiches/depot-de-fiches.ts` dit, dans le vocabulaire des fiches, ce que les pages demandent — une plante ou un animal, les cultures d'une plante, les élevages d'une installation, le journal d'une culture ou d'un élevage, l'accueil. Les pages ne nomment ni GitHub ni une URL ; elles reçoivent l'ouverture d'un dépôt par injection (`CLE_OUVRIR_DEPOT`).
- **Les collections** : celles de la plante (`familles`, `plantes`, `emplacements`, `cultures`, `journal`) sont obligatoires ; celles de l'animal (`animaux`, `elevages`, `installations`, `procedures`) sont facultatives (cadrage 2026-004). Une collection que `referentiel.yml` ne déclare pas donne des listes vides, jamais une erreur, et le site n'en présente rien : ni entrée **Animaux**, ni section **Élevages en cours**, ni installations sous un emplacement.
- **Ce qui se calcule et ne s'écrit nulle part** : la capacité d'une installation pour un animal (`capacite`, `RG-capacite-calculee`), arrondie à l'individu inférieur ; la phase du moment d'un élevage (`phaseDuMoment`, `RG-phase-du-moment`), fonction pure du mois, que les pages appellent avec le mois de l'horloge du navigateur ; le dernier effectif compté (`dernierEffectif`) ; les espèces qui citent une procédure.
- **Les portes de GitHub**, mesurées pendant le cadrage : l'API pour le commit de la branche par défaut (`commits/HEAD`) et l'arbre de ce commit ; `raw.githubusercontent.com` au SHA du commit pour le contenu public — il refuse l'en-tête `Authorization` ; l'API `contents` (contenu brut) quand il y a un jeton ; `media.githubusercontent.com` pour une photo LFS, raw ne rendant que son pointeur.
- **Le coût d'une visite** : sans jeton, l'API admet 60 appels par heure et par adresse IP, réponses 304 comprises. Une visite sans changement n'en coûte qu'un : l'arbre d'un commit déjà lu, et chaque fichier, viennent du cache par empreinte (`src/depot/cache.ts`, Cache Storage, un cache par dépôt). Ce qu'aucun commit lu ne désigne plus s'en efface.
- **Le journal** se lit d'après la date en tête du nom de ses fichiers : le journal d'une culture ou d'un élevage ne lit que les entrées de sa période, l'accueil que celles d'après le plus ancien début des cultures et des élevages en cours, en une seule lecture. Une entrée désigne exactement une culture ou un élevage (`RG-entree-du-journal`) : celle qui ne désigne ni l'un ni l'autre, ou les deux, est dite invalide.
- **Les photos** d'une fiche s'affichent en vignettes, chacune un bouton, et s'agrandissent par PhotoSwipe (`RG-galerie-des-photos`, cadrage 2026-006) : la bibliothèque, empaquetée par Vite, reçoit les adresses `blob:` déjà lues et les dimensions mesurées sur l'image décodée, sans rien télécharger. Ses libellés passent par ses options, en français ; la boîte de dialogue est dite modale et nommée, et Tab y tourne entre ses boutons (APG, Dialog (Modal)).
- **Le jeton de lecture** est mémorisé en `localStorage`, ne paraît jamais dans une adresse, ne part que vers GitHub. **Le jeton d'écriture** est un second jeton, saisi sur la page d'une fiche, rangé sous son dépôt en `sessionStorage` : il ne survit pas à l'onglet, ne sert qu'à poster, et le bouton qui oublie le jeton de lecture l'oublie aussi (`RG-jeton-d-un-depot-prive`). Le Markdown d'une fiche passe par `rendreMarkdown`, qui l'assainit : c'est le seul `v-html` admis. La politique de sécurité du contenu, posée au build (`vite.config.ts`), n'ouvre le réseau qu'aux trois hôtes de GitHub.

Le format des fiches est celui que le dépôt de données déclare (`referentiel.yml`, `schemas/`) : le site ne le redéfinit pas.

## L'envoi de photos

Le site n'écrit que pour poster des photos, dans le dépôt qu'il lit, par des commits (INV-1, cadrage 2026-006 de `ssk-it/skarden-cadrage`, `ADR-photos-postees-par-une-branche`).

- **Le port** : `src/depot/ecrivain.ts` — lire une fiche à la tête de la branche par défaut, commiter sur une branche neuve, lire la conversion, ouvrir la demande de fusion, en demander la fusion automatique, lire son état. **L'adaptateur** : `src/depot/github-ecriture.ts`, tout par `api.github.com`. Les tests fournissent `ecrivain-en-memoire.ts`.
- **Le domaine** : `src/fiches/photos-ajoutees.ts` nomme l'envoi (`medias/<dossier de la collection>/<fiche>-<instant>-<rang>.jpg`, branche `photos/<fiche>-<instant>`) et ajoute les chemins à la fin du champ `photos` par une retouche du texte, jamais par une réécriture du YAML ; une forme qu'il ne sait pas compléter est refusée, et rien n'est créé. `src/fiches/envoi-de-photos.ts` mène l'envoi : envoyé, converti, vérifié, fusionné. Une étape qui échoue s'arrête là et se dit, avec le lien de l'Action ou de la demande de fusion.
- **La réduction** (`src/composants/reduction.ts`, `RG-photo-reduite-avant-l-envoi`) : chaque photo se redessine dans le sens où on l'a prise et se réencode en JPEG, 2 560 pixels au plus, qualité 0,85, ce qui retire ses métadonnées. Une photo que le navigateur ne décode pas est refusée.
- **La conversion** se lit sur le contrat de `docs/pratiques.md` de `sskorupski/skarden` : le run de `photos-en-lfs.yml` dont `head_sha` est le commit du site. Un dépôt qui n'a pas ce workflow ne reçoit aucune demande de fusion.
- **Le suivi passe par le jeton d'écriture** : il fait partie de l'envoi, et sans jeton l'API n'admet que 60 appels par heure.
- **L'avancement se lit** (`src/composants/AjoutDePhotos.vue`) : chaque étape dit son état en toutes lettres — fait, en cours, à venir, échec —, la marque et la couleur ne faisant que le redoubler, et l'étape en cours porte `aria-current="step"`. Chaque étape garde l'heure de son début et de sa fin : l'étape en cours montre depuis combien de temps elle dure, une étape faite en combien de temps. Pendant la conversion, le site lit le statut du run (en file, en cours) et l'étape que son job exécute ; pendant la vérification, combien de contrôles sont terminés. Le lien de l'Action et celui de la demande de fusion paraissent dès qu'ils existent. Une zone vivante, polie, annonce l'étape et ce qu'elle attend, jamais la durée, qui changerait chaque seconde.

## Les tests

Vitest sous jsdom, un fichier `*.test.ts` à côté de ce qu'il éprouve, `@vue/test-utils` pour monter un composant. Ce que jsdom ne sait pas faire — décoder une image, le focus, le clavier réel — s'éprouve dans un fichier `*.navigateur.test.ts`, que Vitest lance en mode navigateur sur le WebKit de Playwright, sans tête : le moteur le plus proche de Safari, où l'on regarde les photos. Aucun test n'ouvre de fenêtre. Test rouge d'abord : un test qui n'a jamais échoué n'a rien prouvé. Un test éprouve ce que l'utilisateur voit — un texte, un lien —, pas la structure interne d'un composant.

## Les erreurs

Une fiche absente ou illisible se dit à l'écran, dans le vocabulaire des fiches, sans casser le reste de la page : le site montre ce qu'il a pu lire.

## La mise en page

Une seule colonne lisible, qui tient sur un téléphone ; les couleurs de Skarden en variables CSS (`src/style.css`), en clair et en sombre selon `prefers-color-scheme`. Tout ce que l'utilisateur lit est en français, et une valeur fermée s'affiche en mots lisibles (`src/fiches/libelles.ts`), jamais sous son code.

Ce qui a deux dimensions — les plages de conditions, le calendrier des modes sur douze mois — est un tableau HTML, avec sa légende (`<caption>`) et ses en-têtes (`<th scope>`). Le calendrier met les mois en lignes et les modes en colonnes, pour tenir sur un téléphone sans défilement horizontal. HTML d'abord : ni rôle ARIA ni attribut qui doublerait ce que la balise dit déjà.

## Le cycle de livraison

Une copie liée par sujet, une branche, une demande de fusion vers `main` : les contrôles de `.github/workflows/controles.yml` doivent passer. La branche distante disparaît à la fusion. Le site ne publie pas de versions : chaque arrivée sur `main` est déployée sur le bucket Scaleway `skarden` par `.github/workflows/deploiement.yml`, et servie à https://skarden.s3-website.fr-par.scw.cloud/. Le bucket, sa politique et la clé du déploiement se posent par `outils/preparer-deploiement.sh` ([deploiement.md](deploiement.md)).
