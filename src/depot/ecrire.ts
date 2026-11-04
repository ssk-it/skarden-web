// Ce que le site injecte dans ses pages pour écrire dans un dépôt : GitHub dans le navigateur, un dépôt en mémoire dans les tests.

import type { InjectionKey } from "vue";
import type { OuvrirEcrivain } from "./ecrivain";
import { ecrivainGithub } from "./github-ecriture";

export const CLE_OUVRIR_ECRIVAIN: InjectionKey<OuvrirEcrivain> =
  Symbol("ouvrir-ecrivain");

export const ouvrirEcrivainSurGithub: OuvrirEcrivain = (depot, jeton) =>
  ecrivainGithub(depot, jeton);
