<script setup lang="ts">
import { RouterLink, RouterView } from "vue-router";
</script>

<template>
  <div class="site">
    <header class="entete">
      <RouterLink to="/" class="marque">
        <picture>
          <source
            srcset="/logotype-sombre.svg"
            media="(prefers-color-scheme: dark)"
          />
          <img class="logotype" src="/logotype.svg" alt="" />
        </picture>
        <h1>Skarden</h1>
      </RouterLink>
    </header>
    <RouterView />
  </div>
</template>

<style scoped>
.site {
  max-width: 44rem;
  margin: 0 auto;
  padding: 1.5rem 1rem 4rem;
}

.logotype {
  height: 2.5rem;
}

/* Le logotype porte déjà le nom : le titre reste pour les lecteurs d'écran et les moteurs. */
h1 {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}
</style>
