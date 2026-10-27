<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import { useDepot } from "../pages/contexte";

const props = defineProps<{ chemin: string; legende: string }>();
const depot = useDepot();
const adresse = ref<string>();
const indisponible = ref(false);

// RG-photos-lues-sur-github : la photo arrive en blob, depuis le cache ou GitHub ; une photo indisponible laisse sa place à un message, jamais à une image cassée.
watch(
  () => props.chemin,
  async (chemin) => {
    liberer();
    indisponible.value = false;
    try {
      adresse.value = URL.createObjectURL(await depot.value.lirePhoto(chemin));
    } catch {
      indisponible.value = true;
    }
  },
  { immediate: true },
);

function liberer() {
  if (adresse.value) URL.revokeObjectURL(adresse.value);
  adresse.value = undefined;
}

onBeforeUnmount(liberer);
</script>

<template>
  <figure class="photo">
    <img v-if="adresse" :src="adresse" :alt="legende" loading="lazy" />
    <figcaption v-else-if="indisponible">
      Photo indisponible : {{ chemin }}
    </figcaption>
  </figure>
</template>
