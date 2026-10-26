// Ce que le site retient du visiteur, sur son appareil : le dernier dépôt lu (RG-depot-designe-par-le-visiteur) et le jeton d'un dépôt privé (RG-jeton-d-un-depot-prive). Rien d'autre, et jamais dans une adresse.

import type { DepotDesigne } from "./lecteur";

// Les noms que GitHub admet pour un compte et pour un dépôt.
const NOM = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/;
const NOM_DE_DEPOT = /^[A-Za-z0-9._-]+$/;

export function estUnDepot(proprietaire: string, depot: string): boolean {
  return (
    NOM.test(proprietaire) &&
    NOM_DE_DEPOT.test(depot) &&
    depot !== "." &&
    depot !== ".."
  );
}

// Accepte `propriétaire/dépôt` et l'adresse GitHub du dépôt, telle qu'on la copie depuis le navigateur.
export function lireDepotSaisi(saisie: string): DepotDesigne | undefined {
  const segments = saisie
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^github\.com\//, "")
    .split("/");
  const [proprietaire, nom, suite] = segments;
  if (
    !proprietaire ||
    !nom ||
    (suite !== undefined && !/^(tree|blob)$/.test(suite))
  )
    return undefined;
  const depot = nom.replace(/\.git$/, "");
  return estUnDepot(proprietaire, depot) ? { proprietaire, depot } : undefined;
}

const CLE_JETON = "skarden.jeton";
const CLE_DEPOT = "skarden.dernier-depot";

// Le stockage peut être refusé (navigation privée, données de site bloquées) : le site fonctionne alors sans mémoire.
function lire(cle: string): string | undefined {
  try {
    return localStorage.getItem(cle) ?? undefined;
  } catch {
    return undefined;
  }
}

function ecrire(cle: string, valeur: string | undefined) {
  try {
    if (valeur === undefined) localStorage.removeItem(cle);
    else localStorage.setItem(cle, valeur);
  } catch {
    // Rien à faire : la valeur vaudra le temps de la page.
  }
}

export const memoireDuVisiteur = {
  jeton: () => lire(CLE_JETON),
  retenirJeton: (jeton: string) => ecrire(CLE_JETON, jeton),
  oublierJeton: () => ecrire(CLE_JETON, undefined),
  dernierDepot: (): DepotDesigne | undefined => {
    const valeur = lire(CLE_DEPOT);
    return valeur ? lireDepotSaisi(valeur) : undefined;
  },
  retenirDepot: ({ proprietaire, depot }: DepotDesigne) =>
    ecrire(CLE_DEPOT, `${proprietaire}/${depot}`),
};
