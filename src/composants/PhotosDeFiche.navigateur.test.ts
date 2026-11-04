import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { shallowRef } from "vue";
import { lecteurEnMemoire } from "../depot/lecteur-en-memoire";
import { FichierIntrouvable } from "../depot/lecteur";
import { DepotDeFiches } from "../fiches/depot-de-fiches";
import { DEPOT_EXEMPLE } from "../fiches/depot-exemple";
import { CLE_DEPOT } from "../pages/contexte";
import PhotosDeFiche from "./PhotosDeFiche.vue";

// De vraies images, que WebKit décode : un paysage deux fois plus large que haut, et un portrait.
async function image(largeur: number, hauteur: number): Promise<Blob> {
  const toile = new OffscreenCanvas(largeur, hauteur);
  const contexte = toile.getContext("2d");
  if (!contexte) throw new Error("pas de contexte 2d");
  contexte.fillStyle = "#2e8b57";
  contexte.fillRect(0, 0, largeur, hauteur);
  return toile.convertToBlob({ type: "image/png" });
}

let galerie: VueWrapper | undefined;
afterEach(() => {
  galerie?.unmount();
  galerie = undefined;
  document.body.innerHTML = "";
});

async function monter() {
  const photos: Record<string, Blob> = {
    "medias/paysage.png": await image(400, 200),
    "medias/portrait.png": await image(200, 400),
  };
  const lecteur = lecteurEnMemoire(DEPOT_EXEMPLE);
  lecteur.lirePhoto = async (chemin) => {
    const photo = photos[chemin];
    if (!photo) throw new FichierIntrouvable(chemin);
    return photo;
  };
  const depot = shallowRef(await DepotDeFiches.ouvrir(lecteur));
  galerie = mount(PhotosDeFiche, {
    props: {
      photos: [
        "medias/paysage.png",
        "medias/absente.png",
        "medias/portrait.png",
      ],
      legende: "Basilic",
    },
    global: { provide: { [CLE_DEPOT as symbol]: depot } },
    attachTo: document.body,
  });
  await flushPromises();
  await expect
    .poll(() => document.querySelectorAll(".photo button").length)
    .toBe(2);
  return [...document.querySelectorAll<HTMLButtonElement>(".photo button")];
}

const dialogue = () => document.querySelector<HTMLElement>("[role=dialog]");
// PhotoSwipe prend le focus, et écoute le clavier, une fois son ouverture faite.
const ouverte = () =>
  expect.poll(() => dialogue()?.contains(document.activeElement)).toBe(true);
const imageAffichee = () =>
  dialogue()?.querySelector<HTMLImageElement>(
    "[aria-hidden=false] img.pswp__img",
  );

describe("l'agrandissement d'une photo", () => {
  // RG-galerie-des-photos : l'agrandissement est une boîte de dialogue modale qui retient le focus, ouverte sur l'adresse blob déjà lue.
  it("s'ouvre au clavier, en boîte de dialogue modale, sur la photo de la vignette", async () => {
    const [, portrait] = await monter();
    portrait?.focus();
    await userEvent.keyboard("{Enter}");

    await ouverte();
    expect(dialogue()?.getAttribute("aria-modal")).toBe("true");
    expect(dialogue()?.getAttribute("aria-label")).toBe("Basilic");
    await expect
      .poll(() => imageAffichee()?.getAttribute("src"))
      .toBe(portrait?.querySelector("img")?.getAttribute("src"));
    expect(imageAffichee()?.getAttribute("src")).toMatch(/^blob:/);
  });

  // Les dimensions viennent de l'image décodée : sans elles, PhotoSwipe déformerait la photo.
  it("garde ses proportions à la photo agrandie", async () => {
    const [paysage] = await monter();
    paysage?.click();
    await expect
      .poll(() => imageAffichee()?.getBoundingClientRect().width ?? 0)
      .toBeGreaterThan(0);
    const cadre = imageAffichee()?.getBoundingClientRect();
    expect((cadre?.width ?? 0) / (cadre?.height ?? 1)).toBeCloseTo(2, 1);
  });

  it("passe d'une photo à l'autre aux flèches, sans s'arrêter sur la photo indisponible", async () => {
    const [paysage, portrait] = await monter();
    portrait?.focus();
    await userEvent.keyboard("{Enter}");
    await expect
      .poll(() => imageAffichee()?.getAttribute("src"))
      .toBe(portrait?.querySelector("img")?.getAttribute("src"));
    await userEvent.keyboard("{ArrowLeft}");
    await expect
      .poll(() => imageAffichee()?.getAttribute("src"))
      .toBe(paysage?.querySelector("img")?.getAttribute("src"));
  });

  it("retient le focus dans la boîte de dialogue à la tabulation", async () => {
    const [paysage] = await monter();
    paysage?.focus();
    await userEvent.keyboard("{Enter}");
    await ouverte();
    for (const arriere of [
      false,
      false,
      false,
      false,
      true,
      true,
      true,
      true,
    ]) {
      await userEvent.tab({ shift: arriere });
      expect(dialogue()?.contains(document.activeElement)).toBe(true);
      expect(document.activeElement?.tagName).toBe("BUTTON");
    }
  });

  it("se ferme par Échap et rend le focus à la vignette d'où l'on venait", async () => {
    const [, portrait] = await monter();
    portrait?.focus();
    await userEvent.keyboard("{Enter}");
    await ouverte();
    await userEvent.keyboard("{Escape}");
    await expect.poll(() => dialogue()).toBeNull();
    expect(document.activeElement).toBe(portrait);
  });

  it("se ferme par son bouton, nommé en français, et rend le focus à la vignette", async () => {
    const [paysage] = await monter();
    paysage?.click();
    await ouverte();
    const fermer = dialogue()?.querySelector<HTMLButtonElement>(
      "button[aria-label=Fermer]",
    );
    expect(fermer).toBeTruthy();
    fermer?.click();
    await expect.poll(() => dialogue()).toBeNull();
    expect(document.activeElement).toBe(paysage);
  });
});
