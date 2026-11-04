<script setup lang="ts">
defineProps<{
  chemin: string;
  legende: string;
  rang: number;
  total: number;
  adresse?: string;
  indisponible: boolean;
}>();
defineEmits<{ agrandir: [] }>();
</script>

<!-- RG-galerie-des-photos : une vignette est un bouton, nommé par le texte de remplacement de sa photo ; une photo indisponible laisse sa place à son message (RG-photos-lues-sur-github), jamais à une image cassée, et ne s'agrandit pas. -->
<template>
  <figure class="photo">
    <button v-if="adresse" type="button" @click="$emit('agrandir')">
      <img :src="adresse" :alt="`${legende}, photo ${rang} sur ${total}`" />
    </button>
    <figcaption v-else-if="indisponible">
      Photo indisponible : {{ chemin }}
    </figcaption>
  </figure>
</template>
