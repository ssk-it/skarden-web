<script setup lang="ts">
import { RouterLink } from "vue-router";
import CalendrierDesModes from "../composants/CalendrierDesModes.vue";
import FichesInvalides from "../composants/FichesInvalides.vue";
import ListeDElevages from "../composants/ListeDElevages.vue";
import MessageErreur from "../composants/MessageErreur.vue";
import PhotosDeFiche from "../composants/PhotosDeFiche.vue";
import PlagesDeConditions from "../composants/PlagesDeConditions.vue";
import TexteDeFiche from "../composants/TexteDeFiche.vue";
import { libelle, libelleNombre } from "../fiches/libelles";
import { useChargement, useIdentifiant } from "./contexte";

// RG-page-d-un-animal : ce qui interdit de prélever, puis ce qui tue l'espèce, avant le reste ; l'ordre du gabarit est celui de la règle.
const id = useIdentifiant();
const { valeur, erreur, enCours } = useChargement(
  async (depot) => {
    const animal = await depot.lireAnimal(id.value);
    const [famille, procedures, elevages] = await Promise.all([
      animal.famille
        ? depot.lireFamille(animal.famille).catch(() => undefined)
        : undefined,
      Promise.all(
        animal.procedures.map((p) =>
          depot.lireProcedure(p).catch(() => undefined),
        ),
      ),
      depot.elevagesDe(animal.id),
    ]);
    return { animal, famille, procedures, elevages };
  },
  () => id.value,
);
</script>

<template>
  <main>
    <p v-if="enCours" class="chargement">Lecture de la fiche…</p>
    <MessageErreur v-else-if="erreur" :erreur="erreur" />
    <article v-else-if="valeur">
      <h2>{{ valeur.animal.nom }}</h2>
      <p v-if="valeur.animal.nomLatin" class="latin">
        {{ valeur.animal.nomLatin }}
      </p>
      <p
        data-test="protection"
        :class="{ alerte: valeur.animal.protection !== 'aucune' }"
      >
        <strong v-if="valeur.animal.protection !== 'aucune'"
          >Espèce {{ libelle(valeur.animal.protection) }}</strong
        >
        <template v-else>Protection : aucune</template>
      </p>
      <dl class="champs">
        <dt>Milieu</dt>
        <dd>{{ libelle(valeur.animal.milieu) }}</dd>
        <template v-if="valeur.animal.famille">
          <dt>Famille</dt>
          <dd>
            <RouterLink
              :to="{ name: 'famille', params: { id: valeur.animal.famille } }"
              >{{ valeur.famille?.nom ?? valeur.animal.famille }}</RouterLink
            >
          </dd>
        </template>
      </dl>
      <PlagesDeConditions :plages="valeur.animal.plages" />
      <CalendrierDesModes :modes="valeur.animal.modes" />
      <dl class="champs">
        <template v-if="valeur.animal.densite">
          <dt>Densité</dt>
          <dd>
            {{ libelleNombre(valeur.animal.densite.min) }} à
            {{ libelleNombre(valeur.animal.densite.max) }}
            {{ libelle(valeur.animal.densite.unite) }}
          </dd>
        </template>
        <template v-if="valeur.animal.complements.length">
          <dt>Compléments</dt>
          <dd>{{ valeur.animal.complements.map(libelle).join(", ") }}</dd>
        </template>
        <template v-if="valeur.animal.reproduction">
          <dt>Reproduction</dt>
          <dd>
            <template v-if="valeur.animal.reproduction.mode">{{
              libelle(valeur.animal.reproduction.mode)
            }}</template>
            <template v-if="valeur.animal.reproduction.fecondite"
              ><template v-if="valeur.animal.reproduction.mode">, </template
              >{{ valeur.animal.reproduction.fecondite.min }} à
              {{ valeur.animal.reproduction.fecondite.max }} descendants par
              adulte et par saison</template
            >
          </dd>
        </template>
        <template v-if="valeur.animal.stades.length">
          <dt>Stades</dt>
          <dd>{{ valeur.animal.stades.map(libelle).join(", ") }}</dd>
        </template>
      </dl>
      <template v-if="valeur.animal.routine.length">
        <h3>Routine</h3>
        <ul class="liste">
          <li v-for="soin in valeur.animal.routine" :key="soin.soin">
            {{ libelle(soin.soin) }} — {{ libelle(soin.frequence) }},
            <template v-if="soin.phases.length"
              >en {{ soin.phases.map(libelle).join(" et ") }}</template
            >
            <template v-else>dans toutes les phases</template>
          </li>
        </ul>
      </template>
      <template v-if="valeur.animal.procedures.length">
        <h3>Procédures</h3>
        <ul class="liste">
          <li
            v-for="(procedure, i) in valeur.animal.procedures"
            :key="procedure"
          >
            <RouterLink
              :to="{ name: 'procedure', params: { id: procedure } }"
              >{{ valeur.procedures[i]?.nom ?? procedure }}</RouterLink
            >
          </li>
        </ul>
      </template>
      <h3>Élevages</h3>
      <ListeDElevages :elevages="valeur.elevages.fiches" />
      <FichesInvalides :invalides="valeur.elevages.invalides" />
      <PhotosDeFiche
        :photos="valeur.animal.photos"
        :legende="valeur.animal.nom"
      />
      <TexteDeFiche :corps="valeur.animal.corps" />
    </article>
  </main>
</template>
