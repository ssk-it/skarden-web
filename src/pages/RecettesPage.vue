<script setup lang="ts">
import FichesInvalides from "../composants/FichesInvalides.vue";
import ListeDeRecettes from "../composants/ListeDeRecettes.vue";
import MessageErreur from "../composants/MessageErreur.vue";
import { libelle } from "../fiches/libelles";
import { recettesParCategorie } from "../fiches/transformations";
import { useChargement } from "./contexte";

// RG-entree-des-recettes : par catégorie puis par nom, chaque variante sous sa source.
const { valeur, erreur, enCours } = useChargement(async (depot) => {
  const recettes = await depot.listerRecettes();
  return {
    categories: recettesParCategorie(recettes.fiches),
    invalides: recettes.invalides,
  };
});
const titre = (categorie: string) => {
  const mot = libelle(categorie);
  return mot.charAt(0).toUpperCase() + mot.slice(1);
};
</script>

<template>
  <main>
    <h2>Recettes</h2>
    <p v-if="enCours" class="chargement">Lecture des recettes…</p>
    <MessageErreur v-else-if="erreur" :erreur="erreur" />
    <template v-else-if="valeur">
      <p v-if="valeur.categories.length === 0">Aucune recette.</p>
      <section
        v-for="categorie in valeur.categories"
        :key="categorie.categorie"
      >
        <h3>{{ titre(categorie.categorie) }}</h3>
        <ListeDeRecettes :recettes="categorie.recettes" />
      </section>
      <FichesInvalides :invalides="valeur.invalides" />
    </template>
  </main>
</template>
