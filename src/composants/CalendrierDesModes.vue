<script setup lang="ts">
import { phasesDuMois, type Mode } from "../fiches/depot-de-fiches";
import { libelle, libelleMois } from "../fiches/libelles";

// RG-modes-et-phases : douze lignes, une colonne par mode ; un mois de transition porte deux phases.
defineProps<{ modes: Mode[] }>();
const MOIS = Array.from({ length: 12 }, (_, i) => i + 1);
</script>

<template>
  <table v-if="modes.length" class="tableau" data-test="calendrier">
    <caption>
      Calendrier des modes : la phase de chaque mois
    </caption>
    <thead>
      <tr>
        <th scope="col">Mois</th>
        <th v-for="mode in modes" :key="mode.id" scope="col">
          {{ libelle(mode.id) }}
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="mois in MOIS" :key="mois">
        <th scope="row">{{ libelleMois(mois) }}</th>
        <td v-for="mode in modes" :key="mode.id">
          {{ phasesDuMois(mode, mois).map(libelle).join(", ") }}
        </td>
      </tr>
    </tbody>
  </table>
</template>
