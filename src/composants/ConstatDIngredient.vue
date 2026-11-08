<script setup lang="ts">
import { libelleEcart } from "../fiches/libelles";
import type { ComparaisonDIngredient } from "../fiches/transformations";

// RG-comparaison-a-la-recette : l'écart d'un ingrédient, le même dans le tableau et sur la ligne alignée ; chaque signal se dit en toutes lettres, la mise en gras ne fait que le redoubler.
defineProps<{ ligne: ComparaisonDIngredient }>();
</script>

<template>
  <span data-test="constat">
    <template v-if="ligne.etat === 'employe'">
      <strong v-if="ligne.conservationDifferente"
        >conservation différente, écart non calculé</strong
      >
      <template v-else-if="ligne.incomparable"
        >unités différentes, écart non calculé</template
      >
      <template v-else-if="ligne.ecart && ligne.ecart.quantite === 0"
        >conforme</template
      >
      <strong v-else-if="ligne.ecart">{{ libelleEcart(ligne.ecart) }}</strong>
    </template>
    <strong v-else-if="ligne.etat === 'ajoute'">ajouté</strong>
    <strong v-else-if="ligne.etat === 'manquant'">manquant</strong>
    <template v-else>facultatif, non employé</template>
  </span>
</template>
