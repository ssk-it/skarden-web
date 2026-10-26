/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// Un site statique : `pnpm build` écrit dans `dist/` ce que n'importe quel hébergement de fichiers sert tel quel.
export default defineConfig({
  plugins: [vue()],
  build: { target: "es2022" },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
  },
});
