<script setup lang="ts">
import {
  libelle,
  libelleDuree,
  libelleEcart,
  libellePlageDeDurees,
  libelleQuantite,
  libelleTemperature,
} from "../fiches/libelles";
import type { Comparaison } from "../fiches/transformations";

// RG-comparaison-a-la-recette : l'écart entre ce qu'on visait et ce qu'on a fait se lit d'un coup d'œil ; chaque signal se dit en toutes lettres, la mise en gras ne fait que le redoubler.
defineProps<{
  comparaison: Comparaison;
  version: number;
  suivie: number;
}>();
</script>

<template>
  <p v-if="comparaison.versionDifferente" class="alerte">
    La recette est en version {{ version }}, et cette réalisation a suivi la
    version {{ suivie }} : la recette a changé depuis, et les écarts peuvent
    venir de ce changement.
  </p>
  <table class="tableau">
    <caption>
      Ingrédients, prévus et employés
    </caption>
    <thead>
      <tr>
        <th scope="col">Ingrédient</th>
        <th scope="col">Prévu, puis employé</th>
        <th scope="col">Écart</th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="ligne in comparaison.ingredients"
        :key="`${ligne.etat}-${ligne.ingredient}`"
        data-test="comparaison-ingredient"
      >
        <th scope="row">{{ libelle(ligne.ingredient) }}</th>
        <!-- Prévu et employé partagent une colonne : quatre colonnes ne tiendraient pas sur un téléphone (WCAG 1.4.10). -->
        <td>
          <template v-if="'prevu' in ligne"
            >{{ libelleQuantite(ligne.prevu)
            }}<template v-if="ligne.prevu.conservation"
              >, {{ libelle(ligne.prevu.conservation) }}</template
            ></template
          >
          <template v-else>non prévu</template>
          <br />
          <template v-if="'employe' in ligne"
            >{{ libelleQuantite(ligne.employe)
            }}<template v-if="ligne.employe.conservation"
              >, {{ libelle(ligne.employe.conservation) }}</template
            ></template
          >
          <template v-else>non employé</template>
        </td>
        <td>
          <template v-if="ligne.etat === 'employe'">
            <strong v-if="ligne.conservationDifferente"
              >conservation différente, écart non calculé</strong
            >
            <template v-else-if="ligne.incomparable"
              >unités différentes, écart non calculé</template
            >
            <template v-else-if="ligne.ecart && ligne.ecart.quantite === 0"
              >conforme</template
            >
            <strong v-else-if="ligne.ecart">{{
              libelleEcart(ligne.ecart)
            }}</strong>
          </template>
          <strong v-else-if="ligne.etat === 'ajoute'">ajouté</strong>
          <strong v-else-if="ligne.etat === 'manquant'">manquant</strong>
          <template v-else>facultatif, non employé</template>
        </td>
      </tr>
    </tbody>
  </table>
  <table class="tableau">
    <caption>
      Phases, visées et réelles
    </caption>
    <thead>
      <tr>
        <th scope="col">Phase</th>
        <th scope="col">Durée</th>
        <th scope="col">Température</th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="ligne in comparaison.phases"
        :key="`${ligne.etat}-${ligne.id}`"
        data-test="comparaison-phase"
      >
        <!-- Le constat suit le nom de la phase : une quatrième colonne ne tiendrait pas sur un téléphone (WCAG 1.4.10). -->
        <th scope="row">
          {{ ligne.libelle }}<br />
          <template v-if="ligne.etat === 'realisee'">réalisée</template>
          <template v-else-if="ligne.etat === 'en-cours'">en cours</template>
          <template v-else-if="ligne.etat === 'a-venir'">à venir</template>
          <strong v-else-if="ligne.etat === 'ajoutee'">ajoutée</strong>
          <strong v-else>n'a pas eu lieu</strong>
        </th>
        <td>
          <template v-if="'duree' in ligne">{{
            libelleDuree(ligne.duree.ms)
          }}</template>
          <template v-if="'cible' in ligne && ligne.cible.dureeCible">
            <span class="discret">
              (cible : {{ libellePlageDeDurees(ligne.cible.dureeCible) }})</span
            ></template
          >
          <strong v-if="'duree' in ligne && ligne.duree.horsPlage === 'longue'">
            trop longue</strong
          >
          <strong v-if="'duree' in ligne && ligne.duree.horsPlage === 'courte'">
            trop courte</strong
          >
        </td>
        <td>
          <template v-if="'reelle' in ligne && ligne.reelle.temperatureC">{{
            libelleTemperature(ligne.reelle.temperatureC)
          }}</template>
          <template v-if="'cible' in ligne && ligne.cible.temperatureC">
            <span class="discret">
              (cible :
              {{ libelleTemperature(ligne.cible.temperatureC) }})</span
            ></template
          >
          <strong v-if="'temperature' in ligne && ligne.temperature?.horsPlage">
            hors plage</strong
          >
        </td>
      </tr>
    </tbody>
  </table>
</template>
