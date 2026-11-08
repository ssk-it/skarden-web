<script setup lang="ts">
import {
  libelle,
  libelleDate,
  libelleDelai,
  libelleNombre,
} from "../fiches/libelles";
import type { Critere, Degustation } from "../fiches/transformations";
import TexteDeFiche from "./TexteDeFiche.vue";

// RG-degustation-d-une-realisation : les critères en lignes et les participants en colonnes, pour tenir sur un téléphone ; une note absente se dit, et ne vaut pas zéro.
defineProps<{
  degustations: Degustation[];
  evolution: { critere: Critere; moyennes: (number | undefined)[] }[];
}>();
const note = (n: number | undefined) =>
  n === undefined ? "non noté" : libelleNombre(n);
</script>

<template>
  <p v-if="degustations.length === 0">Aucune dégustation.</p>
  <article
    v-for="degustation in degustations"
    :key="degustation.entree.chemin"
    class="degustation"
    data-test="degustation"
  >
    <h4>
      {{ libelleDate(degustation.entree.date) }} —
      {{ libelleDelai(degustation.delai) }}
    </h4>
    <table class="tableau">
      <caption>
        Notes sur 10, le
        {{
          libelleDate(degustation.entree.date)
        }}
      </caption>
      <thead>
        <tr>
          <th scope="col">Critère</th>
          <th
            v-for="avis in degustation.avis"
            :key="avis.participant"
            scope="col"
          >
            {{ avis.participant }}
          </th>
          <th scope="col">Moyenne</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="critere in degustation.criteres" :key="critere">
          <th scope="row">{{ libelle(critere) }}</th>
          <td v-for="avis in degustation.avis" :key="avis.participant">
            {{ note(avis.criteres[critere]) }}
          </td>
          <td>{{ note(degustation.moyennes[critere]) }}</td>
        </tr>
      </tbody>
    </table>
    <ul v-if="degustation.avis.some((a) => a.commentaire)" class="liste">
      <template v-for="avis in degustation.avis" :key="avis.participant">
        <li v-if="avis.commentaire">
          {{ avis.participant }} : {{ avis.commentaire }}
        </li>
      </template>
    </ul>
    <TexteDeFiche :corps="degustation.entree.corps" />
  </article>
  <table v-if="degustations.length > 1" class="tableau" data-test="evolution">
    <caption>
      Évolution des moyennes, d'une dégustation à l'autre
    </caption>
    <thead>
      <tr>
        <th scope="col">Critère</th>
        <th
          v-for="degustation in degustations"
          :key="degustation.entree.chemin"
          scope="col"
        >
          {{ libelleDate(degustation.entree.date) }}
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="ligne in evolution" :key="ligne.critere">
        <th scope="row">{{ libelle(ligne.critere) }}</th>
        <td v-for="(moyenne, i) in ligne.moyennes" :key="i">
          {{ note(moyenne) }}
        </td>
      </tr>
    </tbody>
  </table>
</template>
