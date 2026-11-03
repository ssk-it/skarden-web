<script setup lang="ts">
import { RouterLink } from "vue-router";
import FichesInvalides from "../composants/FichesInvalides.vue";
import MessageErreur from "../composants/MessageErreur.vue";
import { libelle } from "../fiches/libelles";
import { useChargement } from "./contexte";

// RG-liste-des-emplacements : les emplacements, triés par nom, et sous chacun les installations qu'il abrite — sans passer par aucun lot, pour qu'un bac se retrouve avant qu'on y élève quoi que ce soit.
const { valeur, erreur, enCours } = useChargement(async (depot) => {
  const [emplacements, installations] = await Promise.all([
    depot.listerEmplacements(),
    depot.declare("installations") ? depot.listerInstallations() : undefined,
  ]);
  return { emplacements, installations };
});

const installationsA = (emplacementId: string) =>
  valeur.value?.installations?.fiches.filter(
    (i) => i.emplacement === emplacementId,
  ) ?? [];
</script>

<template>
  <main>
    <h2>Emplacements</h2>
    <p v-if="enCours" class="chargement">Lecture des emplacements…</p>
    <MessageErreur v-else-if="erreur" :erreur="erreur" />
    <template v-else-if="valeur">
      <p v-if="valeur.emplacements.fiches.length === 0">Aucun emplacement.</p>
      <ul class="liste">
        <li
          v-for="emplacement in valeur.emplacements.fiches"
          :key="emplacement.id"
          data-test="emplacement"
        >
          <RouterLink
            :to="{ name: 'emplacement', params: { id: emplacement.id } }"
            >{{ emplacement.nom }}</RouterLink
          >
          <span class="discret">
            —
            {{
              emplacement.interieur ? "à l'intérieur" : "à l'extérieur"
            }}</span
          >
          <ul
            v-if="installationsA(emplacement.id).length > 0"
            class="liste abritees"
          >
            <li
              v-for="installation in installationsA(emplacement.id)"
              :key="installation.id"
              data-test="installation"
            >
              <RouterLink
                :to="{ name: 'installation', params: { id: installation.id } }"
                >{{ installation.nom }}</RouterLink
              >
              <span class="discret"> — {{ libelle(installation.type) }}</span>
            </li>
          </ul>
        </li>
      </ul>
      <FichesInvalides :invalides="valeur.emplacements.invalides" />
      <FichesInvalides
        v-if="valeur.installations"
        :invalides="valeur.installations.invalides"
      />
    </template>
  </main>
</template>

<style scoped>
/* Les installations se lisent sous l'emplacement qui les abrite. */
.abritees {
  padding-left: 1.25rem;
}
</style>
