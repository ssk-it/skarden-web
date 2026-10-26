<script setup lang="ts">
import PhotoDeFiche from "./PhotoDeFiche.vue";

defineProps<{ photos: string[]; legende: string }>();
</script>

<template>
  <div v-if="photos.length" class="photos">
    <PhotoDeFiche
      v-for="chemin in photos"
      :key="chemin"
      :chemin="chemin"
      :legende="legende"
    />
  </div>
</template>
