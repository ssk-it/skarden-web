<script setup lang="ts">
import {
  libelle,
  libellePlageDeDurees,
  libelleTemperature,
} from "../fiches/libelles";
import type { PhaseDeRecette } from "../fiches/transformations";

// Une phase telle que la recette l'écrit : sur la page de la recette, et dans sa colonne en face d'une réalisation.
defineProps<{ phase: PhaseDeRecette }>();
</script>

<template>
  <div data-test="cible">
    <p class="titre">{{ phase.libelle }}</p>
    <dl class="champs">
      <template v-if="phase.dureeCible">
        <dt>Durée</dt>
        <dd>{{ libellePlageDeDurees(phase.dureeCible) }}</dd>
      </template>
      <template v-if="phase.temperatureC">
        <dt>Température</dt>
        <dd>{{ libelleTemperature(phase.temperatureC) }}</dd>
      </template>
      <template v-if="phase.contenantCategorie">
        <dt>Contenant</dt>
        <dd>{{ libelle(phase.contenantCategorie) }}</dd>
      </template>
      <template v-if="phase.conditions">
        <dt>Conditions</dt>
        <dd>{{ phase.conditions }}</dd>
      </template>
    </dl>
  </div>
</template>
