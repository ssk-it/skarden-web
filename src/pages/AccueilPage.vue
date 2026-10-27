<script setup lang="ts">
import { RouterLink } from "vue-router";
import FichesInvalides from "../composants/FichesInvalides.vue";
import MessageErreur from "../composants/MessageErreur.vue";
import { libelle, libelleDate } from "../fiches/libelles";
import { useChargement } from "./contexte";

// RG-accueil-cultures-en-cours, RG-accueil-elevages-en-cours : ce qui vit en ce moment, d'abord ; les cultures, puis les élevages.
const {
  valeur: accueil,
  erreur,
  enCours,
} = useChargement((depot) => depot.accueil());
</script>

<template>
  <main>
    <h2>Cultures en cours</h2>
    <p v-if="enCours" class="chargement">Lecture des cultures…</p>
    <MessageErreur v-else-if="erreur" :erreur="erreur" />
    <template v-else-if="accueil">
      <p v-if="accueil.cultures.length === 0">
        Aucune culture en cours.
        <RouterLink :to="{ name: 'plantes' }">Voir les plantes</RouterLink>
      </p>
      <ul class="cartes">
        <li
          v-for="{ culture, plante, emplacement, derniere } in accueil.cultures"
          :key="culture.id"
          data-test="culture-en-cours"
        >
          <RouterLink
            :to="{ name: 'culture', params: { id: culture.id } }"
            class="titre"
            >{{ plante?.nom ?? culture.plante }}</RouterLink
          >
          <span class="lieu"
            >{{ emplacement?.nom ?? culture.emplacement }}, depuis le
            {{ libelleDate(culture.debut) }}</span
          >
          <span v-if="derniere" class="derniere"
            >{{ libelleDate(derniere.date) }} —
            {{ libelle(derniere.evenement) }}</span
          >
        </li>
      </ul>
      <template v-if="accueil.elevages">
        <h2>Élevages en cours</h2>
        <p v-if="accueil.elevages.length === 0">Aucun élevage en cours.</p>
        <ul class="cartes">
          <li
            v-for="{
              elevage,
              animal,
              installation,
              phase,
              derniere,
            } in accueil.elevages"
            :key="elevage.id"
            data-test="elevage-en-cours"
          >
            <RouterLink
              :to="{ name: 'elevage', params: { id: elevage.id } }"
              class="titre"
              >{{ animal?.nom ?? elevage.animal }}</RouterLink
            >
            <span class="lieu"
              >{{ installation?.nom ?? elevage.installation }}, depuis le
              {{ libelleDate(elevage.debut) }}</span
            >
            <span v-if="phase.connue" class="phase"
              >En ce moment : {{ phase.phases.map(libelle).join(", ") }}</span
            >
            <span v-if="derniere" class="derniere"
              >{{ libelleDate(derniere.date) }} —
              {{ libelle(derniere.evenement) }}</span
            >
          </li>
        </ul>
      </template>
      <FichesInvalides :invalides="accueil.invalides" />
    </template>
  </main>
</template>
