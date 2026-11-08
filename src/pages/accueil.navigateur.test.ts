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
const REALISATION = `${D}/realisations/2026-11-08-liqueur-hibiscus`;
let page: VueWrapper | undefined;
let routeur: Router;

afterEach(() => {
  page?.unmount();
  document.body.innerHTML = "";
});

async function visiterLAccueil() {
  const ouvrir: OuvrirDepot = async () =>
    DepotDeFiches.ouvrir(lecteurEnMemoire(DEPOT_EXEMPLE));
  routeur = creerRouteur(createMemoryHistory());
  await routeur.push(D);
  page = mount(App, {
    attachTo: document.body,
    global: {
      plugins: [routeur],
      provide: { [CLE_OUVRIR_DEPOT as symbol]: ouvrir },
    },
  });
  await flushPromises();
}

// RG-accueil-realisations-en-cours
describe("les réalisations en cours de l'accueil", () => {
  // WebKit ne tabule vers les liens qu'avec le réglage de Safari : l'ordre du DOM fait l'ordre de tabulation, le focus et Entrée font le geste.
  it("viennent après les élevages dans l'ordre de tabulation, et mènent à la réalisation par Entrée", async () => {
    await visiterLAccueil();
    const liens = [...document.querySelectorAll<HTMLAnchorElement>("main a")];
    const elevage = liens.findIndex((a) =>
      a.getAttribute("href")?.includes("/elevages/"),
    );
    const lien = liens.find((a) => a.getAttribute("href") === REALISATION);
    if (!lien) throw new Error("aucun lien vers la réalisation");
    expect(liens.indexOf(lien)).toBeGreaterThan(elevage);
    lien.focus();
    expect(document.activeElement).toBe(lien);
    await userEvent.keyboard("{Enter}");
    await flushPromises();
    await new Promise((r) => setTimeout(r, 0));
    await flushPromises();
    expect(routeur.currentRoute.value.fullPath).toBe(REALISATION);
  });

  // WCAG 2.2, 1.4.10 : sur un écran de 320 px, l'entrée se lit sans défiler de côté.
  it("tiennent dans un écran de 320 px de large", async () => {
    await navigateur.viewport(320, 640);
    await visiterLAccueil();
    const carte = document.querySelector<HTMLElement>(
      "[data-test=realisation-en-cours]",
    );
    if (!carte) throw new Error("aucune réalisation en cours");
    expect(carte.getBoundingClientRect().right).toBeLessThanOrEqual(320);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
  });
});
