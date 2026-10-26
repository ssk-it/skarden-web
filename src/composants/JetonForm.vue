<script setup lang="ts">
import { ref } from "vue";

// RG-jeton-d-un-depot-prive : le jeton ne se saisit qu'ici, ne se réaffiche jamais, et s'oublie par un bouton.
defineProps<{ memorise: boolean }>();
const emit = defineEmits<{ saisir: [jeton: string]; oublier: [] }>();
const jeton = ref("");

function saisir() {
  const valeur = jeton.value.trim();
  if (!valeur) return;
  jeton.value = "";
  emit("saisir", valeur);
}
</script>

<template>
  <div class="jeton">
    <p v-if="memorise">
      Un jeton GitHub est mémorisé sur cet appareil.
      <button type="button" data-test="oublier-jeton" @click="emit('oublier')">
        Oublier le jeton
      </button>
    </p>
    <form v-else data-test="jeton" @submit.prevent="saisir">
      <label>
        Jeton GitHub, pour un dépôt privé
        <input
          v-model="jeton"
          name="jeton"
          type="password"
          autocomplete="off"
          spellcheck="false"
        />
      </label>
      <button type="submit">Lire avec ce jeton</button>
      <p class="aide">
        Un jeton à granularité fine, limité à ce dépôt, en lecture seule (<em
          >Contents : read</em
        >). Il reste sur cet appareil et ne part que vers GitHub.
      </p>
    </form>
  </div>
</template>
