<script setup lang="ts">
import { computed } from "vue";
import { DepotIllisible, FichierIntrouvable } from "../depot/lecteur";
import { FicheIntrouvable } from "../fiches/depot-de-fiches";
import { FicheInvalide } from "../fiches/format";

// RG-depot-illisible-explique : dire pourquoi, et ce qu'il faut faire, dans le vocabulaire du visiteur.
const props = defineProps<{ erreur: unknown }>();

const illisible = computed(() =>
  props.erreur instanceof DepotIllisible ? props.erreur : undefined,
);
const introuvable = computed(() =>
  props.erreur instanceof FicheIntrouvable ? props.erreur : undefined,
);
const invalide = computed(() =>
  props.erreur instanceof FicheInvalide ? props.erreur : undefined,
);
const fichier = computed(() =>
  props.erreur instanceof FichierIntrouvable ? props.erreur : undefined,
);
const autre = computed(() =>
  props.erreur instanceof Error ? props.erreur.message : String(props.erreur),
);

const HEURE = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
});
</script>

<template>
  <p class="erreur" role="alert">
    <template v-if="illisible?.raison === 'introuvable'">
      Ce dépôt est introuvable. S'il est privé, saisissez un jeton GitHub qui a
      le droit de le lire.
    </template>
    <template v-else-if="illisible?.raison === 'jeton-refuse'">
      GitHub refuse ce jeton pour ce dépôt : il a expiré, ou n'a pas le droit de
      le lire. Oubliez-le, puis saisissez-en un autre ou lisez un dépôt public.
    </template>
    <template v-else-if="illisible?.raison === 'limite-atteinte'">
      GitHub limite le nombre de lectures sans jeton, et la limite est
      atteinte<template v-if="illisible.leveeA">
        jusqu'à {{ HEURE.format(illisible.leveeA) }}</template
      >. Un jeton GitHub la lève.
    </template>
    <template v-else-if="illisible?.raison === 'sans-referentiel'">
      Ce dépôt n'a pas de referentiel.yml à sa racine : ce n'est pas un dépôt de
      fiches Skarden.
    </template>
    <template v-else-if="illisible?.raison === 'format-inconnu'">
      Le referentiel.yml de ce dépôt décrit une version de format que ce site ne
      sait pas lire.
    </template>
    <template v-else-if="illisible?.raison === 'reseau'">
      GitHub n'a pas répondu. Vérifiez la connexion, puis rechargez la page.
    </template>
    <template v-else-if="introuvable"
      >Aucune fiche « {{ introuvable.id }} » dans
      {{ introuvable.collection }}.</template
    >
    <template v-else-if="invalide"
      >Cette fiche est invalide : {{ invalide.message }}.</template
    >
    <template v-else-if="fichier"
      >Le fichier {{ fichier.chemin }} est introuvable dans ce dépôt.</template
    >
    <template v-else>Une erreur inattendue : {{ autre }}.</template>
  </p>
</template>
