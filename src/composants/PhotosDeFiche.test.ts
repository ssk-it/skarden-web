import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { shallowRef } from "vue";
import { lecteurEnMemoire } from "../depot/lecteur-en-memoire";
import { DepotDeFiches } from "../fiches/depot-de-fiches";
import { DEPOT_EXEMPLE } from "../fiches/depot-exemple";
import { CLE_DEPOT } from "../pages/contexte";
import PhotosDeFiche from "./PhotosDeFiche.vue";

const CONTENUS = {
  ...DEPOT_EXEMPLE,
  "medias/basilic-2.jpg": "JPG",
};

// jsdom ne sait pas tenir un blob derrière une adresse : on compte celles que le site crée et celles qu'il libère.
let creees: string[];
let liberees: string[];
beforeEach(() => {
  creees = [];
  liberees = [];
  URL.createObjectURL = vi.fn(() => {
    const adresse = `blob:photo-${creees.length + 1}`;
    creees.push(adresse);
    return adresse;
  });
  URL.revokeObjectURL = vi.fn((adresse: string) => {
    liberees.push(adresse);
  });
});
afterEach(() => vi.restoreAllMocks());

async function monter(photos: string[]) {
  const depot = shallowRef(
    await DepotDeFiches.ouvrir(lecteurEnMemoire(CONTENUS)),
  );
  const galerie = mount(PhotosDeFiche, {
    props: { photos, legende: "Basilic" },
    global: { provide: { [CLE_DEPOT as symbol]: depot } },
  });
  await flushPromises();
  return galerie;
}

describe("la galerie des photos d'une fiche", () => {
  // RG-galerie-des-photos : une vignette par photo, dans l'ordre du champ `photos`, chacune un bouton nommé par la légende et le rang.
  it("montre chaque photo en vignette, dans l'ordre, sous un bouton qui dit la légende et le rang", async () => {
    const galerie = await monter([
      "medias/basilic.jpg",
      "medias/basilic-2.jpg",
    ]);
    const boutons = galerie.findAll("button");
    expect(boutons).toHaveLength(2);
    expect(boutons.map((b) => b.find("img").attributes("alt"))).toEqual([
      "Basilic, photo 1 sur 2",
      "Basilic, photo 2 sur 2",
    ]);
    expect(boutons.map((b) => b.find("img").attributes("src"))).toEqual(creees);
  });

  // RG-photos-lues-sur-github : une photo indisponible garde sa place et son message, et ne s'agrandit pas.
  it("garde sa place à une photo indisponible, avec son message, sans bouton", async () => {
    const galerie = await monter([
      "medias/basilic.jpg",
      "medias/absente.jpg",
      "medias/basilic-2.jpg",
    ]);
    const vignettes = galerie.findAll(".photo");
    expect(vignettes).toHaveLength(3);
    expect(vignettes[1]?.text()).toBe(
      "Photo indisponible : medias/absente.jpg",
    );
    expect(vignettes[1]?.find("button").exists()).toBe(false);
    expect(
      galerie.findAll("button img").map((img) => img.attributes("alt")),
    ).toEqual(["Basilic, photo 1 sur 3", "Basilic, photo 3 sur 3"]);
  });

  it("ne montre rien pour une fiche sans photo", async () => {
    const galerie = await monter([]);
    expect(galerie.find(".photos").exists()).toBe(false);
  });

  it("libère les photos lues quand la galerie disparaît", async () => {
    const galerie = await monter([
      "medias/basilic.jpg",
      "medias/basilic-2.jpg",
    ]);
    galerie.unmount();
    expect(liberees.sort()).toEqual([...creees].sort());
  });

  it("libère les photos d'avant quand la fiche en cite d'autres", async () => {
    const galerie = await monter(["medias/basilic.jpg"]);
    const avant = [...creees];
    await galerie.setProps({ photos: ["medias/basilic-2.jpg"] });
    await flushPromises();
    expect(liberees).toEqual(avant);
    expect(
      galerie.findAll("button img").map((i) => i.attributes("alt")),
    ).toEqual(["Basilic, photo 1 sur 1"]);
  });
});
