<script setup lang="ts">
import { ref, useId, watch } from "vue";
import { RouterLink } from "vue-router";
import {
  libelle,
  libelleDateOuInstant,
  libelleQuantite,
} from "../fiches/libelles";
import type { Comparaison, Recette } from "../fiches/transformations";
import type { LectureDeRealisation } from "../pages/lecture-de-realisation";
import ChampsDeRealisation from "./ChampsDeRealisation.vue";
import ConstatDePhase from "./ConstatDePhase.vue";
import ConstatDIngredient from "./ConstatDIngredient.vue";
import DegustationsDeRealisation from "./DegustationsDeRealisation.vue";
import EcartsEtResultat from "./EcartsEtResultat.vue";
import IngredientEmploye from "./IngredientEmploye.vue";
import IngredientPrevu from "./IngredientPrevu.vue";
import JournalDeRealisation from "./JournalDeRealisation.vue";
import PhasePrevue from "./PhasePrevue.vue";
import PhaseRealisee from "./PhaseRealisee.vue";
import PhotosDeFiche from "./PhotosDeFiche.vue";
import TexteDeFiche from "./TexteDeFiche.vue";

// RG-realisation-face-a-sa-recette : la recette suivie à gauche, la réalisation à droite, alignées ligne à ligne, l'écart sur la ligne côté réalisation (RG-comparaison-a-la-recette). Chaque ligne se lit en entier, recette puis réalisation, avant la suivante (WCAG 1.3.2).
const props = defineProps<{
  lecture: LectureDeRealisation & {
    recette: Recette;
    comparaison: Comparaison;
  };
}>();
const emit = defineEmits<{ choisir: [id: string] }>();

const idDuSelecteur = useId();
const choisie = ref<string>();
watch(
  () => props.lecture.autres,
  (autres) => (choisie.value = autres[0]?.id),
  { immediate: true },
);
function afficher() {
  if (choisie.value) emit("choisir", choisie.value);
}
</script>

<template>
  <div class="face-a-face" data-test="face-a-face">
    <p v-if="lecture.comparaison.versionDifferente" class="alerte">
      La recette est en version {{ lecture.recette.version }}, et cette
      réalisation a suivi la version {{ lecture.realisation.recetteVersion }} :
      la recette a changé depuis, et les écarts peuvent venir de ce changement.
    </p>

    <div class="ligne entetes" data-test="entetes">
      <section
        data-cote="recette"
        :aria-labelledby="`${idDuSelecteur}-recette`"
      >
        <h3 :id="`${idDuSelecteur}-recette`">
          <span class="visuellement-cache">Recette suivie : </span>
          <RouterLink
            :to="{ name: 'recette', params: { id: lecture.recette.id } }"
            >{{ lecture.recette.nom }}</RouterLink
          >
        </h3>
        <dl class="champs">
          <dt>Version</dt>
          <dd>{{ lecture.recette.version }}</dd>
          <dt>Catégorie</dt>
          <dd>{{ libelle(lecture.recette.categorie) }}</dd>
          <template v-if="lecture.recette.rendement">
            <dt>Rendement</dt>
            <dd>{{ libelleQuantite(lecture.recette.rendement) }}</dd>
          </template>
          <template v-if="lecture.recette.deriveDe">
            <dt>Dérive de</dt>
            <dd>
              <RouterLink
                :to="{
                  name: 'recette',
                  params: { id: lecture.recette.deriveDe },
                }"
                >{{
                  lecture.source?.nom ?? lecture.recette.deriveDe
                }}</RouterLink
              >
            </dd>
          </template>
        </dl>
      </section>
      <section
        data-cote="realisation"
        :aria-labelledby="`${idDuSelecteur}-realisation`"
      >
        <h3 :id="`${idDuSelecteur}-realisation`">Réalisation</h3>
        <p class="visuellement-cache" role="status">
          {{ lecture.realisation.nom }}
        </p>
        <dl class="champs">
          <dt>Version suivie</dt>
          <dd>{{ lecture.realisation.recetteVersion }}</dd>
          <ChampsDeRealisation
            :realisation="lecture.realisation"
            :duree="lecture.duree"
          />
        </dl>
        <form
          v-if="lecture.autres.length"
          class="autres-realisations"
          data-test="autres-realisations"
          @submit.prevent="afficher"
        >
          <label :for="idDuSelecteur">Autre réalisation de la recette</label>
          <select :id="idDuSelecteur" v-model="choisie">
            <option
              v-for="autre in lecture.autres"
              :key="autre.id"
              :value="autre.id"
            >
              {{ autre.nom }} — {{ libelle(autre.statut) }}, depuis le
              {{ libelleDateOuInstant(autre.debut) }}
            </option>
          </select>
          <button type="submit">Afficher</button>
        </form>
      </section>
    </div>

    <h3>Ingrédients</h3>
    <ul class="lignes" data-test="lignes-ingredients">
      <li
        v-for="ligne in lecture.comparaison.ingredients"
        :key="`${ligne.etat}-${ligne.ingredient}`"
        class="ligne"
        data-test="ligne-ingredient"
        :data-ingredient="ligne.ingredient"
      >
        <div data-cote="recette">
          <span class="visuellement-cache">Prévu : </span>
          <IngredientPrevu v-if="'prevu' in ligne" :ingredient="ligne.prevu" />
          <span v-else class="visuellement-cache">rien.</span>
        </div>
        <div data-cote="realisation">
          <span class="visuellement-cache">Employé : </span>
          <IngredientEmploye
            v-if="'employe' in ligne"
            :ingredient="ligne.employe"
            :produits="lecture.produits"
          />
          <span v-else class="visuellement-cache">rien.</span>
          <p class="constat"><ConstatDIngredient :ligne="ligne" /></p>
        </div>
      </li>
    </ul>

    <h3>Phases</h3>
    <ol class="lignes" data-test="lignes-phases">
      <li
        v-for="ligne in lecture.comparaison.phases"
        :key="`${ligne.etat}-${ligne.id}`"
        class="ligne"
        data-test="ligne-phase"
      >
        <div data-cote="recette">
          <span class="visuellement-cache">Prévue : </span>
          <PhasePrevue v-if="'cible' in ligne" :phase="ligne.cible" />
          <span v-else class="visuellement-cache">rien.</span>
        </div>
        <div data-cote="realisation">
          <span class="visuellement-cache">Réalisée : </span>
          <PhaseRealisee
            v-if="'reelle' in ligne"
            :realisation="lecture.realisation.id"
            :phase="ligne.reelle"
            :libelle="
              'cible' in ligne ? ligne.cible.libelle : libelle(ligne.id)
            "
            :maintenant="lecture.maintenant"
            :contenants="lecture.contenants"
          />
          <span v-else class="visuellement-cache">rien.</span>
          <p class="constat"><ConstatDePhase :ligne="ligne" /></p>
        </div>
      </li>
    </ol>

    <div class="ligne propres" data-test="propres">
      <section data-cote="recette" :aria-labelledby="`${idDuSelecteur}-notes`">
        <h3 :id="`${idDuSelecteur}-notes`">La recette</h3>
        <template v-if="lecture.variantes.length">
          <h4>Variantes</h4>
          <ul class="liste">
            <li v-for="variante in lecture.variantes" :key="variante.id">
              <RouterLink
                :to="{ name: 'recette', params: { id: variante.id } }"
                >{{ variante.nom }}</RouterLink
              >
            </li>
          </ul>
        </template>
        <template v-if="lecture.recette.sources.length">
          <h4>Sources</h4>
          <ul class="liste">
            <li v-for="source in lecture.recette.sources" :key="source">
              {{ source }}
            </li>
          </ul>
        </template>
        <PhotosDeFiche
          :photos="lecture.recette.photos"
          :legende="lecture.recette.nom"
        />
        <TexteDeFiche :corps="lecture.recette.corps" />
      </section>
      <section data-cote="realisation">
        <EcartsEtResultat :realisation="lecture.realisation" />
        <h3>Dégustations</h3>
        <DegustationsDeRealisation
          :degustations="lecture.degustations"
          :evolution="lecture.evolution"
        />
        <JournalDeRealisation :journal="lecture.journal" />
        <PhotosDeFiche
          :photos="lecture.realisation.photos"
          :legende="lecture.realisation.nom"
        />
        <TexteDeFiche :corps="lecture.realisation.corps" />
      </section>
    </div>
  </div>
</template>
