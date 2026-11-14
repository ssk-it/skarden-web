<script setup lang="ts">
import { RouterLink, useRouter } from "vue-router";
import ChampsDeRealisation from "../composants/ChampsDeRealisation.vue";
import ComparaisonALaRecette from "../composants/ComparaisonALaRecette.vue";
import DegustationsDeRealisation from "../composants/DegustationsDeRealisation.vue";
import EcartsEtResultat from "../composants/EcartsEtResultat.vue";
import IngredientEmploye from "../composants/IngredientEmploye.vue";
import JournalDeRealisation from "../composants/JournalDeRealisation.vue";
import MessageErreur from "../composants/MessageErreur.vue";
import PhaseRealisee from "../composants/PhaseRealisee.vue";
import PhotosDeFiche from "../composants/PhotosDeFiche.vue";
import RealisationFaceASaRecette from "../composants/RealisationFaceASaRecette.vue";
import TexteDeFiche from "../composants/TexteDeFiche.vue";
import { useDisposition } from "../composants/disposition";
import { libelle } from "../fiches/libelles";
import { useChargement, useIdentifiant } from "./contexte";
import { lireLaRealisation } from "./lecture-de-realisation";

// RG-page-d-une-realisation : on la relit comme elle s'est déroulée, avec ses dates, et on y voit tout de suite ce qui l'a fait réussir ou rater. La comparaison se fait avec la version courante de la recette, sans rien lire de plus que le commit (cadrage 2026-007, décision 06). Sur une fenêtre large, la recette se place en face (RG-realisation-face-a-sa-recette).
const id = useIdentifiant();
const { valeur, erreur, enCours } = useChargement(
  (depot) => lireLaRealisation(depot, id.value),
  () => id.value,
);
const { large, seule, faceAFace, basculer } = useDisposition();

// Choisir une autre réalisation de la recette change l'adresse, mais la page reste à l'écran le temps de la lire : le focus ne se perd pas.
const routeur = useRouter();
const choisir = (autre: string) =>
  routeur.push({ name: "realisation", params: { id: autre } });

const libelleDePhase = (phaseId: string) =>
  valeur.value?.recette?.phases.find((p) => p.id === phaseId)?.libelle ??
  libelle(phaseId);
</script>

<template>
  <main>
    <p v-if="enCours && !valeur" class="chargement">Lecture de la fiche…</p>
    <MessageErreur v-else-if="erreur" :erreur="erreur" />
    <article v-else-if="valeur" :aria-busy="enCours">
      <h2>{{ valeur.realisation.nom }}</h2>
      <button
        v-if="large && valeur.recette"
        type="button"
        class="bascule"
        data-test="bascule"
        :aria-pressed="seule"
        @click="basculer"
      >
        Réalisation seule
      </button>

      <RealisationFaceASaRecette
        v-if="faceAFace && valeur.recette && valeur.comparaison"
        :lecture="{
          ...valeur,
          recette: valeur.recette,
          comparaison: valeur.comparaison,
        }"
        @choisir="choisir"
      />
      <template v-else>
        <dl class="champs" data-test="champs">
          <dt>Recette</dt>
          <dd>
            <RouterLink
              :to="{
                name: 'recette',
                params: { id: valeur.realisation.recette },
              }"
              >{{
                valeur.recette?.nom ?? valeur.realisation.recette
              }}</RouterLink
            >, version {{ valeur.realisation.recetteVersion }} suivie
          </dd>
          <ChampsDeRealisation
            :realisation="valeur.realisation"
            :duree="valeur.duree"
          />
        </dl>

        <h3>Ingrédients</h3>
        <p v-if="valeur.realisation.ingredients.length === 0">
          Aucun ingrédient noté.
        </p>
        <ul v-else class="liste" data-test="ingredients">
          <li
            v-for="ingredient in valeur.realisation.ingredients"
            :key="ingredient.ingredient"
          >
            <IngredientEmploye
              :ingredient="ingredient"
              :produits="valeur.produits"
            />
          </li>
        </ul>

        <h3>Phases</h3>
        <p v-if="valeur.realisation.phases.length === 0">
          Aucune phase commencée.
        </p>
        <ol v-else class="phases" data-test="frise">
          <li
            v-for="phase in valeur.realisation.phases"
            :key="phase.id"
            data-test="phase"
          >
            <PhaseRealisee
              :realisation="valeur.realisation.id"
              :phase="phase"
              :libelle="libelleDePhase(phase.id)"
              :maintenant="valeur.maintenant"
              :contenants="valeur.contenants"
            />
          </li>
        </ol>

        <EcartsEtResultat :realisation="valeur.realisation" />

        <h3>Dégustations</h3>
        <DegustationsDeRealisation
          :degustations="valeur.degustations"
          :evolution="valeur.evolution"
        />

        <h3>Comparaison à la recette</h3>
        <div data-test="comparaison">
          <ComparaisonALaRecette
            v-if="valeur.comparaison && valeur.recette"
            :comparaison="valeur.comparaison"
            :version="valeur.recette.version"
            :suivie="valeur.realisation.recetteVersion"
          />
          <p v-else>
            La fiche de la recette « {{ valeur.realisation.recette }} » est
            introuvable ou illisible : pas de comparaison.
          </p>
        </div>

        <JournalDeRealisation :journal="valeur.journal" />

        <PhotosDeFiche
          :photos="valeur.realisation.photos"
          :legende="valeur.realisation.nom"
        />
        <TexteDeFiche :corps="valeur.realisation.corps" />
      </template>
    </article>
  </main>
</template>
