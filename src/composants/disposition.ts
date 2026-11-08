// RG-realisation-face-a-sa-recette, décision 2026-008/02 : deux colonnes si la place le permet. Le seuil est un ordre de grandeur, que la lisibilité de deux colonnes fixe.

import { computed, onScopeDispose, ref } from "vue";
import { memoireDuVisiteur } from "../depot/visiteur";

export const FENETRE_LARGE = "(min-width: 56.25rem)";

// La fenêtre est-elle assez large pour deux colonnes ? Suivi en direct : agrandir ou rétrécir la fenêtre change la disposition. Sans `matchMedia`, la page reste en une colonne.
function useFenetreLarge() {
  const requete =
    typeof window.matchMedia === "function"
      ? window.matchMedia(FENETRE_LARGE)
      : undefined;
  const large = ref(requete?.matches ?? false);
  const suivre = (e: { matches: boolean }) => (large.value = e.matches);
  requete?.addEventListener("change", suivre);
  onScopeDispose(() => requete?.removeEventListener("change", suivre));
  return large;
}

// La bascule « Réalisation seule », retenue par le navigateur ; une fenêtre étroite reste en une colonne quel que soit ce choix.
export function useDisposition() {
  const large = useFenetreLarge();
  const seule = ref(memoireDuVisiteur.realisationSeule());
  const faceAFace = computed(() => large.value && !seule.value);
  function basculer() {
    seule.value = !seule.value;
    memoireDuVisiteur.retenirRealisationSeule(seule.value);
  }
  return { large, seule, faceAFace, basculer };
}
