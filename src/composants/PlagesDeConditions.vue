<script setup lang="ts">
import type { Plage } from "../fiches/depot-de-fiches";
import { libelle, libelleNombre } from "../fiches/libelles";

// RG-plages-de-conditions : une borne absente laisse la plage ouverte ; la zone à éviter se lit comme une plage, pas comme un seuil.
defineProps<{ plages: Plage[] }>();
const grave = (etat: string) => etat === "a-eviter" || etat === "mortel";
</script>

<template>
  <table v-if="plages.length" class="tableau" data-test="plages">
    <caption>
      Plages de conditions
    </caption>
    <thead>
      <tr>
        <th scope="col">Paramètre</th>
        <th scope="col">Plage</th>
        <th scope="col">État</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(plage, i) in plages" :key="i">
        <th scope="row">{{ libelle(plage.parametre) }}</th>
        <td>
          <template v-if="plage.min !== undefined && plage.max !== undefined"
            >de {{ libelleNombre(plage.min) }} à
            {{ libelleNombre(plage.max) }}</template
          >
          <template v-else-if="plage.max !== undefined"
            >jusqu'à {{ libelleNombre(plage.max) }}</template
          >
          <template v-else-if="plage.min !== undefined"
            >à partir de {{ libelleNombre(plage.min) }}</template
          >
        </td>
        <td>
          <strong v-if="grave(plage.etat)">{{ libelle(plage.etat) }}</strong>
          <template v-else>{{ libelle(plage.etat) }}</template>
        </td>
      </tr>
    </tbody>
  </table>
</template>
