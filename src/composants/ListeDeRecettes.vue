<script setup lang="ts">
import { RouterLink } from "vue-router";
import type { RecetteRangee } from "../fiches/transformations";

// RG-entree-des-recettes : chaque variante sous la recette dont elle dérive, à toute profondeur.
defineProps<{ recettes: RecetteRangee[] }>();
</script>

<template>
  <ul class="liste">
    <li v-for="rangee in recettes" :key="rangee.recette.id" data-test="recette">
      <RouterLink
        :to="{ name: 'recette', params: { id: rangee.recette.id } }"
        >{{ rangee.recette.nom }}</RouterLink
      >
      <div
        v-if="rangee.variantes.length"
        class="variantes"
        data-test="variantes"
      >
        <span class="discret">Variantes :</span>
        <ListeDeRecettes :recettes="rangee.variantes" />
      </div>
    </li>
  </ul>
</template>

<style scoped>
.variantes {
  padding-left: 1.25rem;
}
</style>
