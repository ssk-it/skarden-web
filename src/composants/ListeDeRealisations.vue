<script setup lang="ts">
import { RouterLink } from "vue-router";
import { libelle, libelleDateOuInstant } from "../fiches/libelles";
import type { Realisation } from "../fiches/transformations";

// RG-realisations-d-une-fiche, RG-page-d-une-recette : la plus récente d'abord, avec son statut.
defineProps<{ realisations: Realisation[] }>();
</script>

<template>
  <p v-if="realisations.length === 0">Aucune réalisation.</p>
  <ul v-else class="liste">
    <li
      v-for="realisation in realisations"
      :key="realisation.id"
      data-test="realisation"
    >
      <RouterLink
        :to="{ name: 'realisation', params: { id: realisation.id } }"
        >{{ realisation.nom }}</RouterLink
      >
      <span class="discret">
        — {{ libelle(realisation.statut) }},
        {{ libelleDateOuInstant(realisation.debut)
        }}<template v-if="realisation.fin">
          → {{ libelleDateOuInstant(realisation.fin) }}</template
        >
      </span>
    </li>
  </ul>
</template>
