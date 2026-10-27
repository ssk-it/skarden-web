import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryHistory } from "vue-router";
import App from "./App.vue";
import { DepotIllisible, type DepotDesigne } from "./depot/lecteur";
import { lecteurEnMemoire } from "./depot/lecteur-en-memoire";
import { CLE_OUVRIR_DEPOT, type OuvrirDepot } from "./depot/ouvrir";
import { DepotDeFiches } from "./fiches/depot-de-fiches";
import { DEPOT_DE_PLANTES, DEPOT_EXEMPLE, fiche } from "./fiches/depot-exemple";
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

// Cadrage 2026-004 : le site présente l'animal.
describe("l'animal", () => {
  const D = "/sskorupski/skarden";
  const lien = (
    page: { find: (s: string) => { exists: () => boolean } },
    cible: string,
  ) => page.find(`a[href='${D}/${cible}']`).exists();

  // RG-phase-du-moment : le mois vient de l'horloge du navigateur ; on la fixe au 15 novembre 2026.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 15, 12));
  });
  afterEach(() => vi.useRealTimers());

  // RG-navigation-par-regne
  it("se trouve sous l'entrée Animaux, qui n'apparaît que si le dépôt déclare la collection", async () => {
    const { page } = await visiter(D);
    expect(page.find("nav").text()).toContain("Animaux");
    const plantes = (await visiter(D, undefined, DEPOT_DE_PLANTES)).page;
    expect(plantes.find("nav").text()).toContain("Plantes");
    expect(plantes.find("nav").text()).not.toContain("Animaux");
  });

  it("liste les animaux, triés par nom", async () => {
    const { page } = await visiter(`${D}/animaux`);
    expect(page.find("h2").text()).toBe("Animaux");
    expect(page.findAll("[data-test=animal]").map((a) => a.text())).toEqual([
      expect.stringContaining("Petit-gris"),
    ]);
    expect(lien(page, "animaux/petit-gris")).toBe(true);
  });

  // RG-page-d-un-animal
  it("montre sa protection en évidence, avant ses conditions, et les valeurs fermées en mots lisibles", async () => {
    const { page } = await visiter(`${D}/animaux/petit-gris`);
    expect(page.find("h2").text()).toBe("Petit-gris");
    expect(page.text()).toContain("Helix aspersa aspersa");
    const protection = page.find("[data-test=protection]");
    expect(protection.classes()).toContain("alerte");
    expect(protection.text()).toContain("encadrée");
    expect(lien(page, "familles/helicides")).toBe(true);
    const texte = page.text();
    const ordre = [
      "encadrée",
      "Plages de conditions",
      "Calendrier des modes",
      "Densité",
      "Compléments",
      "Reproduction",
      "Routine",
      "Procédures",
      "Élevages",
      "Le ramassage est encadré",
    ].map((t) => texte.indexOf(t));
    expect(ordre.every((i) => i >= 0)).toBe(true);
    expect([...ordre].sort((a, b) => a - b)).toEqual(ordre);
    expect(texte).toContain("100 à 150 par m² au sol");
    expect(texte).toContain("farine d'élevage");
    expect(texte).toContain("œufs");
    expect(texte).toContain("tous les deux mois");
    expect(texte).not.toContain("a-eviter");
    expect(texte).not.toContain("bimestrielle");
  });

  it("ne met pas en évidence une protection qui est aucune", async () => {
    const { page } = await visiter(`${D}/animaux/daphnie`, undefined, {
      ...DEPOT_EXEMPLE,
      "animaux/daphnie.md": fiche(
        "id: daphnie\nnom: Daphnie\nmilieu: eau-douce\nprotection: aucune",
      ),
    });
    expect(page.find("[data-test=protection]").classes()).not.toContain(
      "alerte",
    );
  });

  it("donne ses plages dans un tableau, par paramètre, la zone à éviter lue comme une plage", async () => {
    const { page } = await visiter(`${D}/animaux/petit-gris`);
    const tableau = page.find("table[data-test=plages]");
    expect(tableau.find("caption").text()).toBe("Plages de conditions");
    expect(tableau.findAll("th[scope=col]").length).toBeGreaterThan(0);
    const lignes = tableau.findAll("tbody tr").map((l) => l.text());
    expect(lignes).toHaveLength(5);
    expect(lignes[0]).toContain("température (°C)");
    expect(lignes[0]).toContain("jusqu'à 0");
    expect(lignes[0]).toContain("mortel");
    expect(lignes[2]).toContain("de 10 à 12");
    expect(lignes[2]).toContain("à éviter");
    expect(lignes[4]).toContain("humidité (%)");
  });

  it("donne le calendrier de ses modes dans un tableau de douze mois", async () => {
    const { page } = await visiter(`${D}/animaux/petit-gris`);
    const tableau = page.find("table[data-test=calendrier]");
    expect(tableau.find("caption").text()).toContain("Calendrier des modes");
    expect(tableau.findAll("thead th[scope=col]").map((t) => t.text())).toEqual(
      ["Mois", "hibernation", "activite continue"],
    );
    const lignes = tableau.findAll("tbody tr");
    expect(lignes).toHaveLength(12);
    expect(lignes[3]?.find("th[scope=row]").text()).toBe("avril");
    expect(lignes[3]?.text()).toContain("réveil, activité, reproduction");
    expect(lignes[10]?.text()).toContain("dormance");
  });

  // L'alimentation se lit dans le corps de la fiche (cadrage 2026-003, décision 06) : aucun lien vers un aliment.
  it("mène à ses procédures et à ses élevages, en cours d'abord, sans lien vers ses aliments", async () => {
    const { page } = await visiter(`${D}/animaux/petit-gris`);
    expect(lien(page, "plantes/basilic")).toBe(false);
    expect(page.text()).not.toContain("Aliments");
    expect(lien(page, "procedures/preparation-substrat-terre")).toBe(true);
    expect(page.text()).toContain(
      "Préparation d'un substrat de terre du jardin",
    );
    expect(
      page.findAll("[data-test=elevage]").map((e) => e.find("a").text()),
    ).toEqual(["2026-petit-gris-garage", "2025-petit-gris-garage"]);
  });

  // RG-page-d-une-procedure
  it("d'une procédure, montre ses étapes numérotées et les espèces qui la citent", async () => {
    const { page } = await visiter(
      `${D}/procedures/preparation-substrat-terre`,
    );
    expect(page.find("h2").text()).toBe(
      "Préparation d'un substrat de terre du jardin",
    );
    expect(page.findAll(".texte ol li")).toHaveLength(3);
    expect(lien(page, "animaux/petit-gris")).toBe(true);
  });

  // RG-page-d-une-installation
  it("d'une installation, montre ses dimensions, sa surface, son volume, la capacité pour chaque animal et ses élevages", async () => {
    const { page } = await visiter(`${D}/installations/aquarium-garage`);
    expect(page.find("h2").text()).toBe("Aquarium du garage");
    expect(lien(page, "emplacements/garage")).toBe(true);
    const texte = page.text();
    expect(texte).toContain("aquarium");
    expect(texte).toContain("96 × 56 × 40 cm");
    expect(texte).toContain("0,54 m²");
    expect(texte).toContain("215 L");
    expect(page.find("[data-test=capacite]").text()).toContain(
      "53 à 80 individus",
    );
    expect(lien(page, "elevages/2026-petit-gris-garage")).toBe(true);
    expect(texte).toContain("Couvercle de verre");
  });

  it("d'une installation sans dimensions, dit pourquoi la capacité ne se calcule pas", async () => {
    const { page } = await visiter(
      `${D}/installations/aquarium-garage`,
      undefined,
      {
        ...DEPOT_EXEMPLE,
        "installations/aquarium-garage.md": fiche(
          "id: aquarium-garage\nnom: Aquarium du garage\ntype: aquarium\nemplacement: garage",
        ),
      },
    );
    expect(page.find("[data-test=capacite]").text()).toContain(
      "pas de dimensions au sol",
    );
  });

  it("d'un emplacement, montre ses installations, et rien de tel dans un dépôt de plantes", async () => {
    const { page } = await visiter(`${D}/emplacements/garage`);
    expect(lien(page, "installations/aquarium-garage")).toBe(true);
    const plantes = (
      await visiter(`${D}/emplacements/cuisine`, undefined, DEPOT_DE_PLANTES)
    ).page;
    expect(plantes.text()).not.toContain("Installations");
  });

  // RG-famille-montre-ses-especes
  it("d'une famille animale, montre ses animaux", async () => {
    const { page } = await visiter(`${D}/familles/helicides`);
    expect(lien(page, "animaux/petit-gris")).toBe(true);
    expect(page.text()).not.toContain("Aucune plante");
  });

  // RG-page-d-un-elevage, RG-phase-du-moment
  it("d'un élevage, montre la phase du moment et ses soins, l'effectif à côté de la capacité, puis son journal", async () => {
    const { page } = await visiter(`${D}/elevages/2026-petit-gris-garage`);
    expect(page.find("h2").text()).toBe("Petit-gris — Aquarium du garage");
    expect(lien(page, "animaux/petit-gris")).toBe(true);
    expect(lien(page, "installations/aquarium-garage")).toBe(true);
    expect(lien(page, "elevages/2025-petit-gris-garage")).toBe(true);
    const moment = page.find("[data-test=phase-du-moment]").text();
    expect(moment).toContain("novembre");
    expect(moment).toContain("dormance");
    expect(moment).toContain("contrôle");
    expect(moment).not.toContain("brumisation");
    const effectif = page.find("[data-test=effectif]").text();
    expect(effectif).toContain("60");
    expect(effectif).toContain("53 à 80");
    expect(effectif).toContain("87");
    expect(effectif).toContain("1 octobre 2026");
    const entrees = page
      .findAll("[data-test=entree-du-journal]")
      .map((e) => e.text());
    expect(entrees).toHaveLength(2);
    expect(entrees[0]).toContain("mise en dormance");
    expect(entrees[1]).toContain("87");
    expect(page.text()).toContain("Une centaine de reproducteurs.");
  });

  it("d'un élevage terminé, dit qu'il n'a pas de phase du moment", async () => {
    const { page } = await visiter(`${D}/elevages/2025-petit-gris-garage`);
    expect(page.find("[data-test=phase-du-moment]").text()).toContain(
      "terminé",
    );
  });

  // RG-accueil-elevages-en-cours
  it("à l'accueil, montre les élevages en cours sous les cultures, avec leur phase", async () => {
    const { page } = await visiter(D);
    const texte = page.text();
    expect(texte.indexOf("Élevages en cours")).toBeGreaterThan(
      texte.indexOf("Cultures en cours"),
    );
    const elevages = page
      .findAll("[data-test=elevage-en-cours]")
      .map((e) => e.text());
    expect(elevages).toHaveLength(1);
    expect(elevages[0]).toContain("Petit-gris");
    expect(elevages[0]).toContain("Aquarium du garage");
    expect(elevages[0]).toContain("dormance");
    expect(elevages[0]).toContain("mise en dormance");
    expect(lien(page, "elevages/2026-petit-gris-garage")).toBe(true);
    const plantes = (await visiter(D, undefined, DEPOT_DE_PLANTES)).page;
    expect(plantes.text()).not.toContain("Élevages en cours");
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
