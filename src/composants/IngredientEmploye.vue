<script setup lang="ts">
import { RouterLink } from "vue-router";
import {
  libelle,
  libelleDate,
  libelleNombre,
  libelleQuantite,
} from "../fiches/libelles";
import type {
  IngredientDeRealisation,
  Produit,
} from "../fiches/transformations";

// RG-page-d-une-realisation : un ingrédient employé, avec sa provenance et un lien vers son produit ou sa culture.
defineProps<{
  ingredient: IngredientDeRealisation;
  produits: Map<string, Produit>;
}>();
</script>

<template>
  <span data-test="employe"
    >{{ libelleQuantite(ingredient) }} — {{ libelle(ingredient.ingredient)
    }}<template v-if="ingredient.conservation"
      >, {{ libelle(ingredient.conservation) }}</template
    >
    <span v-if="ingredient.ajoute" class="discret">
      (absent de la recette)</span
    >
    <template v-if="ingredient.produit">
      — acheté :
      <RouterLink
        :to="{ name: 'produit', params: { id: ingredient.produit } }"
        >{{
          produits.get(ingredient.produit)?.nom ?? ingredient.produit
        }}</RouterLink
      ><template v-if="ingredient.lot">, lot {{ ingredient.lot }}</template
      ><template v-if="ingredient.dluo"
        >, DLUO {{ libelleDate(ingredient.dluo) }}</template
      ><template v-if="ingredient.achat?.date"
        >, acheté le {{ libelleDate(ingredient.achat.date) }}</template
      ><template v-if="ingredient.achat?.lieu">
        à {{ ingredient.achat.lieu }}</template
      ><template v-if="ingredient.achat?.prixEur !== undefined"
        >, {{ libelleNombre(ingredient.achat.prixEur) }} €</template
      >
    </template>
    <template v-else-if="ingredient.culture">
      — récolte de
      <RouterLink
        :to="{ name: 'culture', params: { id: ingredient.culture } }"
        >{{ ingredient.culture }}</RouterLink
      ><template v-if="ingredient.recolte"
        >, cueillie le {{ libelleDate(ingredient.recolte) }}</template
      >
    </template></span
  >
</template>
