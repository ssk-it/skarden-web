<script setup lang="ts">
import { RouterLink } from "vue-router";
import FichesInvalides from "../composants/FichesInvalides.vue";
import MessageErreur from "../composants/MessageErreur.vue";
import PhotosDeFiche from "../composants/PhotosDeFiche.vue";
import TexteDeCapacite from "../composants/TexteDeCapacite.vue";
import TexteDeFiche from "../composants/TexteDeFiche.vue";
import {
  capacite,
  dernierEffectif,
  moisEnCours,
  phaseDuMoment,
} from "../fiches/depot-de-fiches";
import { libelle, libelleDate, libelleMois } from "../fiches/libelles";
import { useChargement, useIdentifiant } from "./contexte";

// RG-page-d-un-elevage : on voit d'un coup d'œil ce qu'il faut faire ce mois-ci, et si l'effectif visé tient dans le bac.
const id = useIdentifiant();
const { valeur, erreur, enCours } = useChargement(
  async (depot) => {
    const elevage = await depot.lireElevage(id.value);
    const [animal, installation, journal] = await Promise.all([
      depot.lireAnimal(elevage.animal).catch(() => undefined),
      depot.lireInstallation(elevage.installation).catch(() => undefined),
      depot.journalDElevage(elevage),
    ]);
    return {
      elevage,
      animal,
      installation,
      journal,
      phase: phaseDuMoment(elevage, animal, moisEnCours()),
      capacite: animal && installation && capacite(animal, installation),
      compte: dernierEffectif(journal.fiches),
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
      <h2>
        {{ valeur.animal?.nom ?? valeur.elevage.animal }} —
        {{ valeur.installation?.nom ?? valeur.elevage.installation }}
      </h2>
      <dl class="champs">
        <dt>Animal</dt>
        <dd>
          <RouterLink
            :to="{ name: 'animal', params: { id: valeur.elevage.animal } }"
            >{{ valeur.animal?.nom ?? valeur.elevage.animal }}</RouterLink
          >
        </dd>
        <dt>Installation</dt>
        <dd>
          <RouterLink
            :to="{
              name: 'installation',
              params: { id: valeur.elevage.installation },
            }"
            >{{
              valeur.installation?.nom ?? valeur.elevage.installation
            }}</RouterLink
          >
        </dd>
        <dt>Période</dt>
        <dd>
          depuis le {{ libelleDate(valeur.elevage.debut)
          }}<template v-if="valeur.elevage.fin"
            >, jusqu'au {{ libelleDate(valeur.elevage.fin) }}</template
          >
        </dd>
        <dt>Statut</dt>
        <dd>{{ libelle(valeur.elevage.statut) }}</dd>
        <dt>Origine</dt>
        <dd>{{ libelle(valeur.elevage.origine) }}</dd>
        <template
          v-if="
            valeur.elevage.origine === 'souche' && valeur.elevage.elevageParent
          "
        >
          <dt>Souche</dt>
          <dd>
            <RouterLink
              :to="{
                name: 'elevage',
                params: { id: valeur.elevage.elevageParent },
              }"
              >{{ valeur.elevage.elevageParent }}</RouterLink
            >
          </dd>
        </template>
        <template v-if="valeur.elevage.mode">
          <dt>Mode</dt>
          <dd>{{ libelle(valeur.elevage.mode) }}</dd>
        </template>
      </dl>

      <h3>En ce moment</h3>
      <div data-test="phase-du-moment">
        <template v-if="valeur.phase.connue">
          <p>
            En {{ libelleMois(valeur.phase.mois) }} :
            <strong>{{ valeur.phase.phases.map(libelle).join(", ") }}</strong>
          </p>
          <p v-if="valeur.phase.soins.length === 0">
            Aucun soin de routine pour cette phase.
          </p>
          <ul v-else class="liste">
            <li v-for="soin in valeur.phase.soins" :key="soin.soin">
              {{ libelle(soin.soin) }} — {{ libelle(soin.frequence) }}
            </li>
          </ul>
        </template>
        <p v-else-if="valeur.phase.raison === 'pas-en-cours'">
          Élevage
          {{ valeur.elevage.statut === "perdue" ? "perdu" : "terminé" }} : il
          n'a pas de phase du moment.
        </p>
        <p v-else-if="valeur.phase.raison === 'sans-mode'">
          Aucun mode retenu : pas de phase du moment.
        </p>
        <p v-else-if="valeur.phase.raison === 'mode-inconnu'">
          Le mode « {{ valeur.elevage.mode }} » n'existe pas dans la fiche de
          l'animal : pas de phase du moment.
        </p>
        <p v-else>
          La fiche de l'animal est illisible : pas de phase du moment.
        </p>
      </div>

      <h3>Effectif</h3>
      <dl class="champs" data-test="effectif">
        <dt>Effectif visé</dt>
        <dd>
          <template v-if="valeur.elevage.effectifCible !== undefined">{{
            valeur.elevage.effectifCible
          }}</template>
          <template v-else>non précisé</template>
        </dd>
        <dt>Capacité de l'installation</dt>
        <dd>
          <TexteDeCapacite v-if="valeur.capacite" :capacite="valeur.capacite" />
          <template v-else>inconnue, faute de fiche lisible</template>
        </dd>
        <dt>Dernier effectif compté</dt>
        <dd>
          <template v-if="valeur.compte"
            >{{ valeur.compte.effectif }}, le
            {{ libelleDate(valeur.compte.date) }}</template
          >
          <template v-else>aucun comptage au journal</template>
        </dd>
      </dl>

      <h3>Journal</h3>
      <p v-if="valeur.journal.fiches.length === 0">Aucune entrée.</p>
      <ol class="journal">
        <li
          v-for="entree in valeur.journal.fiches"
          :key="entree.chemin"
          data-test="entree-du-journal"
        >
          <p class="date">
            {{ libelleDate(entree.date) }} — {{ libelle(entree.evenement)
            }}<template v-if="entree.effectif !== undefined"
              >, effectif : {{ entree.effectif }}</template
            >
          </p>
          <PhotosDeFiche
            :photos="entree.photos"
            :legende="`${libelle(entree.evenement)}, ${libelleDate(entree.date)}`"
          />
          <TexteDeFiche :corps="entree.corps" />
        </li>
      </ol>
      <FichesInvalides :invalides="valeur.journal.invalides" />
      <PhotosDeFiche
        :photos="valeur.elevage.photos"
        :legende="valeur.elevage.id"
      />
      <TexteDeFiche :corps="valeur.elevage.corps" />
    </article>
  </main>
</template>
