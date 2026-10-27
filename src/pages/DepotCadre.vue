<script setup lang="ts">
import { computed, inject, provide, ref, shallowRef, watch } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import JetonForm from "../composants/JetonForm.vue";
import MessageErreur from "../composants/MessageErreur.vue";
import { DepotIllisible, type DepotDesigne } from "../depot/lecteur";
import { CLE_OUVRIR_DEPOT, ouvrirDepotSurGithub } from "../depot/ouvrir";
import { estUnDepot, memoireDuVisiteur } from "../depot/visiteur";
import type { DepotDeFiches } from "../fiches/depot-de-fiches";
import { CLE_DEPOT } from "./contexte";

const ouvrir = inject(CLE_OUVRIR_DEPOT, ouvrirDepotSurGithub);
const route = useRoute();
const designe = computed<DepotDesigne>(() => ({
  proprietaire: String(route.params.proprietaire),
  depot: String(route.params.depot),
}));
const valide = computed(() =>
  estUnDepot(designe.value.proprietaire, designe.value.depot),
);

const jeton = ref(memoireDuVisiteur.jeton());
const depot = shallowRef<DepotDeFiches>();
const erreur = shallowRef<unknown>();
const enCours = ref(false);
provide(CLE_DEPOT, depot as never);

let tour = 0;
watch(
  [() => designe.value.proprietaire, () => designe.value.depot, jeton],
  async () => {
    const ceTour = ++tour;
    depot.value = undefined;
    erreur.value = undefined;
    if (!valide.value) return;
    enCours.value = true;
    try {
      const ouvert = await ouvrir(designe.value, jeton.value);
      if (ceTour !== tour) return;
      depot.value = ouvert;
      memoireDuVisiteur.retenirDepot(designe.value);
    } catch (e) {
      if (ceTour === tour) erreur.value = e;
    } finally {
      if (ceTour === tour) enCours.value = false;
    }
  },
  { immediate: true },
);

const jetonUtile = computed(
  () =>
    erreur.value instanceof DepotIllisible &&
    ["introuvable", "jeton-refuse", "limite-atteinte"].includes(
      erreur.value.raison,
    ),
);

function saisirJeton(valeur: string) {
  memoireDuVisiteur.retenirJeton(valeur);
  jeton.value = valeur;
}

function oublierJeton() {
  memoireDuVisiteur.oublierJeton();
  jeton.value = undefined;
}
</script>

<template>
  <nav class="navigation">
    <RouterLink :to="{ name: 'accueil' }" class="depot"
      >{{ designe.proprietaire }}/{{ designe.depot }}</RouterLink
    >
    <RouterLink :to="{ name: 'plantes' }">Plantes</RouterLink>
    <!-- RG-navigation-par-regne : pas d'entrée vide pour un dépôt qui ne tient que des plantes. -->
    <RouterLink v-if="depot?.declare('animaux')" :to="{ name: 'animaux' }"
      >Animaux</RouterLink
    >
    <RouterLink to="/">Changer de dépôt</RouterLink>
  </nav>

  <p v-if="!valide" class="erreur" role="alert">
    Cette adresse ne désigne pas un dépôt GitHub.
  </p>
  <p v-else-if="enCours" class="chargement">Lecture du dépôt…</p>
  <MessageErreur v-else-if="erreur" :erreur="erreur" />
  <RouterView v-else-if="depot" />

  <footer v-if="valide && (jeton || jetonUtile)" class="pied">
    <JetonForm
      :memorise="Boolean(jeton)"
      @saisir="saisirJeton"
      @oublier="oublierJeton"
    />
  </footer>
</template>
