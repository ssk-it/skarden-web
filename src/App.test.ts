import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { createMemoryHistory } from "vue-router";
import App from "./App.vue";
import { DepotIllisible, type DepotDesigne } from "./depot/lecteur";
import { lecteurEnMemoire } from "./depot/lecteur-en-memoire";
import { CLE_OUVRIR_DEPOT, type OuvrirDepot } from "./depot/ouvrir";
import { DepotDeFiches } from "./fiches/depot-de-fiches";
import { DEPOT_EXEMPLE, fiche } from "./fiches/depot-exemple";
import { creerRouteur } from "./routeur";

interface Ouverture {
  depot: DepotDesigne;
  jeton?: string;
}

// Le site monté tel quel, sur un dépôt en mémoire : les pages ne savent pas qu'il ne s'agit pas de GitHub. En mémoire, une adresse s'écrit sans le `#` qu'elle porte dans le navigateur.
async function visiter(
  adresse: string,
  ouvrir?: OuvrirDepot,
  contenus = DEPOT_EXEMPLE,
) {
  const ouvertures: Ouverture[] = [];
  const ouvrirParDefaut: OuvrirDepot = async (depot, jeton) => {
    ouvertures.push({ depot, jeton });
    return DepotDeFiches.ouvrir(lecteurEnMemoire(contenus));
  };
  const routeur = creerRouteur(createMemoryHistory());
  await routeur.push(adresse);
  const page = mount(App, {
    global: {
      plugins: [routeur],
      provide: { [CLE_OUVRIR_DEPOT as symbol]: ouvrir ?? ouvrirParDefaut },
    },
  });
  await flushPromises();
  return { page, routeur, ouvertures };
}

beforeEach(() => localStorage.clear());

describe("le site", () => {
  it("pose la question à laquelle Skarden répond", async () => {
    const { page } = await visiter("/");
    expect(page.find("h1").text()).toBe("Skarden");
    expect(page.text()).toContain(
      "Que faut-il à chacune de mes plantes, et qu'ai-je appris en les cultivant ?",
    );
  });

  // ADR-donnees-dans-un-depot-a-part : le site ne nomme aucun dépôt de données.
  it("ne nomme aucun dépôt de données", async () => {
    const { page } = await visiter("/");
    expect(page.html()).not.toContain("sskorupski");
  });

  it("mène, d'un dépôt saisi, à l'accueil de ce dépôt, dont l'adresse porte le dépôt", async () => {
    const { page, routeur, ouvertures } = await visiter("/");
    await page
      .find("input[name=depot]")
      .setValue("https://github.com/sskorupski/skarden");
    await page.find("form").trigger("submit");
    await flushPromises();
    expect(routeur.currentRoute.value.fullPath).toBe("/sskorupski/skarden");
    expect(ouvertures[0]?.depot).toEqual({
      proprietaire: "sskorupski",
      depot: "skarden",
    });
    expect(page.text()).toContain("Cultures en cours");
  });

  it("refuse une saisie qui ne désigne pas un dépôt", async () => {
    const { page, routeur } = await visiter("/");
    await page.find("input[name=depot]").setValue("skarden");
    await page.find("form").trigger("submit");
    await flushPromises();
    expect(routeur.currentRoute.value.fullPath).toBe("/");
    expect(page.text()).toContain("propriétaire/dépôt");
  });

  it("propose le dernier dépôt lu", async () => {
    await visiter("/sskorupski/skarden");
    const { page } = await visiter("/");
    expect(
      (page.find("input[name=depot]").element as HTMLInputElement).value,
    ).toBe("sskorupski/skarden");
  });
});

// RG-accueil-cultures-en-cours
describe("l'accueil", () => {
  it("montre les cultures en cours, avec leur plante, leur emplacement et la dernière entrée de leur journal", async () => {
    const { page } = await visiter("/sskorupski/skarden");
    const cultures = page
      .findAll("[data-test=culture-en-cours]")
      .map((c) => c.text());
    expect(cultures).toHaveLength(2);
    expect(cultures[0]).toContain("Menthe");
    expect(cultures[1]).toContain("Basilic");
    expect(cultures[1]).toContain("Rebord de la cuisine");
    expect(cultures[1]).toContain("rempotage");
    expect(cultures[1]).toContain("2 mai 2026");
  });

  it("mène d'une culture à sa fiche", async () => {
    const { page } = await visiter("/sskorupski/skarden");
    expect(
      page
        .find("a[href='/sskorupski/skarden/cultures/2026-basilic-cuisine']")
        .exists(),
    ).toBe(true);
  });
});

describe("les fiches", () => {
  it("d'une plante, montre ce qu'elle demande, son texte et toutes ses cultures", async () => {
    const { page } = await visiter("/sskorupski/skarden/plantes/basilic");
    expect(page.find("h2").text()).toBe("Basilic");
    expect(page.text()).toContain("plein soleil");
    expect(page.text()).toContain("Craint le froid.");
    expect(
      page.find("a[href='/sskorupski/skarden/familles/lamiacees']").exists(),
    ).toBe(true);
    expect(
      page
        .find("a[href='/sskorupski/skarden/cultures/2025-basilic-cuisine']")
        .exists(),
    ).toBe(true);
    expect(
      page
        .find("a[href='/sskorupski/skarden/cultures/2026-basilic-cuisine']")
        .exists(),
    ).toBe(true);
  });

  it("d'une culture, mène à sa plante, à son emplacement, et montre son journal", async () => {
    const { page } = await visiter(
      "/sskorupski/skarden/cultures/2026-basilic-cuisine",
    );
    expect(
      page.find("a[href='/sskorupski/skarden/plantes/basilic']").exists(),
    ).toBe(true);
    expect(
      page.find("a[href='/sskorupski/skarden/emplacements/cuisine']").exists(),
    ).toBe(true);
    const entrees = page
      .findAll("[data-test=entree-du-journal]")
      .map((e) => e.text());
    expect(entrees).toHaveLength(2);
    expect(entrees[0]).toContain("Racines sorties du pot.");
  });

  it("d'un emplacement, montre ses cultures ; d'une famille, ses plantes", async () => {
    const emplacement = (
      await visiter("/sskorupski/skarden/emplacements/cuisine")
    ).page;
    expect(emplacement.findAll("[data-test=culture]")).toHaveLength(3);
    const famille = (await visiter("/sskorupski/skarden/familles/lamiacees"))
      .page;
    expect(famille.text()).toContain("Basilic");
    expect(famille.text()).toContain("Menthe");
  });

  it("liste les plantes", async () => {
    const { page } = await visiter("/sskorupski/skarden/plantes");
    expect(page.findAll("[data-test=plante]").map((p) => p.text())).toEqual([
      expect.stringContaining("Basilic"),
      expect.stringContaining("Menthe"),
    ]);
  });

  it("dit qu'une fiche désignée n'existe pas", async () => {
    const { page } = await visiter("/sskorupski/skarden/plantes/tomate");
    expect(page.text()).toContain("Aucune fiche « tomate »");
  });

  it("signale une fiche invalide sans empêcher de lire les autres", async () => {
    const { page } = await visiter("/sskorupski/skarden/plantes", undefined, {
      ...DEPOT_EXEMPLE,
      "plantes/cassee.md": "pas de frontmatter",
    });
    expect(page.findAll("[data-test=plante]")).toHaveLength(2);
    expect(page.text()).toContain("plantes/cassee.md");
  });

  // RG-contenu-des-fiches-assaini
  it("rend le texte d'une fiche sans en exécuter de script", async () => {
    const { page } = await visiter(
      "/sskorupski/skarden/plantes/piege",
      undefined,
      {
        ...DEPOT_EXEMPLE,
        "plantes/piege.md": fiche(
          "id: piege\nnom: Piège\nfamille: lamiacees\ntype: fleur\ncycle: vivace",
          "<script>alert(1)</script> **gras**",
        ),
      },
    );
    expect(page.find("script").exists()).toBe(false);
    expect(page.find("strong").text()).toBe("gras");
  });
});

// RG-depot-illisible-explique
describe("un dépôt illisible", () => {
  const echouer =
    (erreur: DepotIllisible): OuvrirDepot =>
    async () => {
      throw erreur;
    };

  it("introuvable : le dit, et propose un jeton pour un dépôt privé", async () => {
    const { page } = await visiter(
      "/sskorupski/prive",
      echouer(new DepotIllisible("introuvable")),
    );
    expect(page.text()).toContain("introuvable");
    expect(page.find("input[name=jeton]").exists()).toBe(true);
  });

  it("limite atteinte : dit quand elle se lève", async () => {
    const leveeA = new Date(2026, 9, 26, 15, 42);
    const { page } = await visiter(
      "/sskorupski/skarden",
      echouer(new DepotIllisible("limite-atteinte", leveeA)),
    );
    expect(page.text()).toContain("15:42");
  });

  it("sans referentiel.yml, ou d'un format inconnu : le dit", async () => {
    expect(
      (
        await visiter("/a/b", echouer(new DepotIllisible("sans-referentiel")))
      ).page.text(),
    ).toContain("referentiel.yml");
    expect(
      (
        await visiter("/a/b", echouer(new DepotIllisible("format-inconnu")))
      ).page.text(),
    ).toContain("version");
  });

  it("une adresse qui ne désigne pas un dépôt : le dit, sans rien demander à GitHub", async () => {
    const { page, ouvertures } = await visiter("/a b/c");
    expect(ouvertures).toEqual([]);
    expect(page.text()).toContain("ne désigne pas un dépôt");
  });
});

// RG-jeton-d-un-depot-prive
describe("le jeton", () => {
  it("saisi, est mémorisé sur l'appareil et sert à relire le dépôt", async () => {
    let essais = 0;
    const ouvertures: (string | undefined)[] = [];
    const ouvrir: OuvrirDepot = async (_, jeton) => {
      ouvertures.push(jeton);
      if (essais++ === 0) throw new DepotIllisible("introuvable");
      return DepotDeFiches.ouvrir(lecteurEnMemoire(DEPOT_EXEMPLE));
    };
    const { page } = await visiter("/sskorupski/prive", ouvrir);
    await page.find("input[name=jeton]").setValue("ghp_secret");
    await page.find("form[data-test=jeton]").trigger("submit");
    await flushPromises();
    expect(ouvertures).toEqual([undefined, "ghp_secret"]);
    expect(localStorage.getItem("skarden.jeton")).toBe("ghp_secret");
    expect(page.text()).toContain("Cultures en cours");
  });

  it("s'oublie par un bouton", async () => {
    localStorage.setItem("skarden.jeton", "ghp_secret");
    const { page, ouvertures } = await visiter("/sskorupski/skarden");
    expect(ouvertures[0]?.jeton).toBe("ghp_secret");
    await page.find("button[data-test=oublier-jeton]").trigger("click");
    await flushPromises();
    expect(localStorage.getItem("skarden.jeton")).toBeNull();
    expect(ouvertures.at(-1)?.jeton).toBeUndefined();
  });

  it("ne paraît jamais dans l'adresse ni dans la page", async () => {
    localStorage.setItem("skarden.jeton", "ghp_secret");
    const { page, routeur } = await visiter("/sskorupski/skarden");
    expect(routeur.currentRoute.value.fullPath).not.toContain("ghp_secret");
    expect(page.html()).not.toContain("ghp_secret");
  });
});
