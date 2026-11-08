<script setup lang="ts">
import { RouterLink } from "vue-router";
import AjoutDePhotos from "../composants/AjoutDePhotos.vue";
import FichesInvalides from "../composants/FichesInvalides.vue";
import ListeDeCultures from "../composants/ListeDeCultures.vue";
import ListeDeRealisations from "../composants/ListeDeRealisations.vue";
import MessageErreur from "../composants/MessageErreur.vue";
import PhotosDeFiche from "../composants/PhotosDeFiche.vue";
import TexteDeFiche from "../composants/TexteDeFiche.vue";
import { libelle, libelleMois, libellePeriode } from "../fiches/libelles";
import { useChargement, useIdentifiant } from "./contexte";

const id = useIdentifiant();
const { valeur, erreur, enCours } = useChargement(
  async (depot) => {
    const plante = await depot.lirePlante(id.value);
    const cultures = await depot.culturesDe(plante.id);
    // RG-realisations-d-une-fiche : la plante retrouve ses réalisations par ses cultures, jamais par un champ à elle (cadrage 2026-007, décision 05).
    const realisations = depot.declare("realisations")
      ? await depot.realisationsAvecCultures(cultures.fiches.map((c) => c.id))
      : undefined;
    return { plante, cultures, realisations };
  },
  () => id.value,
);
</script>

<template>
  <main>
    <p v-if="enCours" class="chargement">Lecture de la fiche…</p>
    <MessageErreur v-else-if="erreur" :erreur="erreur" />
    <article v-else-if="valeur">
      <h2>{{ valeur.plante.nom }}</h2>
      <p v-if="valeur.plante.nomLatin" class="latin">
        {{ valeur.plante.nomLatin }}
      </p>
      <dl class="champs">
        <dt>Famille</dt>
        <dd>
          <RouterLink
            :to="{ name: 'famille', params: { id: valeur.plante.famille } }"
            >{{ valeur.plante.famille }}</RouterLink
          >
        </dd>
        <dt>Type</dt>
        <dd>
          {{ libelle(valeur.plante.type) }}, {{ libelle(valeur.plante.cycle) }}
        </dd>
        <template v-if="valeur.plante.exposition">
          <dt>Exposition</dt>
          <dd>{{ libelle(valeur.plante.exposition) }}</dd>
        </template>
        <template v-if="valeur.plante.arrosage">
          <dt>Arrosage</dt>
          <dd>{{ libelle(valeur.plante.arrosage) }}</dd>
        </template>
        <template v-if="valeur.plante.temperatureMinC !== undefined">
          <dt>Souffre en dessous de</dt>
          <dd>{{ valeur.plante.temperatureMinC }} °C</dd>
        </template>
        <template
          v-for="(mois, periode) in valeur.plante.calendrier"
          :key="periode"
        >
          <dt>{{ libellePeriode(String(periode)) }}</dt>
          <dd>{{ mois.map(libelleMois).join(", ") }}</dd>
        </template>
        <template v-for="(ids, sens) in valeur.plante.associations" :key="sens">
          <template v-if="ids.length">
            <dt>
              {{
                sens === "favorables"
                  ? "Associations favorables"
                  : "Associations défavorables"
              }}
            </dt>
            <dd>
              <template v-for="(autre, i) in ids" :key="autre">
                <RouterLink :to="{ name: 'plante', params: { id: autre } }">{{
                  autre
                }}</RouterLink
                ><template v-if="i < ids.length - 1">, </template>
              </template>
            </dd>
          </template>
        </template>
      </dl>
      <PhotosDeFiche
        :photos="valeur.plante.photos"
        :legende="valeur.plante.nom"
      />
      <AjoutDePhotos collection="plantes" :fichier="valeur.plante.id" />
      <TexteDeFiche :corps="valeur.plante.corps" />
      <h3>Cultures</h3>
      <ListeDeCultures :cultures="valeur.cultures.fiches" />
      <FichesInvalides :invalides="valeur.cultures.invalides" />
      <template v-if="valeur.realisations">
        <h3>Réalisations</h3>
        <ListeDeRealisations :realisations="valeur.realisations.fiches" />
        <FichesInvalides :invalides="valeur.realisations.invalides" />
      </template>
    </article>
  </main>
</template>
