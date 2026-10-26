// Ce que le cadre d'un dépôt transmet à ses pages, et le chargement asynchrone qu'elles partagent.

import {
  inject,
  ref,
  shallowRef,
  watch,
  type InjectionKey,
  type Ref,
} from "vue";
import { useRoute } from "vue-router";
import type { DepotDeFiches } from "../fiches/depot-de-fiches";

export const CLE_DEPOT: InjectionKey<Ref<DepotDeFiches>> = Symbol("depot");

export function useDepot(): Ref<DepotDeFiches> {
  const depot = inject(CLE_DEPOT);
  if (!depot)
    throw new Error("une page de fiche s'affiche dans le cadre d'un dépôt");
  return depot;
}

// L'identifiant de la fiche désignée par l'adresse.
export function useIdentifiant(): Ref<string> {
  const route = useRoute();
  const id = ref(String(route.params.id));
  watch(
    () => route.params.id,
    (valeur) => (id.value = String(valeur)),
  );
  return id;
}

// Recharge à chaque changement de dépôt ou de fiche ; une réponse arrivée après qu'on a changé de page est ignorée.
export function useChargement<T>(
  charger: (depot: DepotDeFiches) => Promise<T>,
  dependances: () => unknown = () => undefined,
) {
  const depot = useDepot();
  const valeur = shallowRef<T>();
  const erreur = shallowRef<unknown>();
  const enCours = ref(true);
  let tour = 0;
  watch(
    [depot, dependances],
    async () => {
      const ceTour = ++tour;
      enCours.value = true;
      erreur.value = undefined;
      try {
        const resultat = await charger(depot.value);
        if (ceTour === tour) valeur.value = resultat;
      } catch (e) {
        if (ceTour === tour) erreur.value = e;
      } finally {
        if (ceTour === tour) enCours.value = false;
      }
    },
    { immediate: true },
  );
  return { valeur, erreur, enCours };
}
