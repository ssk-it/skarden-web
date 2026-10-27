<script setup lang="ts">
import { RouterLink } from "vue-router";
import FichesInvalides from "../composants/FichesInvalides.vue";
import MessageErreur from "../composants/MessageErreur.vue";
import { libelle } from "../fiches/libelles";
import { useChargement } from "./contexte";

const {
  valeur: plantes,
  erreur,
  enCours,
} = useChargement((depot) => depot.listerPlantes());
</script>

<template>
  <main>
    <h2>Plantes</h2>
    <p v-if="enCours" class="chargement">Lecture des plantes…</p>
    <MessageErreur v-else-if="erreur" :erreur="erreur" />
    <template v-else-if="plantes">
      <p v-if="plantes.fiches.length === 0">Aucune plante dans ce dépôt.</p>
      <ul class="liste">
        <li
          v-for="plante in plantes.fiches"
          :key="plante.id"
          data-test="plante"
        >
          <RouterLink :to="{ name: 'plante', params: { id: plante.id } }">{{
            plante.nom
          }}</RouterLink>
          <span class="discret">
            — {{ libelle(plante.type) }}, {{ libelle(plante.cycle) }}</span
          >
        </li>
      </ul>
      <FichesInvalides :invalides="plantes.invalides" />
    </template>
  </main>
</template>
