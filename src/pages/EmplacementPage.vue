<script setup lang="ts">
import { RouterLink } from "vue-router";
import FichesInvalides from "../composants/FichesInvalides.vue";
import ListeDeCultures from "../composants/ListeDeCultures.vue";
import MessageErreur from "../composants/MessageErreur.vue";
import PhotosDeFiche from "../composants/PhotosDeFiche.vue";
import TexteDeFiche from "../composants/TexteDeFiche.vue";
import { libelle } from "../fiches/libelles";
import { useChargement, useIdentifiant } from "./contexte";

const id = useIdentifiant();
const { valeur, erreur, enCours } = useChargement(
  async (depot) => {
    const emplacement = await depot.lireEmplacement(id.value);
    const [cultures, installations] = await Promise.all([
      depot.culturesA(emplacement.id),
      // RG-page-d-une-installation : l'emplacement montre les installations qu'il abrite, si le dépôt en déclare.
      depot.declare("installations")
        ? depot.installationsA(emplacement.id)
        : undefined,
    ]);
    return { emplacement, cultures, installations };
  },
  () => id.value,
);
</script>

<template>
  <main>
    <p v-if="enCours" class="chargement">Lecture de la fiche…</p>
    <MessageErreur v-else-if="erreur" :erreur="erreur" />
    <article v-else-if="valeur">
      <h2>{{ valeur.emplacement.nom }}</h2>
      <dl class="champs">
        <dt>Lieu</dt>
        <dd>
          {{ valeur.emplacement.interieur ? "à l'intérieur" : "à l'extérieur" }}
        </dd>
        <template v-if="valeur.emplacement.exposition">
          <dt>Exposition</dt>
          <dd>{{ libelle(valeur.emplacement.exposition) }}</dd>
        </template>
        <template v-if="valeur.emplacement.support">
          <dt>Support</dt>
          <dd>{{ libelle(valeur.emplacement.support) }}</dd>
        </template>
      </dl>
      <PhotosDeFiche
        :photos="valeur.emplacement.photos"
        :legende="valeur.emplacement.nom"
      />
      <TexteDeFiche :corps="valeur.emplacement.corps" />
      <h3>Cultures</h3>
      <ListeDeCultures :cultures="valeur.cultures.fiches" />
      <FichesInvalides :invalides="valeur.cultures.invalides" />
      <template v-if="valeur.installations">
        <h3>Installations</h3>
        <p v-if="valeur.installations.fiches.length === 0">
          Aucune installation.
        </p>
        <ul class="liste">
          <li
            v-for="installation in valeur.installations.fiches"
            :key="installation.id"
          >
            <RouterLink
              :to="{ name: 'installation', params: { id: installation.id } }"
              >{{ installation.nom }}</RouterLink
            >
            <span class="discret"> — {{ libelle(installation.type) }}</span>
          </li>
        </ul>
        <FichesInvalides :invalides="valeur.installations.invalides" />
      </template>
    </article>
  </main>
</template>
