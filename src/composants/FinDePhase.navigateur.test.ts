import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { createMemoryHistory } from "vue-router";
import App from "../App.vue";
import { CLE_OUVRIR_ECRIVAIN } from "../depot/ecrire";
import {
  ecrivainEnMemoire,
  type ScenarioDEcriture,
} from "../depot/ecrivain-en-memoire";
import { lecteurEnMemoire } from "../depot/lecteur-en-memoire";
import { CLE_OUVRIR_DEPOT, type OuvrirDepot } from "../depot/ouvrir";
import { DepotDeFiches } from "../fiches/depot-de-fiches";
import { DEPOT_EXEMPLE } from "../fiches/depot-exemple";
import { creerRouteur } from "../routeur";
import "../style.css";

// RG-fin-de-phase-declaree-depuis-le-site : ce que jsdom ne sait pas — une boîte de dialogue modale, le focus, Échap, la saisie d'une date et d'une heure.
const EN_COURS = "/sskorupski/skarden/realisations/2026-11-08-liqueur-hibiscus";
const FICHE = "realisations/2026-11-08-liqueur-hibiscus.md";
const CLE_DU_JETON = "skarden.jeton-d-ecriture.sskorupski/skarden";

let page: VueWrapper | undefined;
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  sessionStorage.setItem(CLE_DU_JETON, "github_pat_ecriture");
});
afterEach(() => {
  page?.unmount();
  document.body.innerHTML = "";
});

async function visiter(scenario: ScenarioDEcriture = {}) {
  const ecrivain = ecrivainEnMemoire(DEPOT_EXEMPLE, scenario);
  const ouvrir: OuvrirDepot = async () =>
    DepotDeFiches.ouvrir(lecteurEnMemoire(DEPOT_EXEMPLE));
  const routeur = creerRouteur(createMemoryHistory());
  await routeur.push(EN_COURS);
  page = mount(App, {
    attachTo: document.body,
    global: {
      plugins: [routeur],
      provide: {
        [CLE_OUVRIR_DEPOT as symbol]: ouvrir,
        [CLE_OUVRIR_ECRIVAIN as symbol]: () => ecrivain,
      },
    },
  });
  await flushPromises();
  await expect.poll(() => declarer()).toBeTruthy();
  return { ecrivain };
}

const declarer = () =>
  [...document.querySelectorAll<HTMLButtonElement>("button")].find((b) =>
    /Déclarer la fin/.test(b.textContent ?? ""),
  );
const boite = () => document.querySelector<HTMLDialogElement>("dialog[open]");
const dans = (texte: RegExp) =>
  [...(boite()?.querySelectorAll<HTMLButtonElement>("button") ?? [])].find(
    (b) => texte.test(b.textContent ?? ""),
  );
const champ = () =>
  boite()?.querySelector<HTMLInputElement>("input[type=datetime-local]");

async function ouvrir() {
  declarer()?.focus();
  await userEvent.keyboard("{Enter}");
  await expect.poll(() => boite()).toBeTruthy();
}

async function saisir(valeur: string) {
  const c = champ() as HTMLInputElement;
  c.value = valeur;
  c.dispatchEvent(new Event("input", { bubbles: true }));
  await flushPromises();
}

describe("la déclaration de la fin d'une phase", () => {
  it("ouvre une boîte de dialogue modale, nommée d'après la phase, proposant l'instant présent", async () => {
    await visiter();
    await ouvrir();
    const nom = document.getElementById(
      boite()?.getAttribute("aria-labelledby") ?? "",
    );
    expect(nom?.textContent).toContain("Macération des fleurs dans l'alcool");
    expect(champ()?.value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(boite()?.contains(document.activeElement)).toBe(true);
  });

  it("refuse une fin antérieure au début, liée à son champ, et garde la confirmation inactive", async () => {
    await visiter();
    await ouvrir();
    await saisir("2026-11-07T23:00");
    const erreur = document.getElementById(
      champ()?.getAttribute("aria-describedby") ?? "",
    );
    expect(champ()?.getAttribute("aria-invalid")).toBe("true");
    expect(erreur?.textContent).toMatch(/avant le début/);
    expect(dans(/Continuer/)?.disabled).toBe(true);
  });

  it("récapitule, puis écrit la fin et l'entrée du journal une fois confirmée", async () => {
    const { ecrivain } = await visiter();
    await ouvrir();
    await saisir("2026-11-10T08:00");
    const remarque = boite()?.querySelector("textarea") as HTMLTextAreaElement;
    remarque.value = "Couleur rubis.";
    remarque.dispatchEvent(new Event("input", { bubbles: true }));
    dans(/Continuer/)?.click();
    await expect.poll(() => boite()?.textContent).toMatch(/2 jours et 8 h/);
    expect(boite()?.textContent).toContain("10 novembre 2026 à 8 h 00");
    dans(/Confirmer/)?.click();
    await expect.poll(() => ecrivain.commits.length).toBe(1);
    const [commit] = ecrivain.commits;
    expect(commit?.fichiers[0]?.chemin).toBe(FICHE);
    expect(commit?.fichiers[0]?.contenu).toContain(
      "debut: 2026-11-08, fin: 2026-11-10T08:00,",
    );
    expect(commit?.fichiers[1]?.contenu).toContain("Couleur rubis.");
    expect(boite()).toBeNull();
  });

  it("se ferme à Échap sans rien écrire, et rend le focus au bouton", async () => {
    const { ecrivain } = await visiter();
    await ouvrir();
    await userEvent.keyboard("{Escape}");
    await expect.poll(() => boite()).toBeNull();
    expect(document.activeElement).toBe(declarer());
    expect(ecrivain.commits).toEqual([]);
  });

  it("demande d'abord un jeton d'écriture quand l'onglet n'en a pas", async () => {
    sessionStorage.clear();
    await visiter();
    await ouvrir();
    expect(boite()?.querySelector("input[type=password]")).toBeTruthy();
    expect(champ()).toBeFalsy();
  });

  it("dit une déclaration déjà en attente, avec sa demande de fusion", async () => {
    const { ecrivain } = await visiter({
      branches: [
        {
          branche:
            "phases/2026-11-08-liqueur-hibiscus-maceration-20261113-2200",
          demande: "https://github.test/pull/7",
        },
      ],
    });
    await ouvrir();
    await saisir("2026-11-10T08:00");
    dans(/Continuer/)?.click();
    await expect.poll(() => dans(/Confirmer/)).toBeTruthy();
    dans(/Confirmer/)?.click();
    await expect
      .poll(() => document.querySelector("[role=alert]")?.textContent)
      .toMatch(/attend déjà/);
    expect(document.querySelector("[role=alert] a")?.getAttribute("href")).toBe(
      "https://github.test/pull/7",
    );
    expect(ecrivain.commits).toEqual([]);
  });
});
