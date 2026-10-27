<script setup lang="ts">
import { RouterLink } from "vue-router";
import FichesInvalides from "../composants/FichesInvalides.vue";
import MessageErreur from "../composants/MessageErreur.vue";
import { libelle } from "../fiches/libelles";
import { useChargement } from "./contexte";

// RG-navigation-par-regne : les espèces animales, triées par nom.
const {
  valeur: animaux,
  erreur,
  enCours,
} = useChargement((depot) => depot.listerAnimaux());
</script>

<template>
  <main>
    <h2>Animaux</h2>
    <p v-if="enCours" class="chargement">Lecture des animaux…</p>
    <MessageErreur v-else-if="erreur" :erreur="erreur" />
    <template v-else-if="animaux">
      <p v-if="animaux.fiches.length === 0">Aucun animal dans ce dépôt.</p>
      <ul class="liste">
        <li
          v-for="animal in animaux.fiches"
          :key="animal.id"
          data-test="animal"
        >
          <RouterLink :to="{ name: 'animal', params: { id: animal.id } }">{{
            animal.nom
          }}</RouterLink>
          <span class="discret"> — {{ libelle(animal.milieu) }}</span>
        </li>
      </ul>
      <FichesInvalides :invalides="animaux.invalides" />
    </template>
  </main>
</template>
