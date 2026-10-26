/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from "vite";
import vue from "@vitejs/plugin-vue";

// RG-jeton-d-un-depot-prive, RG-contenu-des-fiches-assaini : la page garde un jeton et rend des fiches de dépôts inconnus. Elle ne parle qu'à GitHub, n'exécute que ses propres scripts, et n'affiche que ses images et les photos reçues en blob. Posée au build seulement : le serveur de développement injecte ses styles en ligne.
const POLITIQUE_DE_SECURITE = [
  "default-src 'self'",
  "connect-src https://api.github.com https://raw.githubusercontent.com https://media.githubusercontent.com",
  "img-src 'self' blob:",
  "script-src 'self'",
  "style-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
].join("; ");

const politiqueDeSecurite: Plugin = {
  name: "politique-de-securite",
  apply: "build",
  transformIndexHtml: () => [
    {
      tag: "meta",
      attrs: {
        "http-equiv": "Content-Security-Policy",
        content: POLITIQUE_DE_SECURITE,
      },
      injectTo: "head-prepend",
    },
  ],
};

// Un site statique : `pnpm build` écrit dans `dist/` ce que n'importe quel hébergement de fichiers sert tel quel.
export default defineConfig({
  plugins: [vue(), politiqueDeSecurite],
  build: { target: "es2022" },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
  },
});
