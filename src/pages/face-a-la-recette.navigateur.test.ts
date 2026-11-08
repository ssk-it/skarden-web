import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { page as navigateur, userEvent } from "vitest/browser";
import { createMemoryHistory, type Router } from "vue-router";
import App from "../App.vue";
import { lecteurEnMemoire } from "../depot/lecteur-en-memoire";
import { CLE_OUVRIR_DEPOT, type OuvrirDepot } from "../depot/ouvrir";
import { DepotDeFiches } from "../fiches/depot-de-fiches";
import { DEPOT_EXEMPLE } from "../fiches/depot-exemple";
import { creerRouteur } from "../routeur";
import "../style.css";

// RG-realisation-face-a-sa-recette, décision 2026-008/02 : ce que jsdom ne sait pas — la largeur réelle de la fenêtre, la hauteur des lignes, le clavier.
const D = "/sskorupski/skarden";
const EN_COURS = `${D}/realisations/2026-11-08-liqueur-hibiscus`;
let page: VueWrapper | undefined;
let routeur: Router;
let ouvertures = 0;

beforeEach(() => {
  localStorage.clear();
  ouvertures = 0;
});

afterEach(() => {
  page?.unmount();
  document.body.innerHTML = "";
});

async function attendre() {
  for (let i = 0; i < 3; i++) {
    await flushPromises();
    await new Promise((r) => setTimeout(r, 0));
  }
}

async function visiter(adresse: string) {
  page?.unmount();
  const ouvrir: OuvrirDepot = async () => {
    ouvertures++;
    return DepotDeFiches.ouvrir(lecteurEnMemoire(DEPOT_EXEMPLE));
  };
  routeur = creerRouteur(createMemoryHistory());
  await routeur.push(adresse);
  page = mount(App, {
    attachTo: document.body,
    global: {
      plugins: [routeur],
      provide: { [CLE_OUVRIR_DEPOT as symbol]: ouvrir },
    },
  });
  await attendre();
}

const present = <T>(valeur: T | null | undefined): T => {
  expect(valeur).toBeTruthy();
  return valeur as T;
};
const faceAFace = () => document.querySelector("[data-test=face-a-face]");
const bascule = () =>
  document.querySelector<HTMLButtonElement>("[data-test=bascule]");
const sansDefilementDeCote = () => {
  const racine = document.documentElement;
  expect(racine.scrollWidth).toBeLessThanOrEqual(racine.clientWidth);
};

describe("une réalisation face à sa recette, dans un vrai navigateur", () => {
  it("s'ouvre en deux colonnes sur un grand écran, chaque ligne à la même hauteur des deux côtés", async () => {
    await navigateur.viewport(1280, 800);
    await visiter(EN_COURS);
    expect(faceAFace()).not.toBeNull();
    expect(document.querySelector("[data-test=comparaison]")).toBeNull();
    const lignes = [
      ...document.querySelectorAll(
        "[data-test=ligne-ingredient], [data-test=ligne-phase]",
      ),
    ];
    expect(lignes).toHaveLength(8);
    for (const ligne of lignes) {
      const recette = present(
        ligne.querySelector("[data-cote=recette]"),
      ).getBoundingClientRect();
      const realisation = present(
        ligne.querySelector("[data-cote=realisation]"),
      ).getBoundingClientRect();
      expect(realisation.top).toBe(recette.top);
      expect(realisation.left).toBeGreaterThanOrEqual(recette.right);
      // Deux colonnes lisibles : chacune garde au moins 20 rem.
      expect(recette.width).toBeGreaterThan(320);
    }
    sansDefilementDeCote();
  });

  it("tient en deux colonnes dès 900 px, sans défiler de côté", async () => {
    await navigateur.viewport(900, 700);
    await visiter(EN_COURS);
    expect(faceAFace()).not.toBeNull();
    sansDefilementDeCote();
  });

  it("reste en une colonne sur une fenêtre étroite, sans bascule, et y revient quand on rétrécit la fenêtre", async () => {
    await navigateur.viewport(860, 700);
    await visiter(EN_COURS);
    expect(faceAFace()).toBeNull();
    expect(bascule()).toBeNull();
    expect(
      document.querySelector("[data-test=comparaison] table"),
    ).not.toBeNull();
    sansDefilementDeCote();

    await navigateur.viewport(1280, 800);
    await expect.poll(faceAFace).not.toBeNull();
    await navigateur.viewport(375, 700);
    await expect.poll(faceAFace).toBeNull();
    sansDefilementDeCote();
  });

  // WCAG 2.1.1, 4.1.2 : la bascule s'utilise au clavier, et son état s'annonce.
  it("bascule au clavier vers la réalisation seule, garde le focus, et s'en souvient", async () => {
    await navigateur.viewport(1280, 800);
    await visiter(EN_COURS);
    const bouton = present(bascule());
    bouton.focus();
    expect(document.activeElement).toBe(bouton);
    expect(bouton.getAttribute("aria-pressed")).toBe("false");
    await userEvent.keyboard(" ");
    await attendre();
    expect(bascule()?.getAttribute("aria-pressed")).toBe("true");
    expect(document.activeElement).toBe(bascule());
    expect(faceAFace()).toBeNull();
    expect(
      document.querySelector("[data-test=comparaison] table"),
    ).not.toBeNull();

    await visiter(EN_COURS);
    expect(faceAFace()).toBeNull();
    present(bascule()).focus();
    await userEvent.keyboard("{Enter}");
    await attendre();
    expect(faceAFace()).not.toBeNull();
    expect(bascule()?.getAttribute("aria-pressed")).toBe("false");
  });

  // WCAG 2.1.1, 3.2.2 : on choisit dans la liste, puis on valide ; la colonne de la recette reste en place, et le focus aussi.
  it("change de réalisation au clavier, sans quitter la page ni rouvrir le dépôt", async () => {
    await navigateur.viewport(1280, 800);
    await visiter(EN_COURS);
    const recette = document.querySelector(
      "[data-test=entetes] [data-cote=recette]",
    );
    const selecteur = present(
      document.querySelector<HTMLSelectElement>(
        "[data-test=autres-realisations] select",
      ),
    );
    expect(selecteur.labels?.[0]?.textContent).toBe(
      "Autre réalisation de la recette",
    );
    await userEvent.selectOptions(selecteur, "2026-05-01-liqueur-hibiscus");
    // Le bouton suit la liste ; WebKit sous macOS ne le rejoint par Tab que si l'accès clavier complet est activé, d'où le focus posé.
    const afficher = present(present(selecteur.form).querySelector("button"));
    expect(selecteur.compareDocumentPosition(afficher)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    afficher.focus();
    await userEvent.keyboard("{Enter}");
    await attendre();
    expect(routeur.currentRoute.value.params.id).toBe(
      "2026-05-01-liqueur-hibiscus",
    );
    expect(document.querySelector("h2")?.textContent).toBe(
      "Liqueur d'hibiscus, mai 2026",
    );
    expect(
      document.querySelector("[data-test=entetes] [data-cote=recette]"),
    ).toBe(recette);
    expect(document.activeElement?.textContent).toBe("Afficher");
    expect(
      document.querySelector("[data-test=entetes] [role=status]")?.textContent,
    ).toContain("mai 2026");
    expect(ouvertures).toBe(1);
  });
});
