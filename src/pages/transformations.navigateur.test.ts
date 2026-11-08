import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { page as navigateur, userEvent } from "vitest/browser";
import { createMemoryHistory, type Router } from "vue-router";
import App from "../App.vue";
import { lecteurEnMemoire } from "../depot/lecteur-en-memoire";
import { CLE_OUVRIR_DEPOT, type OuvrirDepot } from "../depot/ouvrir";
import { DepotDeFiches } from "../fiches/depot-de-fiches";
import { DEPOT_EXEMPLE } from "../fiches/depot-exemple";
import { creerRouteur } from "../routeur";
import "../style.css";

const D = "/sskorupski/skarden";
let page: VueWrapper | undefined;
let routeur: Router;

afterEach(() => {
  page?.unmount();
  document.body.innerHTML = "";
});

async function visiter(adresse: string) {
  page?.unmount();
  const ouvrir: OuvrirDepot = async () =>
    DepotDeFiches.ouvrir(lecteurEnMemoire(DEPOT_EXEMPLE));
  routeur = creerRouteur(createMemoryHistory());
  await routeur.push(adresse);
  page = mount(App, {
    attachTo: document.body,
    global: {
      plugins: [routeur],
      provide: { [CLE_OUVRIR_DEPOT as symbol]: ouvrir },
    },
  });
  await flushPromises();
}

// Suivre un lien au clavier : le focus dessus, puis Entrée.
async function suivre(href: string) {
  const lien = document.querySelector<HTMLAnchorElement>(`a[href='${href}']`);
  expect(lien, href).not.toBeNull();
  lien?.focus();
  expect(document.activeElement).toBe(lien);
  await userEvent.keyboard("{Enter}");
  await flushPromises();
  await new Promise((r) => setTimeout(r, 0));
  await flushPromises();
}

describe("les transformations au clavier", () => {
  it("mènent de l'accueil à la réalisation en cours, puis à son bocal, sans souris", async () => {
    await visiter(D);
    await suivre(`${D}/recettes`);
    expect(routeur.currentRoute.value.fullPath).toBe(`${D}/recettes`);
    await suivre(`${D}/recettes/liqueur-hibiscus`);
    expect(document.querySelector("h2")?.textContent).toBe(
      "Liqueur d'hibiscus",
    );
    await suivre(`${D}/realisations/2026-11-08-liqueur-hibiscus`);
    expect(document.querySelector("h2")?.textContent).toBe(
      "Liqueur d'hibiscus, novembre 2026",
    );
    await suivre(`${D}/contenants/bocal-parfait-1l`);
    expect(document.querySelector("h2")?.textContent).toBe(
      "Bocal Le Parfait 1 l",
    );
  });

  // WCAG 1.4.10 : la page d'une réalisation, ses tableaux compris, tient sur un téléphone sans défilement horizontal.
  it("tiennent sur la largeur d'un téléphone", async () => {
    await navigateur.viewport(320, 640);
    await visiter(`${D}/realisations/2026-05-01-liqueur-hibiscus`);
    expect(document.querySelectorAll("[data-test=degustation]")).toHaveLength(
      2,
    );
    const racine = document.documentElement;
    const larges = [...document.querySelectorAll("body *")]
      .filter((e) => e.getBoundingClientRect().right > racine.clientWidth + 1)
      .map(
        (e) =>
          `${e.tagName}.${e.className} ${Math.round(e.getBoundingClientRect().right)} ${e.textContent?.slice(0, 40)}`,
      );
    expect(larges.slice(0, 8)).toEqual([]);
    expect(racine.scrollWidth).toBeLessThanOrEqual(racine.clientWidth);
    await visiter(`${D}/realisations/2026-11-08-liqueur-hibiscus`);
    expect(racine.scrollWidth).toBeLessThanOrEqual(racine.clientWidth);
  });
});
