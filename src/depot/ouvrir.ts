// Ce que le site injecte dans ses pages pour ouvrir un dépôt : GitHub dans le navigateur, un dépôt en mémoire dans les tests.

import type { InjectionKey } from "vue";
import { DepotDeFiches } from "../fiches/depot-de-fiches";
import { cacheDuNavigateur } from "./cache";
import { ouvrirDepotGithub } from "./github";
import type { DepotDesigne } from "./lecteur";

export type OuvrirDepot = (
  depot: DepotDesigne,
  jeton?: string,
) => Promise<DepotDeFiches>;

export const CLE_OUVRIR_DEPOT: InjectionKey<OuvrirDepot> =
  Symbol("ouvrir-depot");

export const ouvrirDepotSurGithub: OuvrirDepot = async (depot, jeton) => {
  const cache = await cacheDuNavigateur(`${depot.proprietaire}/${depot.depot}`);
  return DepotDeFiches.ouvrir(await ouvrirDepotGithub(depot, { jeton, cache }));
};
