<script setup lang="ts">
import type { ComparaisonDePhase } from "../fiches/transformations";

// RG-comparaison-a-la-recette : ce qu'il est advenu d'une phase de la recette, et ce qui sort de sa plage cible ; le même dans le tableau et sur la ligne alignée.
defineProps<{ ligne: ComparaisonDePhase }>();
</script>

<template>
  <span data-test="constat">
    <template v-if="ligne.etat === 'realisee'">réalisée</template>
    <template v-else-if="ligne.etat === 'en-cours'">en cours</template>
    <template v-else-if="ligne.etat === 'a-venir'">à venir</template>
    <strong v-else-if="ligne.etat === 'ajoutee'">ajoutée</strong>
    <strong v-else>n'a pas eu lieu</strong>
    <template v-if="'duree' in ligne && ligne.duree.horsPlage"
      >,
      <strong>{{
        ligne.duree.horsPlage === "longue" ? "trop longue" : "trop courte"
      }}</strong></template
    >
    <template v-if="'temperature' in ligne && ligne.temperature?.horsPlage"
      >, <strong>température hors plage</strong></template
    >
  </span>
</template>
