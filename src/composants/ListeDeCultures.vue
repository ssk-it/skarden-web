<script setup lang="ts">
import { RouterLink } from "vue-router";
import type { Culture } from "../fiches/depot-de-fiches";
import { libelle, libelleDate } from "../fiches/libelles";

defineProps<{ cultures: Culture[] }>();
</script>

<template>
  <p v-if="cultures.length === 0">Aucune culture.</p>
  <ul v-else class="liste">
    <li v-for="culture in cultures" :key="culture.id" data-test="culture">
      <RouterLink :to="{ name: 'culture', params: { id: culture.id } }">{{
        culture.id
      }}</RouterLink>
      <span class="discret">
        — {{ libelle(culture.statut) }}, {{ libelleDate(culture.debut)
        }}<template v-if="culture.fin">
          → {{ libelleDate(culture.fin) }}</template
        >
      </span>
    </li>
  </ul>
</template>
