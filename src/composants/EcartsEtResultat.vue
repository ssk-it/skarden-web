<script setup lang="ts">
import { libelleNombre, libelleQuantite } from "../fiches/libelles";
import type { Realisation } from "../fiches/transformations";

// RG-page-d-une-realisation : ses écarts notés et son résultat.
defineProps<{ realisation: Realisation }>();
</script>

<template>
  <template v-if="realisation.ecarts.length">
    <h3>Écarts</h3>
    <ul class="liste">
      <li v-for="ecart in realisation.ecarts" :key="ecart">{{ ecart }}</li>
    </ul>
  </template>
  <template v-if="realisation.resultat">
    <h3>Résultat</h3>
    <dl class="champs" data-test="resultat">
      <template v-if="realisation.resultat.volumeObtenu">
        <dt>Volume obtenu</dt>
        <dd>{{ libelleQuantite(realisation.resultat.volumeObtenu) }}</dd>
      </template>
      <template v-if="realisation.resultat.degreEstime !== undefined">
        <dt>Degré estimé</dt>
        <dd>{{ libelleNombre(realisation.resultat.degreEstime) }} % vol</dd>
      </template>
    </dl>
  </template>
</template>
