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
    return { famille, plantes: await depot.plantesDe(famille.id) };
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
      <h3>Plantes</h3>
      <p v-if="valeur.plantes.fiches.length === 0">
        Aucune plante de cette famille.
      </p>
      <ul class="liste">
        <li v-for="plante in valeur.plantes.fiches" :key="plante.id">
          <RouterLink :to="{ name: 'plante', params: { id: plante.id } }">{{
            plante.nom
          }}</RouterLink>
        </li>
      </ul>
      <FichesInvalides :invalides="valeur.plantes.invalides" />
    </article>
  </main>
</template>
