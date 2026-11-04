<script setup lang="ts">
import type PhotoSwipe from "photoswipe";
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useDepot } from "../pages/contexte";
import { agrandir } from "./agrandissement";
import PhotoDeFiche from "./PhotoDeFiche.vue";

const props = defineProps<{ photos: string[]; legende: string }>();
const depot = useDepot();

interface Lecture {
  chemin: string;
  adresse?: string;
  indisponible: boolean;
}

const lectures = ref<Lecture[]>([]);
const galerie = ref<HTMLElement>();
let ouverte: PhotoSwipe | undefined;
let tour = 0;

// RG-photos-lues-sur-github : chaque photo arrive en blob, depuis le cache ou GitHub. Une lecture arrivée après que la fiche a changé de photos est libérée aussitôt.
watch(
  () => props.photos,
  (photos) => {
    const ceTour = ++tour;
    liberer();
    lectures.value = photos.map((chemin) => ({ chemin, indisponible: false }));
    photos.forEach(async (chemin, i) => {
      try {
        const adresse = URL.createObjectURL(
          await depot.value.lirePhoto(chemin),
        );
        const lecture = lectures.value[i];
        if (ceTour !== tour || !lecture) URL.revokeObjectURL(adresse);
        else lecture.adresse = adresse;
      } catch {
        const lecture = lectures.value[i];
        if (ceTour === tour && lecture) lecture.indisponible = true;
      }
    });
  },
  { immediate: true },
);

function liberer() {
  ouverte?.destroy();
  for (const { adresse } of lectures.value)
    if (adresse) URL.revokeObjectURL(adresse);
  lectures.value = [];
}

onBeforeUnmount(liberer);

// RG-galerie-des-photos : on passe d'une photo disponible à l'autre ; à la fermeture, le focus revient à la vignette d'où l'on venait.
async function ouvrir(rang: number) {
  const disponibles = lectures.value.filter((lecture) => lecture.adresse);
  const vignette = galerie.value?.querySelectorAll(".photo")[rang];
  ouverte = await agrandir(
    disponibles.map((lecture) => lecture.adresse as string),
    disponibles.indexOf(lectures.value[rang] as Lecture),
    props.legende,
    () => {
      ouverte = undefined;
      void nextTick(() => vignette?.querySelector("button")?.focus());
    },
  );
}
</script>

<template>
  <div v-if="lectures.length" ref="galerie" class="photos">
    <PhotoDeFiche
      v-for="(lecture, i) in lectures"
      :key="lecture.chemin"
      :chemin="lecture.chemin"
      :legende="legende"
      :rang="i + 1"
      :total="lectures.length"
      :adresse="lecture.adresse"
      :indisponible="lecture.indisponible"
      @agrandir="ouvrir(i)"
    />
  </div>
</template>
