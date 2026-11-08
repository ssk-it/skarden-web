<script setup lang="ts">
import FichesInvalides from "../composants/FichesInvalides.vue";
import ListeDeRealisations from "../composants/ListeDeRealisations.vue";
import MessageErreur from "../composants/MessageErreur.vue";
import PhotosDeFiche from "../composants/PhotosDeFiche.vue";
import TexteDeFiche from "../composants/TexteDeFiche.vue";
import { libelle, libelleQuantite } from "../fiches/libelles";
import { useChargement, useIdentifiant } from "./contexte";

// RG-champs-de-la-fiche-produit, RG-realisations-d-une-fiche : depuis un sachet de bissap, on retrouve ce qu'on en a fait.
const id = useIdentifiant();
const { valeur, erreur, enCours } = useChargement(
  async (depot) => {
    const produit = await depot.lireProduit(id.value);
    return {
      produit,
      realisations: await depot.realisationsAvecProduit(produit.id),
    };
  },
  () => id.value,
);
// Un lien venu d'une fiche ne mène qu'au web : ni `javascript:`, ni rien d'autre.
const siteWeb = (url?: string) =>
  url && /^https?:\/\//.test(url) ? url : undefined;
</script>

<template>
  <main>
    <p v-if="enCours" class="chargement">Lecture de la fiche…</p>
    <MessageErreur v-else-if="erreur" :erreur="erreur" />
    <article v-else-if="valeur">
      <h2>{{ valeur.produit.nom }}</h2>
      <dl class="champs" data-test="champs">
        <dt>Ingrédient</dt>
        <dd>
          {{ libelle(valeur.produit.ingredient)
          }}<template v-if="valeur.produit.conservation"
            >, {{ libelle(valeur.produit.conservation) }}</template
          >
        </dd>
        <template v-if="valeur.produit.marque">
          <dt>Marque</dt>
          <dd>{{ valeur.produit.marque }}</dd>
        </template>
        <template v-if="valeur.produit.fournisseur">
          <dt>Fournisseur</dt>
          <dd>{{ valeur.produit.fournisseur }}</dd>
        </template>
        <template v-if="valeur.produit.origine">
          <dt>Origine</dt>
          <dd>{{ valeur.produit.origine }}</dd>
        </template>
        <template v-if="valeur.produit.conditionnement">
          <dt>Conditionnement</dt>
          <dd>{{ libelleQuantite(valeur.produit.conditionnement) }}</dd>
        </template>
        <template v-if="valeur.produit.reference">
          <dt>Référence</dt>
          <dd>{{ valeur.produit.reference }}</dd>
        </template>
        <template v-if="siteWeb(valeur.produit.url)">
          <dt>Page du produit</dt>
          <dd>
            <a :href="siteWeb(valeur.produit.url)" rel="noopener noreferrer">{{
              valeur.produit.url
            }}</a>
          </dd>
        </template>
      </dl>
      <PhotosDeFiche
        :photos="valeur.produit.photos"
        :legende="valeur.produit.nom"
      />
      <TexteDeFiche :corps="valeur.produit.corps" />
      <h3>Réalisations</h3>
      <ListeDeRealisations :realisations="valeur.realisations.fiches" />
      <FichesInvalides :invalides="valeur.realisations.invalides" />
    </article>
  </main>
</template>
