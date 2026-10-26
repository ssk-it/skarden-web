#!/usr/bin/env bash
# Pose ce que le déploiement du site sur Object Storage Scaleway attend (docs/deploiement.md) :
#
#   1. le projet Scaleway `skarden`, qui ne porte que le bucket du site ;
#   2. le bucket `skarden` (fr-par), servi en site web statique ;
#   3. l'application IAM `skarden-deploiement` et sa politique : les objets du seul projet `skarden` ;
#   4. la politique du bucket — le propriétaire, la lecture publique, l'application —, éprouvée
#      d'abord sur un bucket d'essai, puis posée sur `skarden` sous surveillance ;
#   5. l'environnement GitHub `production` de ssk-it/skarden-web, ses variables, et la clé de
#      l'application dans ses secrets ;
#   6. en lecture seule : ce que portent l'environnement et le site.
#
# Usage : outils/preparer-deploiement.sh
#
# Pourquoi un projet à lui : une permission IAM de Scaleway porte sur tout un projet, jamais sur un
# bucket. Seul dans son projet, le bucket est le seul que la clé de déploiement puisse toucher.
#
# Pourquoi le bucket d'essai : le 20 octobre 2026, une politique complétée a rendu le bucket de
# SSK Canon inévaluable — 500 sur toute requête, deux heures de panne — (ssk-it/skanon,
# docs/deploiement.md). Une politique ne s'écrit donc sur le bucket du site qu'une fois tenue cinq
# minutes sur un bucket jetable, clé de l'application comprise ; et la déclaration que Scaleway
# pose lui-même, le propriétaire en plein accès, vient toujours en tête, ses principaux en tableau.
#
# La clé d'administrateur Scaleway — celle d'un utilisateur, le propriétaire de l'organisation —
# est demandée au clavier, sans écho. Elle passe à curl par un fichier de configuration lu sur un
# descripteur, et à la CLI aws par un fichier temporaire lisible du seul utilisateur, effacé à la
# sortie ; jamais par la ligne de commande, l'historique ou l'écran. Le secret de la clé de
# déploiement part de la réponse de Scaleway directement vers gh, sans s'afficher.
#
# Chaque écriture est annoncée et confirmée ; ce qui est déjà en place est laissé tel quel. Le
# script peut être relancé.
#
# Prérequis : gh, connecté avec un compte administrateur de ssk-it/skarden-web ; aws ; jq ; curl.
set -euo pipefail

DEPOT="ssk-it/skarden-web"
ENVIRONNEMENT="production"
NOM_PROJET="skarden"
BUCKET="skarden"
# Les noms de bucket sont communs à tous les clients de Scaleway : ESSAI en choisit un autre si
# celui-ci est pris.
ESSAI="${ESSAI:-skarden-essai}"
REGION="fr-par"
APPLICATION="skarden-deploiement"
# Ce que `aws s3 sync` demande : lister et lire, écrire, supprimer des objets. Ni la création ni la
# suppression d'un bucket, ni ses réglages.
PERMISSIONS='["ObjectStorageObjectsRead","ObjectStorageObjectsWrite","ObjectStorageObjectsDelete"]'
SCW_API="https://api.scaleway.com"
ENDPOINT="https://s3.${REGION}.scw.cloud"

ok()  { echo "  ✓ $*"; }
ko()  { echo "  ✗ $*" >&2; exit 1; }
dit() { echo "  · $*"; }
confirmer() {
  local reponse
  read -r -p "  → $* [o/N] " reponse
  [[ "${reponse}" == "o" || "${reponse}" == "O" ]]
}

for outil in gh aws jq curl; do
  command -v "${outil}" >/dev/null || ko "${outil} introuvable"
done
gh auth status >/dev/null 2>&1 || ko "gh n'est pas connecté : gh auth login"
[ "$(gh api "repos/${DEPOT}" --jq .permissions.admin 2>/dev/null)" = "true" ] \
  || ko "le compte connecté à gh n'administre pas ${DEPOT}"

PRIVE="$(mktemp -d)"
trap 'rm -rf "${PRIVE}"' EXIT

# --- La clé d'administrateur ---------------------------------------------------------------

read -r -p "  Access key d'administrateur Scaleway : " ADMIN_ACCES
read -r -s -p "  Secret key d'administrateur : " ADMIN_SECRET
echo
[[ "${ADMIN_ACCES}" =~ ^SCW[A-Z0-9]{17}$ ]] || ko "l'access key n'a pas la forme SCW + 17 caractères"

# Le secret passe à curl dans un fichier de configuration lu sur un descripteur. Un guillemet ou
# une barre oblique inverse y est échappé.
jeton() {
  local v="${ADMIN_SECRET//\\/\\\\}"
  v="${v//\"/\\\"}"
  printf 'header = "X-Auth-Token: %s"\n' "${v}"
}
appel() {
  local methode="$1" chemin="$2"
  shift 2
  curl -sS -X "${methode}" -K <(jeton) -H 'Content-Type: application/json' \
    -w '\n%{http_code}' "$@" "${SCW_API}${chemin}"
}
corps() { sed '$d' <<< "$1"; }
code()  { tail -n1 <<< "$1"; }
# Ce que Scaleway dit d'un refus : son message, jamais un secret.
pourquoi() { corps "$1" | jq -r '(.message // empty) | " : " + .' 2>/dev/null || true; }

# Le propriétaire : l'utilisateur de la clé, comme `scw iam api-key get <access key>` le donne.
R="$(appel GET "/iam/v1alpha1/api-keys/${ADMIN_ACCES}")"
[ "$(code "${R}")" = 200 ] || ko "clé d'administrateur refusée par Scaleway (HTTP $(code "${R}")$(pourquoi "${R}"))"
PROPRIETAIRE="$(corps "${R}" | jq -r '.user_id // empty')"
[ -n "${PROPRIETAIRE}" ] || ko "cette clé est celle d'une application : il faut celle du propriétaire"
# Seul le propriétaire écrit sans politique IAM qui le lui permette : un membre de l'organisation
# lirait les projets, puis serait refusé à la création de l'application.
R="$(appel GET "/iam/v1alpha1/users/${PROPRIETAIRE}")"
[ "$(code "${R}")" = 200 ] || ko "utilisateur de la clé illisible (HTTP $(code "${R}")$(pourquoi "${R}"))"
[ "$(corps "${R}" | jq -r .type)" = owner ] \
  || ko "la clé est celle de $(corps "${R}" | jq -r .email), $(corps "${R}" | jq -r .type) de l'organisation : il faut celle du propriétaire"
R="$(appel GET "/account/v3/projects/$(corps "${R}" | jq -r .default_project_id)")"
[ "$(code "${R}")" = 200 ] || ko "projet par défaut de la clé illisible (HTTP $(code "${R}")$(pourquoi "${R}"))"
ORGANISATION="$(corps "${R}" | jq -r .organization_id)"
dit "organisation ${ORGANISATION}, propriétaire user_id:${PROPRIETAIRE}"
echo

# --- 1. Le projet --------------------------------------------------------------------------

echo "1. Projet ${NOM_PROJET}"
R="$(appel GET "/account/v3/projects?organization_id=${ORGANISATION}&name=${NOM_PROJET}")"
[ "$(code "${R}")" = 200 ] || ko "projets illisibles (HTTP $(code "${R}")$(pourquoi "${R}"))"
PROJET="$(corps "${R}" | jq -r --arg n "${NOM_PROJET}" '.projects[] | select(.name == $n) | .id' | head -n1)"
if [ -n "${PROJET}" ]; then
  ok "existe déjà (${PROJET})"
else
  confirmer "créer le projet ${NOM_PROJET}, qui ne portera que le bucket du site ?" || ko "sans projet, pas de bucket"
  R="$(appel POST /account/v3/projects --data-binary @<(jq -n --arg o "${ORGANISATION}" --arg n "${NOM_PROJET}" \
    '{organization_id: $o, name: $n, description: "Le site de Skarden (ssk-it/skarden-web), servi depuis le bucket skarden"}'))"
  [ "$(code "${R}")" = 200 ] || ko "création du projet refusée (HTTP $(code "${R}")$(pourquoi "${R}"))"
  PROJET="$(corps "${R}" | jq -r .id)"
  ok "créé (${PROJET})"
fi
echo

# La CLI aws, au nom du propriétaire, dans le projet : Scaleway lit le projet après l'arobase.
identifiants() {
  local profil="$1" acces="$2" secret="$3"
  (umask 077; printf '[%s]\naws_access_key_id = %s@%s\naws_secret_access_key = %s\n' \
    "${profil}" "${acces}" "${PROJET}" "${secret}" >> "${PRIVE}/identifiants")
}
identifiants admin "${ADMIN_ACCES}" "${ADMIN_SECRET}"
s3() {
  local profil="$1" bucket="$2"
  shift 2
  AWS_SHARED_CREDENTIALS_FILE="${PRIVE}/identifiants" AWS_CONFIG_FILE=/dev/null \
    AWS_PROFILE="${profil}" AWS_REGION="${REGION}" AWS_MAX_ATTEMPTS=1 \
    AWS_REQUEST_CHECKSUM_CALCULATION=when_required AWS_RESPONSE_CHECKSUM_VALIDATION=when_required \
    aws s3api "$@" --bucket "${bucket}" --endpoint-url "${ENDPOINT}"
}
site() { echo "https://$1.s3-website.${REGION}.scw.cloud/"; }
repond() { curl -s -m 15 -o /dev/null -w '%{http_code}' "$1" || true; }

# Crée un bucket du projet et le sert en site web statique. Un nom pris par un autre client
# répond 403.
preparer_bucket() {
  local bucket="$1" erreur
  if erreur="$(s3 admin "${bucket}" head-bucket 2>&1)"; then
    ok "le bucket ${bucket} existe déjà"
  elif [[ "${erreur}" == *403* || "${erreur}" == *Forbidden* ]]; then
    ko "le nom ${bucket} est pris hors de ce projet"
  else
    confirmer "créer le bucket ${bucket} dans ${NOM_PROJET} (${REGION}) ?" || ko "bucket ${bucket} non créé"
    s3 admin "${bucket}" create-bucket --create-bucket-configuration "LocationConstraint=${REGION}" >/dev/null || ko "création du bucket ${bucket} refusée"
    ok "bucket ${bucket} créé"
  fi
  # Index et erreur pointent tous deux index.html : une adresse que le site servira sans fichier
  # rendra la page, avec un statut 404.
  if s3 admin "${bucket}" get-bucket-website --query 'IndexDocument.Suffix' --output text 2>/dev/null \
    | grep -qx index.html; then
    ok "${bucket} est déjà un site statique"
  elif confirmer "servir ${bucket} en site statique, index et erreur sur index.html ?"; then
    s3 admin "${bucket}" put-bucket-website --website-configuration \
      '{"IndexDocument":{"Suffix":"index.html"},"ErrorDocument":{"Key":"index.html"}}' \
      || ko "réglage du site statique refusé"
    ok "${bucket} servi en site statique"
  else
    ko "sans site statique, le bucket ne sert rien"
  fi
}

# --- 2. Le bucket du site ------------------------------------------------------------------

echo "2. Bucket ${BUCKET}"
preparer_bucket "${BUCKET}"
echo

# --- 3. L'application IAM ------------------------------------------------------------------

echo "3. Application ${APPLICATION}"
# Un nom de jeu de permissions inconnu ferait une politique vide, que Scaleway accepte sans rien
# dire. La liste est paginée : les lire toutes.
connus='[]'
page=1
while :; do
  R="$(appel GET "/iam/v1alpha1/permission-sets?organization_id=${ORGANISATION}&page_size=100&page=${page}")"
  [ "$(code "${R}")" = 200 ] || ko "jeux de permissions illisibles (HTTP $(code "${R}")$(pourquoi "${R}"))"
  connus="$(jq -c --argjson c "${connus}" '$c + [.permission_sets[].name]' <<< "$(corps "${R}")")"
  total="$(corps "${R}" | jq -r .total_count)"
  [ "$(jq length <<< "${connus}")" -lt "${total}" ] && [ "${page}" -lt 50 ] || break
  page=$((page + 1))
done
manquants="$(jq -r --argjson v "${PERMISSIONS}" '. as $n | $v - $n | join(", ")' <<< "${connus}")"
[ -z "${manquants}" ] || ko "jeux de permissions inconnus de Scaleway : ${manquants}"

R="$(appel GET "/iam/v1alpha1/applications?organization_id=${ORGANISATION}&name=${APPLICATION}")"
[ "$(code "${R}")" = 200 ] || ko "applications illisibles (HTTP $(code "${R}")$(pourquoi "${R}"))"
ID_APPLICATION="$(corps "${R}" | jq -r --arg n "${APPLICATION}" '.applications[] | select(.name == $n) | .id' | head -n1)"
if [ -n "${ID_APPLICATION}" ]; then
  ok "existe déjà (${ID_APPLICATION})"
else
  confirmer "créer l'application ${APPLICATION} ?" || ko "sans application, pas de clé"
  R="$(appel POST /iam/v1alpha1/applications --data-binary @<(jq -n --arg o "${ORGANISATION}" --arg n "${APPLICATION}" \
    '{organization_id: $o, name: $n, description: "Dépose le site de Skarden (ssk-it/skarden-web, workflow Déploiement)"}'))"
  [ "$(code "${R}")" = 200 ] || ko "création de l'application refusée (HTTP $(code "${R}")$(pourquoi "${R}"))"
  ID_APPLICATION="$(corps "${R}" | jq -r .id)"
  ok "créée (${ID_APPLICATION})"
fi

R="$(appel GET "/iam/v1alpha1/policies?organization_id=${ORGANISATION}&application_ids=${ID_APPLICATION}")"
[ "$(code "${R}")" = 200 ] || ko "politiques illisibles (HTTP $(code "${R}")$(pourquoi "${R}"))"
if [ "$(corps "${R}" | jq '.policies | length')" -gt 0 ]; then
  ok "l'application a déjà une politique : laissée telle quelle"
else
  dit "permissions : $(jq -r 'join(", ")' <<< "${PERMISSIONS}"), sur le seul projet ${NOM_PROJET}"
  confirmer "créer la politique ?" || ko "sans politique, la clé ne peut rien"
  R="$(appel POST /iam/v1alpha1/policies --data-binary @<(jq -n \
    --arg o "${ORGANISATION}" --arg a "${ID_APPLICATION}" --arg p "${PROJET}" --argjson v "${PERMISSIONS}" \
    '{organization_id: $o, application_id: $a, name: "skarden-deploiement",
      description: "Objets du projet skarden, pour le déploiement du site",
      rules: [{permission_set_names: $v, project_ids: [$p]}]}'))"
  [ "$(code "${R}")" = 200 ] || ko "création de la politique refusée (HTTP $(code "${R}")$(pourquoi "${R}"))"
  ok "politique créée"
fi
echo

# Crée une clé de l'application et l'écrit sur la sortie, deux lignes : access key, secret key.
# Elle ne doit aller qu'à un tube.
creer_cle() {
  local description="$1" r
  r="$(appel POST /iam/v1alpha1/api-keys --data-binary @<(jq -n \
    --arg a "${ID_APPLICATION}" --arg p "${PROJET}" --arg d "${description}" \
    '{application_id: $a, default_project_id: $p, description: $d}'))"
  [ "$(code "${r}")" = 200 ] || ko "création de la clé refusée (HTTP $(code "${r}")$(pourquoi "${r}"))"
  corps "${r}" | jq -r '.access_key, .secret_key'
}

# --- 4. La politique du bucket -------------------------------------------------------------

# La politique d'un bucket : le propriétaire en tête, en plein accès ; la lecture publique, sans
# listage ; l'application, qu'une politique de bucket doit nommer pour qu'elle puisse écrire. Les
# principaux SCW en tableau, comme Scaleway les écrit.
politique() {
  jq -n --arg b "$1" --arg u "user_id:${PROPRIETAIRE}" --arg a "application_id:${ID_APPLICATION}" '{
    Version: "2023-04-17",
    Id: $b,
    Statement: [
      { Sid: "Scaleway secure statement", Effect: "Allow", Action: "*",
        Principal: { SCW: [$u] }, Resource: [$b, ($b + "/*")] },
      { Sid: "lecture-publique", Effect: "Allow", Action: ["s3:GetObject"],
        Principal: "*", Resource: [($b + "/*")] },
      { Sid: "deploiement", Effect: "Allow",
        Action: ["s3:ListBucket", "s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
        Principal: { SCW: [$a] }, Resource: [$b, ($b + "/*")] }
    ]
  }'
}

# Pose la politique sur un bucket, puis la surveille cinq minutes : une sonde lue de l'extérieur
# par l'adresse du site, la politique relue par le propriétaire. Au premier écart, la politique
# d'avant est reposée — l'écriture passait encore quand plus rien ne passait, le 20 octobre.
poser_politique() {
  local bucket="$1" sonde="sonde-politique.txt" adresse avant="${PRIVE}/avant-$1.json" apres="${PRIVE}/apres-$1.json"
  adresse="$(site "${bucket}")${sonde}"
  politique "${bucket}" > "${apres}"
  if s3 admin "${bucket}" get-bucket-policy --query Policy --output text > "${avant}" 2>/dev/null; then
    if [ "$(jq -S . "${avant}")" = "$(jq -S . "${apres}")" ]; then
      ok "la politique de ${bucket} est déjà celle-ci"
      return 0
    fi
    dit "${bucket} a une politique, qui serait remplacée : $(jq -r '[.Statement[].Sid] | join(", ")' "${avant}")"
  else
    rm -f "${avant}"
  fi
  sed 's/^/    /' "${apres}"
  confirmer "poser cette politique sur ${bucket}, sous surveillance cinq minutes ?" || return 1
  printf 'sonde de la politique du bucket\n' > "${PRIVE}/${sonde}"
  s3 admin "${bucket}" put-object --key "${sonde}" --body "${PRIVE}/${sonde}" --content-type text/plain >/dev/null \
    || ko "dépôt de la sonde refusé"
  s3 admin "${bucket}" put-bucket-policy --policy "file://${apres}" || ko "écriture de la politique refusée"
  ok "politique écrite à $(date +%H:%M:%S)"
  local public lue
  for _ in $(seq 1 15); do
    sleep 20
    public="$(repond "${adresse}")"
    if s3 admin "${bucket}" get-bucket-policy >/dev/null 2>&1; then lue=relue; else lue=illisible; fi
    dit "$(date +%H:%M:%S) sonde publique → ${public}, politique ${lue}"
    if [ "${public}" != 200 ] || [ "${lue}" != relue ]; then
      if [ -f "${avant}" ]; then
        s3 admin "${bucket}" put-bucket-policy --policy "file://${avant}" && ko "écart : politique d'avant reposée sur ${bucket}"
      else
        s3 admin "${bucket}" delete-bucket-policy && ko "écart : politique retirée de ${bucket}"
      fi
      ko "écart, et la politique d'avant n'a pas pu être reposée sur ${bucket} : voir la console"
    fi
  done
  s3 admin "${bucket}" delete-object --key "${sonde}" >/dev/null || dit "sonde laissée dans ${bucket}"
  ok "la politique de ${bucket} a tenu cinq minutes"
}

# Éprouve la clé de l'application sur le bucket d'essai : une clé temporaire, qui écrit, liste et
# supprime un objet, puis est révoquée. Une clé neuve peut mettre quelques secondes à valoir.
eprouver_application() {
  local acces secret ecrit=non
  { IFS= read -r acces; IFS= read -r secret; } < <(creer_cle "essai de la politique de ${ESSAI}, révoquée aussitôt")
  [ -n "${acces}" ] && [ -n "${secret}" ] || ko "pas de clé d'essai : rien n'est éprouvé"
  identifiants application "${acces}" "${secret}"
  unset secret
  printf 'essai\n' > "${PRIVE}/essai-application.txt"
  for _ in 1 2 3 4 5 6; do
    if s3 application "${ESSAI}" put-object --key essai-application.txt --body "${PRIVE}/essai-application.txt" >/dev/null 2>&1; then
      ecrit=oui
      break
    fi
    sleep 10
  done
  if [ "${ecrit}" = oui ] \
    && s3 application "${ESSAI}" list-objects-v2 --max-keys 1 >/dev/null 2>&1 \
    && s3 application "${ESSAI}" delete-object --key essai-application.txt >/dev/null 2>&1; then
    ok "la clé de l'application écrit, liste et supprime dans ${ESSAI}"
  else
    ecrit=refuse
  fi
  R="$(appel DELETE "/iam/v1alpha1/api-keys/${acces}")"
  if [ "$(code "${R}")" = 204 ]; then
    ok "clé d'essai révoquée"
  else
    dit "clé d'essai ${acces} à révoquer dans la console (HTTP $(code "${R}")$(pourquoi "${R}"))"
  fi
  [ "${ecrit}" != refuse ] || ko "la clé de l'application est refusée dans ${ESSAI} : la politique ne convient pas"
}

echo "4. Politique du bucket"
politique "${BUCKET}" > "${PRIVE}/voulue.json"
if s3 admin "${BUCKET}" get-bucket-policy --query Policy --output text 2>/dev/null \
  | jq -S . 2>/dev/null | cmp -s - <(jq -S . "${PRIVE}/voulue.json"); then
  ok "la politique de ${BUCKET} est déjà celle-ci : pas d'essai"
else
  echo "  a. Sur le bucket d'essai ${ESSAI}"
  preparer_bucket "${ESSAI}"
  poser_politique "${ESSAI}" || ko "essai abandonné : rien n'est posé sur ${BUCKET}"
  eprouver_application
  if confirmer "supprimer le bucket d'essai ${ESSAI} et ce qu'il contient ?"; then
    if AWS_SHARED_CREDENTIALS_FILE="${PRIVE}/identifiants" AWS_CONFIG_FILE=/dev/null AWS_PROFILE=admin \
      AWS_REGION="${REGION}" AWS_REQUEST_CHECKSUM_CALCULATION=when_required \
      AWS_RESPONSE_CHECKSUM_VALIDATION=when_required \
      aws s3 rb "s3://${ESSAI}" --force --endpoint-url "${ENDPOINT}" >/dev/null; then
      ok "${ESSAI} supprimé"
    else
      dit "${ESSAI} à supprimer dans la console"
    fi
  else
    dit "${ESSAI} laissé en place"
  fi
  echo "  b. Sur ${BUCKET}"
  poser_politique "${BUCKET}" || ko "politique de ${BUCKET} non posée : le site restera privé"
fi
echo

# --- 5. L'environnement GitHub -------------------------------------------------------------

echo "5. Environnement ${ENVIRONNEMENT} de ${DEPOT}"
if gh api "repos/${DEPOT}/environments/${ENVIRONNEMENT}" >/dev/null 2>&1; then
  ok "existe déjà"
elif confirmer "créer l'environnement ${ENVIRONNEMENT} ?"; then
  gh api -X PUT "repos/${DEPOT}/environments/${ENVIRONNEMENT}" >/dev/null
  ok "créé"
else
  ko "sans environnement, ni variable ni secret ne peut être posé"
fi

poser_variable() {
  local nom="$1" valeur="$2" actuelle
  # Une variable absente répond 404, dont gh écrit le corps sur sa sortie : ce n'est pas une valeur.
  actuelle="$(gh api "repos/${DEPOT}/environments/${ENVIRONNEMENT}/variables/${nom}" --jq .value 2>/dev/null)" \
    || actuelle=""
  if [ "${actuelle}" = "${valeur}" ]; then
    ok "${nom} = ${valeur}, déjà en place"
  elif confirmer "poser ${nom} = ${valeur}${actuelle:+ (au lieu de ${actuelle})} ?"; then
    gh variable set "${nom}" --env "${ENVIRONNEMENT}" --repo "${DEPOT}" --body "${valeur}"
    ok "${nom} = ${valeur}"
  else
    dit "${nom} laissée telle quelle"
  fi
}
poser_variable SCW_BUCKET "${BUCKET}"
poser_variable SCW_REGION "${REGION}"

# Lit la clé sur l'entrée standard, deux lignes, et la pose dans les secrets. Elle ne fait que la
# traverser, de la réponse de Scaleway jusqu'à gh.
poser_cle() {
  local acces secret
  IFS= read -r acces
  IFS= read -r secret
  [ -n "${acces}" ] && [ -n "${secret}" ] || ko "clé incomplète : rien n'est posé"
  printf '%s' "${acces}" | gh secret set SCW_ACCESS_KEY --env "${ENVIRONNEMENT}" --repo "${DEPOT}"
  printf '%s' "${secret}" | gh secret set SCW_SECRET_KEY --env "${ENVIRONNEMENT}" --repo "${DEPOT}"
  ok "SCW_ACCESS_KEY et SCW_SECRET_KEY posés sur ${ENVIRONNEMENT}"
}
presents="$(gh api "repos/${DEPOT}/environments/${ENVIRONNEMENT}/secrets" --jq '[.secrets[].name]')"
if jq -e 'index("SCW_ACCESS_KEY") != null and index("SCW_SECRET_KEY") != null' <<< "${presents}" >/dev/null \
  && ! confirmer "SCW_ACCESS_KEY et SCW_SECRET_KEY sont déjà posés, et ne se relisent pas : les remplacer par une clé neuve ?"; then
  ok "clé laissée telle quelle"
elif confirmer "créer une clé pour ${APPLICATION} et la poser sur ${ENVIRONNEMENT} ?"; then
  creer_cle "ssk-it/skarden-web, environnement production" | poser_cle
  dit "une clé remplacée se révoque ensuite dans la console"
else
  dit "pas de clé : le déploiement échouera"
fi
unset ADMIN_ACCES ADMIN_SECRET
echo

# --- 6. Vérifications ----------------------------------------------------------------------

echo "6. Ce qui est en place"
gh api "repos/${DEPOT}/environments/${ENVIRONNEMENT}/variables" --jq '.variables[] | "  · variable \(.name) = \(.value)"'
gh api "repos/${DEPOT}/environments/${ENVIRONNEMENT}/secrets" --jq '.secrets[] | "  · secret \(.name), posé le \(.updated_at)"'
dit "$(site "${BUCKET}") → $(repond "$(site "${BUCKET}")") (404 tant que le premier déploiement n'a rien déposé)"
echo "Terminé."
