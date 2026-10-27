<script setup lang="ts">
import type { FicheEnErreur } from "../fiches/depot-de-fiches";

defineProps<{ invalides: FicheEnErreur[] }>();
</script>

<template>
  <details v-if="invalides.length" class="invalides">
    <summary>
      {{ invalides.length }} fiche(s) illisible(s), laissée(s) de côté
    </summary>
    <ul>
      <li v-for="fiche in invalides" :key="fiche.chemin">
        <code>{{ fiche.chemin }}</code> — {{ fiche.message }}
      </li>
    </ul>
  </details>
</template>
