<script setup lang="ts">
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
    return { emplacement, cultures: await depot.culturesA(emplacement.id) };
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
    </article>
  </main>
</template>
