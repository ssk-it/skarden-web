<script setup lang="ts">
import { RouterLink } from "vue-router";
import FichesInvalides from "../composants/FichesInvalides.vue";
import ListeDElevages from "../composants/ListeDElevages.vue";
import MessageErreur from "../composants/MessageErreur.vue";
import PhotosDeFiche from "../composants/PhotosDeFiche.vue";
import TexteDeCapacite from "../composants/TexteDeCapacite.vue";
import TexteDeFiche from "../composants/TexteDeFiche.vue";
import { capacite, surfaceAuSolM2, volumeL } from "../fiches/depot-de-fiches";
import { libelle, libelleNombre } from "../fiches/libelles";
import { useChargement, useIdentifiant } from "./contexte";

// RG-page-d-une-installation : la capacité se lit à côté de ce dont elle dépend, et ne s'écrit nulle part.
const id = useIdentifiant();
const { valeur, erreur, enCours } = useChargement(
  async (depot) => {
    const installation = await depot.lireInstallation(id.value);
    const [emplacement, elevages] = await Promise.all([
      depot.lireEmplacement(installation.emplacement).catch(() => undefined),
      depot.elevagesDans(installation.id),
    ]);
    const animaux = [...new Set(elevages.fiches.map((e) => e.animal))];
    const capacites = await Promise.all(
      animaux.map(async (animalId) => {
        const animal = await depot.lireAnimal(animalId).catch(() => undefined);
        return {
          animalId,
          animal,
          capacite: animal && capacite(animal, installation),
        };
      }),
    );
    return {
      installation,
      emplacement,
      elevages,
      capacites,
      surface: surfaceAuSolM2(installation),
      volume: volumeL(installation),
    };
  },
  () => id.value,
);
</script>

<template>
  <main>
    <p v-if="enCours" class="chargement">Lecture de la fiche…</p>
    <MessageErreur v-else-if="erreur" :erreur="erreur" />
    <article v-else-if="valeur">
      <h2>{{ valeur.installation.nom }}</h2>
      <dl class="champs">
        <dt>Type</dt>
        <dd>{{ libelle(valeur.installation.type) }}</dd>
        <dt>Emplacement</dt>
        <dd>
          <RouterLink
            :to="{
              name: 'emplacement',
              params: { id: valeur.installation.emplacement },
            }"
            >{{
              valeur.emplacement?.nom ?? valeur.installation.emplacement
            }}</RouterLink
          >
        </dd>
        <template v-if="valeur.installation.dimensionsCm">
          <dt>Dimensions</dt>
          <dd>
            {{ valeur.installation.dimensionsCm.longueur }} ×
            {{ valeur.installation.dimensionsCm.largeur }} ×
            {{ valeur.installation.dimensionsCm.hauteur }} cm
          </dd>
        </template>
        <template v-if="valeur.surface !== undefined">
          <dt>Surface au sol</dt>
          <dd>{{ libelleNombre(valeur.surface) }} m²</dd>
        </template>
        <template v-if="valeur.volume !== undefined">
          <dt>Volume</dt>
          <dd>
            {{ libelleNombre(Math.round(valeur.volume)) }} L{{
              valeur.installation.volumeL === undefined
                ? ", d'après les dimensions"
                : ""
            }}
          </dd>
        </template>
      </dl>
      <h3>Capacité</h3>
      <p v-if="valeur.capacites.length === 0">Aucun animal n'est élevé ici.</p>
      <ul v-else class="liste" data-test="capacite">
        <li v-for="c in valeur.capacites" :key="c.animalId">
          <RouterLink :to="{ name: 'animal', params: { id: c.animalId } }">{{
            c.animal?.nom ?? c.animalId
          }}</RouterLink>
          :
          <TexteDeCapacite v-if="c.capacite" :capacite="c.capacite" />
          <template v-else>fiche de l'animal illisible</template>
        </li>
      </ul>
      <h3>Élevages</h3>
      <ListeDElevages :elevages="valeur.elevages.fiches" />
      <FichesInvalides :invalides="valeur.elevages.invalides" />
      <PhotosDeFiche
        :photos="valeur.installation.photos"
        :legende="valeur.installation.nom"
      />
      <TexteDeFiche :corps="valeur.installation.corps" />
    </article>
  </main>
</template>
