<script setup lang="ts">
import type { Capacite } from "../fiches/depot-de-fiches";

// RG-capacite-calculee : quand elle ne se calcule pas, on dit pourquoi, sans inventer de valeur.
defineProps<{ capacite: Capacite }>();
</script>

<template>
  <template v-if="capacite.calculable"
    >{{ capacite.min }} à {{ capacite.max }} individus</template
  >
  <template v-else-if="capacite.raison === 'sans-densite'"
    >ne se calcule pas : l'animal n'a pas de densité</template
  >
  <template v-else-if="capacite.raison === 'sans-surface'"
    >ne se calcule pas : l'installation n'a pas de dimensions au sol</template
  >
  <template v-else
    >ne se calcule pas : l'installation n'a ni volume ni dimensions</template
  >
</template>
