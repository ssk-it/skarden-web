<script setup lang="ts">
import { RouterLink } from "vue-router";
import FichesInvalides from "../composants/FichesInvalides.vue";
import MessageErreur from "../composants/MessageErreur.vue";
import TexteDeFiche from "../composants/TexteDeFiche.vue";
import { useChargement, useIdentifiant } from "./contexte";

const id = useIdentifiant();
const { valeur, erreur, enCours } = useChargement(
  async (depot) => {
    const famille = await depot.lireFamille(id.value);
    return { famille, especes: await depot.especesDe(famille) };
  },
  () => id.value,
);
</script>

<template>
  <main>
    <p v-if="enCours" class="chargement">Lecture de la fiche…</p>
    <MessageErreur v-else-if="erreur" :erreur="erreur" />
    <article v-else-if="valeur">
      <h2>{{ valeur.famille.nom }}</h2>
      <p v-if="valeur.famille.nomLatin" class="latin">
        {{ valeur.famille.nomLatin }}
      </p>
      <TexteDeFiche :corps="valeur.famille.corps" />
      <!-- RG-famille-montre-ses-especes : les espèces de son règne. -->
      <template v-if="valeur.especes.regne === 'animal'">
        <h3>Animaux</h3>
        <p v-if="valeur.especes.especes.fiches.length === 0">
          Aucun animal de cette famille.
        </p>
      </template>
      <template v-else>
        <h3>Plantes</h3>
        <p v-if="valeur.especes.especes.fiches.length === 0">
          Aucune plante de cette famille.
        </p>
      </template>
      <ul class="liste">
        <li v-for="espece in valeur.especes.especes.fiches" :key="espece.id">
          <RouterLink
            :to="{
              name: valeur.especes.regne === 'animal' ? 'animal' : 'plante',
              params: { id: espece.id },
            }"
            >{{ espece.nom }}</RouterLink
          >
        </li>
      </ul>
      <FichesInvalides :invalides="valeur.especes.especes.invalides" />
    </article>
  </main>
</template>
