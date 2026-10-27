<script setup lang="ts">
import { RouterLink } from "vue-router";
import FichesInvalides from "../composants/FichesInvalides.vue";
import MessageErreur from "../composants/MessageErreur.vue";
import PhotosDeFiche from "../composants/PhotosDeFiche.vue";
import TexteDeFiche from "../composants/TexteDeFiche.vue";
import { useChargement, useIdentifiant } from "./contexte";

// RG-page-d-une-procedure : les étapes sont la liste numérotée du corps ; les espèces qui la citent se calculent.
const id = useIdentifiant();
const { valeur, erreur, enCours } = useChargement(
  async (depot) => {
    const procedure = await depot.lireProcedure(id.value);
    return { procedure, especes: await depot.especesQuiCitent(procedure.id) };
  },
  () => id.value,
);
</script>

<template>
  <main>
    <p v-if="enCours" class="chargement">Lecture de la fiche…</p>
    <MessageErreur v-else-if="erreur" :erreur="erreur" />
    <article v-else-if="valeur">
      <h2>{{ valeur.procedure.nom }}</h2>
      <PhotosDeFiche
        :photos="valeur.procedure.photos"
        :legende="valeur.procedure.nom"
      />
      <TexteDeFiche :corps="valeur.procedure.corps" />
      <h3>Espèces qui la citent</h3>
      <p v-if="valeur.especes.fiches.length === 0">
        Aucune espèce ne cite cette procédure.
      </p>
      <ul class="liste">
        <li v-for="animal in valeur.especes.fiches" :key="animal.id">
          <RouterLink :to="{ name: 'animal', params: { id: animal.id } }">{{
            animal.nom
          }}</RouterLink>
        </li>
      </ul>
      <FichesInvalides :invalides="valeur.especes.invalides" />
    </article>
  </main>
</template>
