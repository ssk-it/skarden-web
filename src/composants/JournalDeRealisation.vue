<script setup lang="ts">
import type { EntreeDuJournal, Liste } from "../fiches/depot-de-fiches";
import { libelle, libelleDate } from "../fiches/libelles";
import FichesInvalides from "./FichesInvalides.vue";
import PhotosDeFiche from "./PhotosDeFiche.vue";
import TexteDeFiche from "./TexteDeFiche.vue";

// RG-page-d-une-realisation : son journal, avec les photos et le texte de chaque entrée.
defineProps<{ journal: Liste<EntreeDuJournal> }>();
</script>

<template>
  <h3>Journal</h3>
  <div data-test="journal">
    <p v-if="journal.fiches.length === 0">Aucune entrée.</p>
    <ol class="journal">
      <li
        v-for="entree in journal.fiches"
        :key="entree.chemin"
        data-test="entree-du-journal"
      >
        <p class="date">
          {{ libelleDate(entree.date) }} — {{ libelle(entree.evenement) }}
        </p>
        <PhotosDeFiche
          :photos="entree.photos"
          :legende="`${libelle(entree.evenement)}, ${libelleDate(entree.date)}`"
        />
        <TexteDeFiche :corps="entree.corps" />
      </li>
    </ol>
    <FichesInvalides :invalides="journal.invalides" />
  </div>
</template>
