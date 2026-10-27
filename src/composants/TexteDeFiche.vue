<script setup lang="ts">
import { computed } from "vue";
import { rendreMarkdown } from "../fiches/markdown";

const props = defineProps<{ corps: string }>();
// RG-contenu-des-fiches-assaini : `rendreMarkdown` assainit, ce qui rend `v-html` sûr ici et seulement ici.
const html = computed(() => rendreMarkdown(props.corps));
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div v-if="corps.trim()" class="texte" v-html="html" />
</template>
