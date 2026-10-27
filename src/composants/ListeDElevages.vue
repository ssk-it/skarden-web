<script setup lang="ts">
import { RouterLink } from "vue-router";
import type { Elevage } from "../fiches/depot-de-fiches";
import { libelle, libelleDate } from "../fiches/libelles";

defineProps<{ elevages: Elevage[] }>();
</script>

<template>
  <p v-if="elevages.length === 0">Aucun élevage.</p>
  <ul v-else class="liste">
    <li v-for="elevage in elevages" :key="elevage.id" data-test="elevage">
      <RouterLink :to="{ name: 'elevage', params: { id: elevage.id } }">{{
        elevage.id
      }}</RouterLink>
      <span class="discret">
        — {{ libelle(elevage.statut) }}, {{ libelleDate(elevage.debut)
        }}<template v-if="elevage.fin">
          → {{ libelleDate(elevage.fin) }}</template
        >
      </span>
    </li>
  </ul>
</template>
