<script setup lang="ts">
import {
  libelle,
  libelleDateOuInstant,
  libelleDuree,
} from "../fiches/libelles";
import type { Duree, Realisation } from "../fiches/transformations";

// RG-page-d-une-realisation : son statut, ses dates et sa durée totale, dans la liste de champs qui l'accueille.
defineProps<{ realisation: Realisation; duree: Duree }>();
</script>

<template>
  <dt>Statut</dt>
  <dd>{{ libelle(realisation.statut) }}</dd>
  <dt>Période</dt>
  <dd>
    depuis le {{ libelleDateOuInstant(realisation.debut)
    }}<template v-if="realisation.fin"
      >, jusqu'au {{ libelleDateOuInstant(realisation.fin) }}</template
    >
  </dd>
  <dt>Durée</dt>
  <dd>
    {{ libelleDuree(duree.ms)
    }}<template v-if="duree.enCours">, en cours</template>
  </dd>
</template>
