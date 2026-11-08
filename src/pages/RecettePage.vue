<script setup lang="ts">
import { RouterLink } from "vue-router";
import FichesInvalides from "../composants/FichesInvalides.vue";
import ListeDeRealisations from "../composants/ListeDeRealisations.vue";
import MessageErreur from "../composants/MessageErreur.vue";
import PhotosDeFiche from "../composants/PhotosDeFiche.vue";
import TexteDeFiche from "../composants/TexteDeFiche.vue";
import {
  libelle,
  libellePlageDeDurees,
  libelleQuantite,
  libelleTemperature,
} from "../fiches/libelles";
import { useChargement, useIdentifiant } from "./contexte";

// RG-page-d-une-recette : d'où elle vient, ce qu'on en a dérivé, et combien de fois on l'a réellement faite.
const id = useIdentifiant();
const { valeur, erreur, enCours } = useChargement(
  async (depot) => {
    const recette = await depot.lireRecette(id.value);
    const [source, variantes, realisations] = await Promise.all([
      recette.deriveDe
        ? depot.lireRecette(recette.deriveDe).catch(() => undefined)
        : undefined,
      depot.variantesDe(recette.id),
      depot.realisationsDe(recette.id),
    ]);
    return { recette, source, variantes, realisations };
  },
  () => id.value,
);
</script>

<template>
  <main>
    <p v-if="enCours" class="chargement">Lecture de la fiche…</p>
    <MessageErreur v-else-if="erreur" :erreur="erreur" />
    <article v-else-if="valeur">
      <h2>{{ valeur.recette.nom }}</h2>
      <dl class="champs" data-test="champs">
        <dt>Catégorie</dt>
        <dd>{{ libelle(valeur.recette.categorie) }}</dd>
        <dt>Version</dt>
        <dd>{{ valeur.recette.version }}</dd>
        <template v-if="valeur.recette.rendement">
          <dt>Rendement</dt>
          <dd>{{ libelleQuantite(valeur.recette.rendement) }}</dd>
        </template>
        <template v-if="valeur.recette.deriveDe">
          <dt>Dérive de</dt>
          <dd>
            <RouterLink
              :to="{ name: 'recette', params: { id: valeur.recette.deriveDe } }"
              >{{ valeur.source?.nom ?? valeur.recette.deriveDe }}</RouterLink
            >
          </dd>
        </template>
        <template v-if="valeur.variantes.fiches.length">
          <dt>Variantes</dt>
          <dd>
            <template
              v-for="(variante, i) in valeur.variantes.fiches"
              :key="variante.id"
            >
              <RouterLink
                :to="{ name: 'recette', params: { id: variante.id } }"
                >{{ variante.nom }}</RouterLink
              ><template v-if="i < valeur.variantes.fiches.length - 1"
                >,
              </template>
            </template>
          </dd>
        </template>
      </dl>

      <h3>Ingrédients</h3>
      <ul class="liste" data-test="ingredients">
        <li
          v-for="ingredient in valeur.recette.ingredients"
          :key="ingredient.ingredient"
        >
          {{ libelleQuantite(ingredient) }} — {{ libelle(ingredient.ingredient)
          }}<template v-if="ingredient.conservation"
            >, {{ libelle(ingredient.conservation) }}</template
          >
          <span v-if="ingredient.optionnel" class="discret"> (facultatif)</span>
          <span v-if="ingredient.note" class="discret">
            — {{ ingredient.note }}</span
          >
        </li>
      </ul>

      <h3>Phases</h3>
      <ol class="phases">
        <li
          v-for="phase in valeur.recette.phases"
          :key="phase.id"
          data-test="phase"
        >
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
        </li>
      </ol>

      <h3>Réalisations</h3>
      <ListeDeRealisations :realisations="valeur.realisations.fiches" />
      <FichesInvalides :invalides="valeur.realisations.invalides" />

      <template v-if="valeur.recette.sources.length">
        <h3>Sources</h3>
        <ul class="liste">
          <li v-for="source in valeur.recette.sources" :key="source">
            {{ source }}
          </li>
        </ul>
      </template>
      <PhotosDeFiche
        :photos="valeur.recette.photos"
        :legende="valeur.recette.nom"
      />
      <TexteDeFiche :corps="valeur.recette.corps" />
    </article>
  </main>
</template>
