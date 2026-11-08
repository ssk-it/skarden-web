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

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

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

  // RG-accueil-realisations-en-cours
  it("à l'accueil, montre les réalisations en cours sous les élevages, avec leur recette, leur phase et la dernière entrée", async () => {
    const { page } = await visiter(D);
    const titres = page.findAll("main h2").map((h) => h.text());
    expect(titres).toEqual([
      "Cultures en cours",
      "Élevages en cours",
      "Réalisations en cours",
    ]);
    const realisations = page
      .findAll("[data-test=realisation-en-cours]")
      .map((r) => r.text());
    expect(realisations).toHaveLength(1);
    expect(realisations[0]).toContain("Liqueur d'hibiscus, novembre 2026");
    expect(realisations[0]).toContain("d'après Liqueur d'hibiscus");
    expect(realisations[0]).toContain("8 novembre 2026");
    expect(realisations[0]).toContain(
      "En cours : Macération des fleurs dans l'alcool",
    );
    expect(realisations[0]).toContain("9 novembre 2026 — observation");
    expect(lien(page, "realisations/2026-11-08-liqueur-hibiscus")).toBe(true);
    expect(lien(page, "recettes/liqueur-hibiscus")).toBe(true);
    const plantes = (await visiter(D, undefined, DEPOT_DE_PLANTES)).page;
    expect(plantes.text()).not.toContain("Réalisations en cours");
  });

  it("à l'accueil, dit qu'aucune réalisation n'est en cours", async () => {
    const sansRealisationEnCours = Object.fromEntries(
      Object.entries(DEPOT_EXEMPLE).filter(
        ([chemin]) => chemin !== "realisations/2026-11-08-liqueur-hibiscus.md",
      ),
    );
    const { page } = await visiter(D, undefined, sansRealisationEnCours);
    expect(page.text()).toContain("Aucune réalisation en cours.");
    expect(page.findAll("[data-test=realisation-en-cours]")).toHaveLength(0);
  });
});

// RG-liste-des-emplacements
describe("les emplacements", () => {
  const D = "/sskorupski/skarden";

  it("se trouvent sous l'entrée Emplacements, après les règnes, quel que soit le dépôt", async () => {
    const { page } = await visiter(D);
    const entrees = page.findAll("nav a").map((a) => a.text());
    expect(entrees.indexOf("Emplacements")).toBeGreaterThan(
      entrees.indexOf("Animaux"),
    );
    const plantes = (await visiter(D, undefined, DEPOT_DE_PLANTES)).page;
    expect(plantes.find("nav").text()).toContain("Emplacements");
  });

  it("se listent triés par nom, avec leur lieu, et sous chacun ses installations, sans qu'aucun lot y soit en cours", async () => {
    const { page } = await visiter(`${D}/emplacements`);
    expect(page.find("h2").text()).toBe("Emplacements");
    const emplacements = page.findAll("[data-test=emplacement]");
    expect(emplacements.map((e) => e.find("a").text())).toEqual([
      "Garage",
      "Rebord de la cuisine",
    ]);
    const [garage, cuisine] = emplacements;
    expect(garage?.text()).toContain("à l'intérieur");
    expect(garage?.find(`a[href='${D}/emplacements/garage']`).exists()).toBe(
      true,
    );
    const installation = garage?.find("[data-test=installation]");
    expect(installation?.text()).toContain("Aquarium du garage");
    expect(installation?.text()).toContain("aquarium");
    expect(
      installation
        ?.find(`a[href='${D}/installations/aquarium-garage']`)
        .exists(),
    ).toBe(true);
    expect(cuisine?.find("[data-test=installation]").exists()).toBe(false);
  });

  it("se listent seuls dans un dépôt qui ne déclare pas les installations", async () => {
    const { page } = await visiter(
      `${D}/emplacements`,
      undefined,
      DEPOT_DE_PLANTES,
    );
    expect(page.findAll("[data-test=emplacement]")).toHaveLength(1);
    expect(page.find("[data-test=installation]").exists()).toBe(false);
  });

  it("disent qu'il n'y en a aucun", async () => {
    const sansEmplacement = Object.fromEntries(
      Object.entries(DEPOT_DE_PLANTES).filter(
        ([chemin]) => !chemin.startsWith("emplacements/"),
      ),
    );
    const { page } = await visiter(
      `${D}/emplacements`,
      undefined,
      sansEmplacement,
    );
    expect(page.text()).toContain("Aucun emplacement.");
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

// RG-jeton-d-un-depot-prive, RG-qui-peut-poster-une-photo : poster demande un second jeton, d'écriture, saisi à part sur la page d'une fiche.
describe("le jeton d'écriture", () => {
  const CLE = "skarden.jeton-d-ecriture.sskorupski/skarden";
  const FICHE = "/sskorupski/skarden/plantes/basilic";

  it("sans lui, la fiche explique où le créer, et n'offre pas d'envoyer", async () => {
    const { page } = await visiter(FICHE);
    const ajout = page.find("[data-test=ajout-de-photos]");
    expect(ajout.text()).toContain("Ajouter des photos");
    expect(ajout.text()).toContain("Contents");
    expect(ajout.text()).toContain("Pull requests");
    expect(
      ajout
        .find("a[href^='https://github.com/settings/personal-access-tokens']")
        .exists(),
    ).toBe(true);
    expect(ajout.find("input[type=file]").exists()).toBe(false);
  });

  it("saisi, vaut pour ce dépôt le temps de l'onglet, et ne sert pas à lire", async () => {
    const { page, ouvertures } = await visiter(FICHE);
    await page
      .find("input[name=jeton-d-ecriture]")
      .setValue("github_pat_ecriture");
    await page.find("form[data-test=jeton-d-ecriture]").trigger("submit");
    await flushPromises();
    expect(sessionStorage.getItem(CLE)).toBe("github_pat_ecriture");
    expect(localStorage.getItem("skarden.jeton")).toBeNull();
    expect(ouvertures.map((o) => o.jeton)).toEqual([undefined]);
    expect(
      page.find("[data-test=ajout-de-photos] input[type=file]").exists(),
    ).toBe(true);
    expect(page.html()).not.toContain("github_pat_ecriture");
  });

  it("s'oublie par le même bouton que le jeton de lecture", async () => {
    sessionStorage.setItem(CLE, "github_pat_ecriture");
    const { page } = await visiter(FICHE);
    expect(
      page.find("[data-test=ajout-de-photos] input[type=file]").exists(),
    ).toBe(true);
    await page.find("button[data-test=oublier-jeton]").trigger("click");
    await flushPromises();
    expect(sessionStorage.getItem(CLE)).toBeNull();
    expect(
      page.find("[data-test=ajout-de-photos] input[type=file]").exists(),
    ).toBe(false);
  });

  it("ne vaut pas pour un autre dépôt", async () => {
    sessionStorage.setItem(
      "skarden.jeton-d-ecriture.sskorupski/autre",
      "github_pat_ecriture",
    );
    const { page } = await visiter(FICHE);
    expect(
      page.find("[data-test=ajout-de-photos] input[type=file]").exists(),
    ).toBe(false);
  });
});

// Cadrage 2026-007 : le site présente les transformations.
describe("les transformations", () => {
  const D = "/sskorupski/skarden";
  const EN_COURS = `${D}/realisations/2026-11-08-liqueur-hibiscus`;
  const FINIE = `${D}/realisations/2026-05-01-liqueur-hibiscus`;
  const section = (
    page: { find: (s: string) => { text: () => string } },
    nom: string,
  ) => page.find(`[data-test=${nom}]`).text();

  // Une phase en cours court jusqu'à maintenant : l'horloge est fixée au 10 novembre 2026, midi à Paris.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-10T11:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  // RG-entree-des-recettes
  it("se trouvent sous l'entrée Recettes, qui n'apparaît que si le dépôt déclare la collection", async () => {
    const { page } = await visiter(D);
    const entrees = page.findAll("nav a").map((a) => a.text());
    expect(entrees).toContain("Recettes");
    expect(entrees.indexOf("Recettes")).toBeGreaterThan(
      entrees.indexOf("Emplacements"),
    );
    const plantes = (await visiter(D, undefined, DEPOT_DE_PLANTES)).page;
    expect(plantes.find("nav").text()).not.toContain("Recettes");
  });

  it("se listent par catégorie puis par nom, chaque variante sous sa source", async () => {
    const { page } = await visiter(`${D}/recettes`);
    expect(page.find("h2").text()).toBe("Recettes");
    expect(page.findAll("h3").map((h) => h.text())).toEqual([
      "Liqueur",
      "Sirop",
    ]);
    const hibiscus = page.find("[data-test=recette]");
    expect(hibiscus.find("a").text()).toBe("Liqueur d'hibiscus");
    expect(
      hibiscus
        .find(
          `[data-test=variantes] a[href='${D}/recettes/liqueur-hibiscus-gingembre']`,
        )
        .exists(),
    ).toBe(true);
  });

  // RG-page-d-une-recette
  it("montrent la page d'une recette : ses champs, ses ingrédients, ses phases, ses variantes et ses réalisations", async () => {
    const { page } = await visiter(`${D}/recettes/liqueur-hibiscus`);
    expect(page.find("h2").text()).toBe("Liqueur d'hibiscus");
    const champs = section(page, "champs");
    expect(champs).toContain("liqueur");
    expect(champs).toContain("2");
    expect(champs).toContain("1 l");
    expect(
      page.find(`a[href='${D}/recettes/liqueur-hibiscus-gingembre']`).text(),
    ).toBe("Liqueur d'hibiscus au gingembre");
    const ingredients = section(page, "ingredients");
    expect(ingredients).toContain("40 g");
    expect(ingredients).toContain("hibiscus");
    expect(ingredients).toContain("séché");
    expect(ingredients).toContain("facultatif");
    const phases = page.findAll("[data-test=phase]").map((p) => p.text());
    expect(phases[0]).toContain("Macération des fleurs dans l'alcool");
    expect(phases[0]).toContain("3 à 5 jours");
    expect(phases[0]).toContain("18 à 22 °C");
    expect(phases[0]).toContain("bocal");
    expect(phases[2]).toContain("2 à 4 semaines");
    expect(
      page.findAll("[data-test=realisation]").map((r) => r.text()),
    ).toEqual([
      expect.stringContaining("en cours"),
      expect.stringContaining("terminée"),
    ]);
    expect(page.text()).toContain("Un carnet de famille");
    expect(page.text()).toContain("On filtre, puis on laisse reposer.");
  });

  it("disent de quelle recette dérive une variante", async () => {
    const { page } = await visiter(`${D}/recettes/liqueur-hibiscus-gingembre`);
    expect(section(page, "champs")).toContain("Liqueur d'hibiscus");
    expect(page.find(`a[href='${D}/recettes/liqueur-hibiscus']`).exists()).toBe(
      true,
    );
  });

  // RG-page-d-une-realisation
  it("montrent une réalisation en cours : sa recette, sa durée, la provenance de ses ingrédients et la frise de ses phases", async () => {
    const { page } = await visiter(EN_COURS);
    expect(page.find("h2").text()).toBe("Liqueur d'hibiscus, novembre 2026");
    const champs = section(page, "champs");
    expect(champs).toContain("Liqueur d'hibiscus");
    expect(champs).toContain("version 1");
    expect(champs).toContain("en cours");
    expect(champs).toContain("depuis le 8 novembre 2026");
    expect(champs).toContain("2 jours et 12 h");
    const ingredients = section(page, "ingredients");
    expect(ingredients).toContain("29 g");
    expect(ingredients).toContain("lot YE1156");
    expect(page.find(`a[href='${D}/produits/hibiscus-karcade']`).text()).toBe(
      "Hibiscus karcadé, sachet de 500 g",
    );
    expect(
      page.find(`a[href='${D}/cultures/2026-menthe-cuisine']`).exists(),
    ).toBe(true);
    expect(ingredients).toContain("cueillie le 7 novembre 2026");
    const frise = page.findAll("[data-test=phase]").map((p) => p.text());
    expect(frise[0]).toContain("Macération des fleurs dans l'alcool");
    expect(frise[0]).toContain("en cours");
    expect(frise[0]).toContain("2 jours et 12 h");
    expect(frise[0]).toContain("19 à 20 °C");
    expect(frise[0]).toContain("thermomètre de cuisine");
    expect(
      page
        .find(`[data-test=frise] a[href='${D}/contenants/bocal-parfait-1l']`)
        .text(),
    ).toBe("Bocal Le Parfait 1 l");
    expect(page.text()).toContain("Du sucre roux à la place du sucre");
    expect(section(page, "journal")).toContain("La couleur fonce déjà.");
  });

  // RG-comparaison-a-la-recette
  it("comparent une réalisation à la version courante de sa recette", async () => {
    const { page } = await visiter(EN_COURS);
    const comparaison = section(page, "comparaison");
    expect(comparaison).toContain(
      "La recette est en version 2, et cette réalisation a suivi la version 1",
    );
    const ligne = (ingredient: string) =>
      page
        .findAll("[data-test=comparaison-ingredient]")
        .find((l) => l.find("th").text() === ingredient)
        ?.text();
    expect(ligne("hibiscus")).toContain("−11 g");
    expect(ligne("hibiscus")).toContain("−27,5 %");
    expect(ligne("alcool neutre")).toContain("−200 ml");
    expect(ligne("sucre")).toContain("manquant");
    expect(ligne("sucre roux")).toContain("ajouté");
    const phases = page
      .findAll("[data-test=comparaison-phase]")
      .map((l) => l.text());
    expect(phases[0]).toContain("en cours");
    expect(phases[1]).toContain("à venir");
  });

  // RG-degustation-d-une-realisation
  it("montrent les dégustations d'une réalisation : délai, notes de chacun, moyennes et évolution", async () => {
    const { page } = await visiter(FINIE);
    const degustations = page.findAll("[data-test=degustation]");
    expect(degustations).toHaveLength(2);
    const premiere = degustations[0];
    expect(premiere?.text()).toContain("30 jours après la fin, environ 1 mois");
    const couleur = premiere
      ?.findAll("tbody tr")
      .find((l) => l.find("th").text() === "couleur");
    expect(couleur?.findAll("td").map((c) => c.text())).toEqual([
      "9",
      "8",
      "8,5",
    ]);
    expect(premiere?.text()).toContain("Belle robe.");
    const bouche = premiere
      ?.findAll("tbody tr")
      .find((l) => l.find("th").text() === "bouche");
    expect(bouche?.findAll("td").map((c) => c.text())).toEqual([
      "non noté",
      "6,5",
      "6,5",
    ]);
    const evolution = page
      .findAll("[data-test=evolution] tbody tr")
      .find((l) => l.find("th").text() === "couleur");
    expect(evolution?.findAll("td").map((c) => c.text())).toEqual(["8,5", "9"]);
    expect(section(page, "champs")).toContain("31 jours");
    expect(section(page, "resultat")).toContain("1,2 l");
    expect(section(page, "resultat")).toContain("25 % vol");
  });

  // RG-realisations-d-une-fiche
  it("se retrouvent depuis un produit, un contenant, une culture et une plante", async () => {
    const produit = (await visiter(`${D}/produits/hibiscus-karcade`)).page;
    expect(produit.find("h2").text()).toBe("Hibiscus karcadé, sachet de 500 g");
    expect(section(produit, "champs")).toContain("Espig");
    expect(section(produit, "champs")).toContain("500 g");
    expect(produit.findAll("[data-test=realisation]")).toHaveLength(1);

    const contenant = (await visiter(`${D}/contenants/bocal-parfait-1l`)).page;
    expect(section(contenant, "champs")).toContain("verre");
    expect(section(contenant, "champs")).toContain("1 l");
    expect(contenant.findAll("[data-test=realisation]")).toHaveLength(2);

    const culture = (await visiter(`${D}/cultures/2026-menthe-cuisine`)).page;
    expect(
      culture.findAll("[data-test=realisation]").map((r) => r.text()),
    ).toEqual([expect.stringContaining("Liqueur d'hibiscus, novembre 2026")]);

    const plante = (await visiter(`${D}/plantes/menthe`)).page;
    expect(plante.findAll("[data-test=realisation]")).toHaveLength(1);
    const basilic = (await visiter(`${D}/plantes/basilic`)).page;
    expect(basilic.text()).toContain("Aucune réalisation.");
  });

  it("n'apparaissent pas sur les fiches d'un dépôt qui ne les déclare pas", async () => {
    const { page } = await visiter(
      `${D}/cultures/2026-menthe-cuisine`,
      undefined,
      DEPOT_DE_PLANTES,
    );
    expect(page.text()).not.toContain("Réalisations");
  });
});
