<script setup lang="ts">
import { RouterLink } from "vue-router";
import FichesInvalides from "../composants/FichesInvalides.vue";
import MessageErreur from "../composants/MessageErreur.vue";
import PhotosDeFiche from "../composants/PhotosDeFiche.vue";
import TexteDeFiche from "../composants/TexteDeFiche.vue";
import { libelle, libelleDate } from "../fiches/libelles";
import { useChargement, useIdentifiant } from "./contexte";

const id = useIdentifiant();
const { valeur, erreur, enCours } = useChargement(
  async (depot) => {
    const culture = await depot.lireCulture(id.value);
    const [plante, emplacement, journal] = await Promise.all([
      depot.lirePlante(culture.plante).catch(() => undefined),
      depot.lireEmplacement(culture.emplacement).catch(() => undefined),
      depot.journalDe(culture),
    ]);
    return { culture, plante, emplacement, journal };
  },
  () => id.value,
);
</script>

<template>
  <main>
    <p v-if="enCours" class="chargement">Lecture de la fiche…</p>
    <MessageErreur v-else-if="erreur" :erreur="erreur" />
    <article v-else-if="valeur">
      <h2>
        {{ valeur.plante?.nom ?? valeur.culture.plante }} —
        {{ valeur.emplacement?.nom ?? valeur.culture.emplacement }}
      </h2>
      <dl class="champs">
        <dt>Plante</dt>
        <dd>
          <RouterLink
            :to="{ name: 'plante', params: { id: valeur.culture.plante } }"
            >{{ valeur.plante?.nom ?? valeur.culture.plante }}</RouterLink
          >
        </dd>
        <dt>Emplacement</dt>
        <dd>
          <RouterLink
            :to="{
              name: 'emplacement',
              params: { id: valeur.culture.emplacement },
            }"
            >{{
              valeur.emplacement?.nom ?? valeur.culture.emplacement
            }}</RouterLink
          >
        </dd>
        <template v-if="valeur.culture.origine">
          <dt>Origine</dt>
          <dd>{{ libelle(valeur.culture.origine) }}</dd>
        </template>
        <dt>Période</dt>
        <dd>
          depuis le {{ libelleDate(valeur.culture.debut)
          }}<template v-if="valeur.culture.fin"
            >, jusqu'au {{ libelleDate(valeur.culture.fin) }}</template
          >
        </dd>
        <dt>Statut</dt>
        <dd>{{ libelle(valeur.culture.statut) }}</dd>
      </dl>
      <PhotosDeFiche
        :photos="valeur.culture.photos"
        :legende="valeur.culture.id"
      />
      <TexteDeFiche :corps="valeur.culture.corps" />
      <h3>Journal</h3>
      <p v-if="valeur.journal.fiches.length === 0">Aucune entrée.</p>
      <ol class="journal">
        <li
          v-for="entree in valeur.journal.fiches"
          :key="entree.chemin"
          data-test="entree-du-journal"
        >
          <p class="date">
            {{ libelleDate(entree.date) }} — {{ libelle(entree.evenement) }}
          </p>
          <PhotosDeFiche
            :photos="entree.photos"
            :legende="`${libelle(entree.evenement)}, ${libelleDate(entree.date)}`"
          />
          <TexteDeFiche :corps="entree.corps" />
        </li>
      </ol>
      <FichesInvalides :invalides="valeur.journal.invalides" />
    </article>
  </main>
</template>
