<script setup lang="ts">
const depotDeDonnees = "https://github.com/sskorupski/skarden";
</script>

<template>
  <main class="accueil">
    <picture>
      <source
        srcset="/logotype-sombre.svg"
        media="(prefers-color-scheme: dark)"
      />
      <img class="logotype" src="/logotype.svg" alt="" />
    </picture>
    <h1>Skarden</h1>
    <p class="question">
      Que faut-il à chacune de mes plantes, et qu'ai-je appris en les cultivant
      ?
    </p>
    <p>
      Les fiches vivent dans le dépôt
      <a :href="depotDeDonnees">sskorupski/skarden</a> ; ce site les présentera.
    </p>
  </main>
</template>

<style scoped>
.accueil {
  max-width: 40rem;
  margin: 0 auto;
  padding: 4rem 1rem;
}

.logotype {
  height: 3rem;
}

/* Le logotype porte déjà le nom : le titre reste pour les lecteurs d'écran et les moteurs. */
h1 {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}

.question {
  font-size: 1.25rem;
}
</style>
