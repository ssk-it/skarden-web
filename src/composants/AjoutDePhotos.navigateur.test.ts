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

async function photo(nom: string, largeur = 300, hauteur = 200) {
  const canvas = document.createElement("canvas");
  canvas.width = largeur;
  canvas.height = hauteur;
  canvas.getContext("2d")?.fillRect(0, 0, largeur, hauteur);
  const blob = await new Promise<Blob>((r) =>
    canvas.toBlob((b) => r(b as Blob), "image/png"),
  );
  return new File([blob], nom, { type: "image/png" });
}

let page: VueWrapper | undefined;
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  sessionStorage.setItem(
    "skarden.jeton-d-ecriture.sskorupski/skarden",
    "github_pat_ecriture",
  );
});
afterEach(() => {
  page?.unmount();
  document.body.innerHTML = "";
});

async function visiter(scenario: ScenarioDEcriture = {}) {
  const ecrivain = ecrivainEnMemoire(DEPOT_EXEMPLE, scenario);
  const jetons: string[] = [];
  let ouvertures = 0;
  const ouvrir: OuvrirDepot = async () => {
    ouvertures++;
    return DepotDeFiches.ouvrir(lecteurEnMemoire(DEPOT_EXEMPLE));
  };
  const routeur = creerRouteur(createMemoryHistory());
  await routeur.push("/sskorupski/skarden/plantes/basilic");
  page = mount(App, {
    global: {
      plugins: [routeur],
      provide: {
        [CLE_OUVRIR_DEPOT as symbol]: ouvrir,
        [CLE_OUVRIR_ECRIVAIN as symbol]: (_: unknown, jeton: string) => {
          jetons.push(jeton);
          return ecrivain;
        },
      },
    },
    attachTo: document.body,
  });
  await flushPromises();
  await expect
    .poll(() =>
      document.querySelector("[data-test=ajout-de-photos] input[type=file]"),
    )
    .not.toBeNull();
  return { ecrivain, jetons, ouvertures: () => ouvertures };
}

const ajout = () =>
  document.querySelector<HTMLElement>("[data-test=ajout-de-photos]");
const choisir = async (...fichiers: File[]) =>
  userEvent.upload(
    ajout()?.querySelector("input[type=file]") as HTMLInputElement,
    fichiers,
  );
const bouton = (texte: RegExp) =>
  [...(ajout()?.querySelectorAll("button") ?? [])].find((b) =>
    texte.test(b.textContent ?? ""),
  );

const etapes = () => [
  ...(ajout()?.querySelectorAll<HTMLElement>("[data-test=suivi] ol > li") ??
    []),
];
const annonce = () =>
  ajout()?.querySelector("[aria-live=polite]")?.textContent ?? "";

async function envoyerUnePhoto() {
  await choisir(await photo("jardin.png"));
  await expect.poll(() => bouton(/Envoyer 1 photo/)?.disabled).toBe(false);
  bouton(/Envoyer 1 photo/)?.click();
}

describe("l'ajout de photos à une fiche", () => {
  // RG-photo-reduite-avant-l-envoi : le site montre ce qui partira, et son poids, avant l'envoi.
  it("montre chaque photo réduite et son poids avant l'envoi, et refuse celle qu'il ne sait pas lire", async () => {
    await visiter();
    await choisir(
      await photo("jardin.png"),
      new File(["pas une image"], "brute.heic", { type: "image/heic" }),
    );
    await expect.poll(() => ajout()?.querySelectorAll("img").length).toBe(1);
    const apercu = ajout()?.querySelector("img");
    expect(apercu?.getAttribute("src")).toMatch(/^blob:/);
    expect(apercu?.getAttribute("alt")).toBe("Aperçu de jardin.png");
    expect(ajout()?.textContent).toMatch(/jardin\.png — [\d,]+ Ko/);
    expect(ajout()?.textContent).toContain("brute.heic");
    expect(ajout()?.textContent).toContain("ne sait pas lire");
    expect(bouton(/Envoyer 1 photo/)).toBeTruthy();
  });

  it("retire une photo avant l'envoi", async () => {
    await visiter();
    await choisir(await photo("un.png"), await photo("deux.png"));
    await expect.poll(() => ajout()?.querySelectorAll("img").length).toBe(2);
    const retirer = ajout()?.querySelector<HTMLButtonElement>(
      "button[aria-label='Retirer un.png']",
    );
    retirer?.focus();
    await userEvent.keyboard("{Enter}");
    await expect.poll(() => ajout()?.querySelectorAll("img").length).toBe(1);
    expect(ajout()?.textContent).not.toContain("un.png");
    expect(bouton(/Envoyer 1 photo/)).toBeTruthy();
  });

  // RG-photo-postee-depuis-le-site : envoyé, converti, vérifié, fusionné ; puis la fiche se relit d'elle-même.
  it("envoie les photos réduites, dit chaque étape, puis relit la fiche", async () => {
    const { ecrivain, jetons, ouvertures } = await visiter();
    await choisir(await photo("jardin.png", 3000, 1500));
    await expect.poll(() => bouton(/Envoyer 1 photo/)?.disabled).toBe(false);
    const envoyer = bouton(/Envoyer 1 photo/);
    envoyer?.focus();
    await userEvent.keyboard("{Enter}");
    // WCAG 2.4.3 : le bouton disparaît, le focus passe au suivi de l'envoi, annoncé par une zone vivante présente dès avant l'envoi.
    expect(ajout()?.querySelector("[aria-live=polite]")).toBeTruthy();
    const suiviAuFocus = () =>
      document.activeElement === ajout()?.querySelector("[data-test=suivi]");
    await expect.poll(suiviAuFocus).toBe(true);
    await expect.poll(() => ajout()?.textContent).toContain("Fusionnées");
    for (const etape of ["Envoyées", "Converties", "Vérifiées", "Fusionnées"])
      expect(ajout()?.textContent).toContain(etape);
    expect(etapes().every((li) => li.textContent?.includes("Fait"))).toBe(true);
    expect(jetons).toEqual(["github_pat_ecriture"]);
    const [commit] = ecrivain.commits;
    const envoyee = commit?.fichiers[0]?.contenu as Blob;
    expect(envoyee.type).toBe("image/jpeg");
    const bitmap = await createImageBitmap(envoyee);
    expect([bitmap.width, bitmap.height]).toEqual([2560, 1280]);
    await expect.poll(ouvertures).toBe(2);
    await expect
      .poll(() => ajout()?.textContent)
      .toContain("Les photos sont sur la fiche");
    await expect.poll(suiviAuFocus).toBe(true);
  });

  it("dit un échec avec le lien de l'Action, dans une alerte", async () => {
    await visiter({
      conversion: [{ etat: "echouee", adresse: "https://github.test/run/7" }],
    });
    await choisir(await photo("jardin.png"));
    await expect.poll(() => bouton(/Envoyer 1 photo/)?.disabled).toBe(false);
    bouton(/Envoyer 1 photo/)?.click();
    await expect
      .poll(() => ajout()?.querySelector("[role=alert]"))
      .not.toBeNull();
    expect(ajout()?.querySelector("[role=alert] a")?.getAttribute("href")).toBe(
      "https://github.test/run/7",
    );
  });

  // WCAG 1.4.1 : l'état de chaque étape se dit en toutes lettres, pas par la seule couleur ; l'étape en cours porte aria-current.
  it("dit l'état de chaque étape, la durée de l'étape en cours et où en est l'Action, avec son lien", async () => {
    await visiter({
      conversion: [
        {
          etat: "en-attente",
          adresse: "https://github.test/run/7",
          statut: "en-cours",
          etape: "Convertir les photos",
        },
      ],
    });
    await envoyerUnePhoto();
    await expect
      .poll(() => ajout()?.querySelector("[aria-current=step]")?.textContent)
      .toContain("Convertir les photos");
    const [envoi, conversion, verification, fusion] = etapes();
    expect(envoi?.textContent).toMatch(/Envoyées.*Fait.*en \d+ s/s);
    expect(conversion?.getAttribute("aria-current")).toBe("step");
    expect(conversion?.textContent).toMatch(
      /Conversion en pointeurs Git LFS.*En cours.*depuis \d+ s/s,
    );
    expect(conversion?.textContent).toContain("Action en cours");
    expect(verification?.textContent).toContain("À venir");
    expect(fusion?.textContent).toContain("À venir");
    expect(conversion?.querySelector("a")?.getAttribute("href")).toBe(
      "https://github.test/run/7",
    );
    expect(ajout()?.textContent).toContain("Étape 2 sur 4");

    // La durée avance d'elle-même ; la zone vivante, elle, ne l'égrène pas.
    const avant = conversion?.textContent;
    await expect
      .poll(() => conversion?.textContent, { timeout: 3000 })
      .not.toBe(avant);
    expect(annonce()).toContain("Étape 2 sur 4");
    expect(annonce()).toContain("Convertir les photos");
    expect(annonce()).not.toContain("depuis");
  });

  it("compte les contrôles de la demande de fusion, avec son lien", async () => {
    await visiter({
      demande: [
        { etat: "controles-en-cours", controles: { finis: 1, total: 3 } },
      ],
    });
    await envoyerUnePhoto();
    await expect
      .poll(() => ajout()?.querySelector("[aria-current=step]")?.textContent)
      .toContain("1 contrôle sur 3 terminé");
    const verification = etapes()[2];
    expect(verification?.querySelector("a")?.getAttribute("href")).toBe(
      "https://github.test/pull/1",
    );
    expect(annonce()).toContain("1 contrôle sur 3 terminé");
  });
});
