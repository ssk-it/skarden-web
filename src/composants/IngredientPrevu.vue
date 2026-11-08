<script setup lang="ts">
import { libelle, libelleQuantite } from "../fiches/libelles";
import type { IngredientDeRecette } from "../fiches/transformations";

// Un ingrédient tel que la recette le prévoit : sur la page de la recette, et dans sa colonne en face d'une réalisation.
defineProps<{ ingredient: IngredientDeRecette }>();
</script>

<template>
  <span data-test="prevu"
    >{{ libelleQuantite(ingredient) }} — {{ libelle(ingredient.ingredient)
    }}<template v-if="ingredient.conservation"
      >, {{ libelle(ingredient.conservation) }}</template
    >
    <span v-if="ingredient.optionnel" class="discret"> (facultatif)</span>
    <span v-if="ingredient.note" class="discret">
      — {{ ingredient.note }}</span
    ></span
  >
</template>
