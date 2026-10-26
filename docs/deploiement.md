# Déploiement

Le site est un ensemble de fichiers statiques (`INV-2`) : `pnpm build` les écrit dans `dist/`, et le bucket Scaleway `skarden` (fr-par) les sert tels quels, à l'adresse https://skarden.s3-website.fr-par.scw.cloud/.

`.github/workflows/deploiement.yml` s'exécute à chaque arrivée sur `main`, et à la main par `workflow_dispatch` pour redéployer une branche, un tag ou un commit. Il construit, dépose, et rien d'autre : les contrôles sont ceux de `controles.yml`, passés avant la fusion. Ce qui retient une fusion avant le site est l'environnement `production`, où le dépôt peut exiger une approbation. Le site ne publie pas de versions.

## Configuration

Portée par l'environnement `production` du dépôt, jamais par le dépôt lui-même.

| Nom              | Type     | Contenu                                           |
| ---------------- | -------- | ------------------------------------------------- |
| `SCW_ACCESS_KEY` | secret   | Access key de l'application `skarden-deploiement` |
| `SCW_SECRET_KEY` | secret   | Sa secret key, qui ne s'affiche jamais            |
| `SCW_BUCKET`     | variable | `skarden`                                         |
| `SCW_REGION`     | variable | `fr-par`                                          |

**La mise en place se fait par un script**, qui confirme chaque écriture et laisse en place ce qui l'est déjà :

```bash
outils/preparer-deploiement.sh
```

Il demande au clavier, sans écho, la clé d'API Scaleway du propriétaire de l'organisation, puis pose, dans l'ordre :

1. **le projet Scaleway `skarden`**, qui ne porte que le bucket du site. Une permission IAM de Scaleway porte sur tout un projet, jamais sur un bucket : seul dans son projet, le bucket est le seul que la clé de déploiement puisse toucher ;
2. **le bucket `skarden`**, servi en site statique, dont l'index et le document d'erreur pointent tous deux `index.html` ;
3. **l'application IAM `skarden-deploiement`** — non un utilisateur, pour que la clé ne soit liée à personne qui puisse quitter l'organisation — et sa politique : lire, écrire et supprimer des objets, dans le seul projet `skarden` ;
4. **la politique du bucket**, éprouvée d'abord sur un bucket d'essai (ci-dessous) ;
5. **l'environnement `production`**, ses variables, et une clé neuve de l'application, dont le secret part de la réponse de Scaleway directement dans les secrets, sans s'afficher.

Renouveler la clé, c'est relancer le script : il propose de remplacer les secrets en place. Révoquer ensuite l'ancienne dans la console.

## La politique du bucket

Trois déclarations, et rien d'autre :

- **« Scaleway secure statement »**, en tête : le propriétaire de l'organisation, en plein accès. Scaleway la pose lui-même ; sans elle, la console du propriétaire ne gère plus le bucket ;
- **la lecture publique** : `s3:GetObject` pour tous, sur les objets. Ni écriture — elle laisserait remplacer une page du site — ni `s3:ListBucket`, qui révélerait les fichiers des versions précédentes ;
- **le déploiement** : l'application `skarden-deploiement`, qui liste, lit, écrit et supprime. Une politique de bucket ne laisse agir que les principaux qu'elle nomme : sans cette déclaration, la clé est refusée malgré sa permission IAM.

Les principaux `SCW` s'écrivent en tableau, comme Scaleway les écrit. Le 20 octobre 2026, une déclaration au principal écrit en chaîne a rendu le bucket de SSK Canon inévaluable — 500 sur toute requête, deux heures de panne (`ssk-it/skanon`, `docs/deploiement.md`). D'où l'ordre que suit le script :

1. **sur un bucket d'essai** (`skarden-essai`, ou celui que nomme `ESSAI`) : la politique est posée, puis surveillée cinq minutes — une sonde lue de l'extérieur par l'adresse du site, la politique relue par le propriétaire — ; une clé temporaire de l'application y écrit, liste et supprime un objet, puis est révoquée. Le bucket d'essai est ensuite supprimé, sur confirmation ;
2. **sur `skarden`** seulement ensuite, surveillée une minute : la même politique a tenu cinq minutes sur l'essai, et tant que le premier déploiement n'a rien déposé, une panne de ce bucket ne casse aucun site. Au premier écart, la politique d'avant est reposée : le 20 octobre, l'écriture d'une politique passait encore quand plus rien d'autre ne passait.

## Deux politiques de cache

- **Les fichiers hashés** — tout `assets/` : leur nom porte l'empreinte de leur contenu, un contenu modifié arrive sous un autre nom. Immuables, cachés un an.
- **Les pages** — `index.html` : elle décide des fichiers hashés chargés. Jamais cachée, et **déposée en dernier** : tant qu'elle ne l'est pas, l'ancienne version est servie entière.

Les fichiers à nom stable de `public/` — icônes, logotypes, manifeste — sont cachés une journée, puis revalidés : un logo remplacé doit se voir.

Rien n'est supprimé du bucket : `sync --delete` retirerait les fichiers d'une version encore réclamés par un onglet ouvert. Les anciens fichiers hashés s'accumulent ; une règle de cycle de vie les nettoiera quand leur volume le justifiera.

## Ce qu'un bucket nu ne fait pas

- **Pas de domaine à lui en HTTPS** : un domaine propre ne se sert qu'en HTTP depuis un bucket ; le HTTPS demanderait Edge Services. Le site garde l'adresse de Scaleway.
- **Aucun en-tête de sécurité** : le bucket ne renvoie que ce qu'on stocke par objet — ni politique de sécurité du contenu, ni HSTS.
- **Rien de confidentiel dans `dist/`** : tout ce qui est construit est public, comme les fiches qu'il présente.
