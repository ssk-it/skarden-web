<script setup lang="ts">
import { RouterLink } from "vue-router";
import FinDePhase from "./FinDePhase.vue";
import {
  libelleDateOuInstant,
  libelleDuree,
  libelleTemperature,
} from "../fiches/libelles";
import {
  dureeDePhase,
  type Contenant,
  type PhaseDeRealisation,
} from "../fiches/transformations";

// RG-page-d-une-realisation : une phase de la frise, sa durée calculée, son contenant et sa température ; sans fin, elle est « en cours » et sa durée court jusqu'à maintenant, et sa fin se déclare depuis la page (RG-fin-de-phase-declaree-depuis-le-site).
defineProps<{
  realisation: string;
  phase: PhaseDeRealisation;
  libelle: string;
  maintenant: number;
  contenants: Map<string, Contenant>;
}>();
</script>

<template>
  <div data-test="reelle">
    <p class="titre">
      {{ libelle
      }}<span v-if="phase.ajoutee" class="discret">
        (absente de la recette)</span
      >
    </p>
    <dl class="champs">
      <dt>Dates</dt>
      <dd>
        du {{ libelleDateOuInstant(phase.debut)
        }}<template v-if="phase.fin">
          au {{ libelleDateOuInstant(phase.fin) }}</template
        >
      </dd>
      <dt>Durée</dt>
      <dd>
        <template v-if="phase.fin">{{
          libelleDuree(dureeDePhase(phase, maintenant).ms)
        }}</template>
        <template v-else
          ><strong>en cours</strong>, depuis
          {{ libelleDuree(dureeDePhase(phase, maintenant).ms) }}</template
        >
      </dd>
      <template v-if="phase.contenant">
        <dt>Contenant</dt>
        <dd>
          <RouterLink
            :to="{ name: 'contenant', params: { id: phase.contenant } }"
            >{{
              contenants.get(phase.contenant)?.nom ?? phase.contenant
            }}</RouterLink
          ><template v-if="phase.nombre > 1"> × {{ phase.nombre }}</template>
        </dd>
      </template>
      <template v-if="phase.temperatureC">
        <dt>Température</dt>
        <dd>
          {{ libelleTemperature(phase.temperatureC)
          }}<template v-if="phase.temperatureC.mesure">
            ({{ phase.temperatureC.mesure }})</template
          >
        </dd>
      </template>
      <template v-if="phase.conditions">
        <dt>Conditions</dt>
        <dd>{{ phase.conditions }}</dd>
      </template>
    </dl>
    <FinDePhase :realisation="realisation" :phase="phase" :libelle="libelle" />
  </div>
</template>
