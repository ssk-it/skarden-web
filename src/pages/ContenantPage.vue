<script setup lang="ts">
import FichesInvalides from "../composants/FichesInvalides.vue";
import ListeDeRealisations from "../composants/ListeDeRealisations.vue";
import MessageErreur from "../composants/MessageErreur.vue";
import PhotosDeFiche from "../composants/PhotosDeFiche.vue";
import TexteDeFiche from "../composants/TexteDeFiche.vue";
import { libelle, libelleQuantite } from "../fiches/libelles";
import { useChargement, useIdentifiant } from "./contexte";

// RG-champs-de-la-fiche-contenant, RG-realisations-d-une-fiche : un modèle de récipient, et ce qui y a reposé.
const id = useIdentifiant();
const { valeur, erreur, enCours } = useChargement(
  async (depot) => {
    const contenant = await depot.lireContenant(id.value);
    return {
      contenant,
      realisations: await depot.realisationsDans(contenant.id),
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
      <h2>{{ valeur.contenant.nom }}</h2>
      <dl class="champs" data-test="champs">
        <dt>Catégorie</dt>
        <dd>{{ libelle(valeur.contenant.categorie) }}</dd>
        <template v-if="valeur.contenant.contenance">
          <dt>Contenance</dt>
          <dd>{{ libelleQuantite(valeur.contenant.contenance) }}</dd>
        </template>
        <dt>Matière</dt>
        <dd>{{ libelle(valeur.contenant.matiere) }}</dd>
        <template v-if="valeur.contenant.fermeture">
          <dt>Fermeture</dt>
          <dd>{{ valeur.contenant.fermeture }}</dd>
        </template>
        <template v-if="valeur.contenant.nombre !== undefined">
          <dt>Exemplaires</dt>
          <dd>{{ valeur.contenant.nombre }}</dd>
        </template>
      </dl>
      <PhotosDeFiche
        :photos="valeur.contenant.photos"
        :legende="valeur.contenant.nom"
      />
      <TexteDeFiche :corps="valeur.contenant.corps" />
      <h3>Réalisations</h3>
      <ListeDeRealisations :realisations="valeur.realisations.fiches" />
      <FichesInvalides :invalides="valeur.realisations.invalides" />
    </article>
  </main>
</template>
