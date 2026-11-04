<script setup lang="ts">
import {
  computed,
  inject,
  provide,
  reactive,
  ref,
  shallowRef,
  watch,
} from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import JetonForm from "../composants/JetonForm.vue";
import MessageErreur from "../composants/MessageErreur.vue";
import { DepotIllisible, type DepotDesigne } from "../depot/lecteur";
import { CLE_OUVRIR_DEPOT, ouvrirDepotSurGithub } from "../depot/ouvrir";
import {
  estUnDepot,
  memoireDeLOnglet,
  memoireDuVisiteur,
} from "../depot/visiteur";
import type { DepotDeFiches } from "../fiches/depot-de-fiches";
import type { Suivi } from "../fiches/envoi-de-photos";
import { CLE_DEPOT, CLE_ECRITURE } from "./contexte";

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

// RG-jeton-d-un-depot-prive : le jeton d'écriture vaut pour ce dépôt, le temps de l'onglet, et ne sert jamais à lire.
const jetonDEcriture = ref<string>();
watch(
  designe,
  (d) => (jetonDEcriture.value = memoireDeLOnglet.jetonDEcriture(d)),
  { immediate: true },
);
const relectures = ref(0);
provide(CLE_ECRITURE, {
  designe,
  jeton: jetonDEcriture,
  saisirJeton: (valeur) => {
    memoireDeLOnglet.retenirJetonDEcriture(designe.value, valeur);
    jetonDEcriture.value = valeur;
  },
  envois: reactive(new Map<string, Suivi>()),
  relire: () => relectures.value++,
});

let tour = 0;
watch(
  [
    () => designe.value.proprietaire,
    () => designe.value.depot,
    jeton,
    relectures,
  ],
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
  memoireDeLOnglet.oublierJetonDEcriture(designe.value);
  jetonDEcriture.value = undefined;
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
    <!-- RG-liste-des-emplacements : la collection est obligatoire, l'entrée ne dépend d'aucune déclaration. -->
    <RouterLink :to="{ name: 'emplacements' }">Emplacements</RouterLink>
    <RouterLink to="/">Changer de dépôt</RouterLink>
  </nav>

  <p v-if="!valide" class="erreur" role="alert">
    Cette adresse ne désigne pas un dépôt GitHub.
  </p>
  <p v-else-if="enCours" class="chargement">Lecture du dépôt…</p>
  <MessageErreur v-else-if="erreur" :erreur="erreur" />
  <RouterView v-else-if="depot" />

  <footer v-if="valide && (jeton || jetonDEcriture || jetonUtile)" class="pied">
    <JetonForm
      :memorise="Boolean(jeton)"
      :ecriture="Boolean(jetonDEcriture)"
      @saisir="saisirJeton"
      @oublier="oublierJeton"
    />
  </footer>
</template>
