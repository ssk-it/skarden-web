<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { lireDepotSaisi, memoireDuVisiteur } from "../depot/visiteur";

const routeur = useRouter();
const dernier = memoireDuVisiteur.dernierDepot();
const saisie = ref(dernier ? `${dernier.proprietaire}/${dernier.depot}` : "");
const refusee = ref(false);

function ouvrir() {
  const depot = lireDepotSaisi(saisie.value);
  refusee.value = !depot;
  if (depot)
    void routeur.push({
      name: "accueil",
      params: { proprietaire: depot.proprietaire, depot: depot.depot },
    });
}
</script>

<template>
  <main>
    <p class="question">
      Que faut-il à chacune de mes plantes, et qu'ai-je appris en les cultivant
      ?
    </p>
    <form class="saisie" @submit.prevent="ouvrir">
      <label>
        Le dépôt GitHub des fiches
        <input
          v-model="saisie"
          name="depot"
          placeholder="propriétaire/dépôt"
          autocomplete="off"
          spellcheck="false"
        />
      </label>
      <button type="submit">Ouvrir</button>
    </form>
    <p v-if="refusee" class="erreur" role="alert">
      Saisissez un dépôt sous la forme propriétaire/dépôt, ou son adresse
      GitHub.
    </p>
    <p class="aide">
      Le site lit, dans votre navigateur, un dépôt de fiches au format Skarden :
      il n'en garde aucune, et n'écrit nulle part.
    </p>
  </main>
</template>
