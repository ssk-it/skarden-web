import { describe, expect, it } from "vitest";
import { DepotIllisible } from "../depot/lecteur";
import { lecteurEnMemoire } from "../depot/lecteur-en-memoire";
import {
  capacite,
  DepotDeFiches,
  dernierEffectif,
  FicheIntrouvable,
  phaseDuMoment,
  type Animal,
  type Elevage,
  type Installation,
} from "./depot-de-fiches";
import { DEPOT_DE_PLANTES, DEPOT_EXEMPLE, fiche } from "./depot-exemple";
import { FicheInvalide } from "./format";

const ouvrir = (contenus = DEPOT_EXEMPLE) => {
  const lecteur = lecteurEnMemoire(contenus);
  return DepotDeFiches.ouvrir(lecteur).then((depot) => ({ depot, lecteur }));
};

describe("DepotDeFiches", () => {
  it("refuse un dépôt sans referentiel.yml", async () => {
    const sansReferentiel = Object.fromEntries(
      Object.entries(DEPOT_EXEMPLE).filter(
        ([chemin]) => chemin !== "referentiel.yml",
      ),
    );
    const erreur = await ouvrir(sansReferentiel).catch((e: unknown) => e);
    expect(erreur).toBeInstanceOf(DepotIllisible);
    expect((erreur as DepotIllisible).raison).toBe("sans-referentiel");
  });

  it("lit une plante, en camelCase, avec son corps", async () => {
    const { depot } = await ouvrir();
    const plante = await depot.lirePlante("basilic");
    expect(plante).toMatchObject({
      id: "basilic",
      nom: "Basilic",
      famille: "lamiacees",
      exposition: "plein-soleil",
      photos: ["medias/basilic.jpg"],
    });
    expect(plante.corps).toBe("Craint le froid.");
  });

  it("dit qu'une fiche désignée n'existe pas", async () => {
    const { depot } = await ouvrir();
    await expect(depot.lirePlante("tomate")).rejects.toBeInstanceOf(
      FicheIntrouvable,
    );
  });

  it("dit qu'une fiche est invalide quand un champ attendu manque", async () => {
    const { depot } = await ouvrir({
      ...DEPOT_EXEMPLE,
      "plantes/sans-nom.md": fiche("id: sans-nom"),
    });
    await expect(depot.lirePlante("sans-nom")).rejects.toBeInstanceOf(
      FicheInvalide,
    );
  });

  it("liste les plantes par nom, et met à part les fiches invalides sans empêcher de lire les autres", async () => {
    const { depot } = await ouvrir({
      ...DEPOT_EXEMPLE,
      "plantes/cassee.md": "pas de frontmatter",
    });
    const { fiches, invalides } = await depot.listerPlantes();
    expect(fiches.map((p) => p.id)).toEqual(["basilic", "menthe"]);
    expect(invalides).toEqual([
      {
        chemin: "plantes/cassee.md",
        message: expect.stringContaining("frontmatter"),
      },
    ]);
  });

  it("donne les cultures d'une plante, la plus récente d'abord", async () => {
    const { depot } = await ouvrir();
    const { fiches } = await depot.culturesDe("basilic");
    expect(fiches.map((c) => c.id)).toEqual([
      "2026-basilic-cuisine",
      "2025-basilic-cuisine",
    ]);
  });

  it("donne les cultures d'un emplacement et les plantes d'une famille", async () => {
    const { depot } = await ouvrir();
    expect((await depot.culturesA("cuisine")).fiches).toHaveLength(3);
    expect(
      (await depot.plantesDe("lamiacees")).fiches.map((p) => p.id),
    ).toEqual(["basilic", "menthe"]);
  });

  it("donne le journal d'une culture, le plus récent d'abord, sans lire les entrées d'avant son début", async () => {
    const { depot, lecteur } = await ouvrir();
    const culture = await depot.lireCulture("2026-basilic-cuisine");
    const { fiches } = await depot.journalDe(culture);
    expect(fiches.map((e) => e.date)).toEqual(["2026-05-02", "2026-04-12"]);
    expect(fiches[0]).toMatchObject({
      evenement: "rempotage",
      photos: ["medias/rempotage.jpg"],
      corps: "Racines sorties du pot.",
    });
    expect(lecteur.lus).not.toContain(
      "journal/2025/2025-06-01-basilic-recolte.md",
    );
  });

  it("ne lit pas les entrées d'après la fin d'une culture terminée", async () => {
    const { depot, lecteur } = await ouvrir();
    const culture = await depot.lireCulture("2025-basilic-cuisine");
    expect((await depot.journalDe(culture)).fiches.map((e) => e.date)).toEqual([
      "2025-06-01",
    ]);
    expect(lecteur.lus.filter((c) => c.startsWith("journal/2026"))).toEqual([]);
  });

  // RG-accueil-cultures-en-cours
  it("montre à l'accueil les cultures en cours, avec leur plante et la dernière entrée de leur journal", async () => {
    const { depot } = await ouvrir();
    const { cultures } = await depot.accueil();
    expect(
      cultures.map((c) => [c.culture.id, c.plante?.nom, c.derniere?.date]),
    ).toEqual([
      ["2026-menthe-cuisine", "Menthe", "2026-06-01"],
      ["2026-basilic-cuisine", "Basilic", "2026-05-02"],
    ]);
  });

  it("ne lit, pour l'accueil, que les entrées postérieures au plus ancien début des cultures en cours", async () => {
    const { depot, lecteur } = await ouvrir();
    await depot.accueil();
    expect(lecteur.lus).not.toContain(
      "journal/2025/2025-06-01-basilic-recolte.md",
    );
  });

  // RG-entree-du-journal : une entrée désigne une culture ou un élevage.
  it("ne rattache pas aux cultures, sans la dire invalide, une entrée du journal qui désigne un élevage", async () => {
    const { depot } = await ouvrir();
    const { cultures, invalides } = await depot.accueil(11);
    expect(invalides).toEqual([]);
    expect(cultures.map((c) => c.derniere?.date)).toEqual([
      "2026-06-01",
      "2026-05-02",
    ]);
  });

  it("dit invalide une entrée du journal qui ne désigne ni culture ni élevage", async () => {
    const { depot } = await ouvrir({
      ...DEPOT_EXEMPLE,
      "journal/2026/2026-11-04-orpheline.md": fiche(
        "date: 2026-11-04\nevenement: observation",
      ),
    });
    const { invalides } = await depot.accueil();
    expect(invalides.map((i) => i.chemin)).toEqual([
      "journal/2026/2026-11-04-orpheline.md",
    ]);
  });

  it("dit invalide une entrée du journal qui désigne à la fois une culture et un élevage", async () => {
    const { depot } = await ouvrir({
      ...DEPOT_EXEMPLE,
      "journal/2026/2026-11-05-double.md": fiche(
        "date: 2026-11-05\nculture: 2026-basilic-cuisine\nelevage: 2026-petit-gris-garage\nevenement: observation",
      ),
    });
    const { invalides } = await depot.accueil(11);
    expect(invalides.map((i) => i.chemin)).toEqual([
      "journal/2026/2026-11-05-double.md",
    ]);
  });

  it("lit une photo citée par une fiche", async () => {
    const { depot } = await ouvrir();
    expect(await (await depot.lirePhoto("medias/basilic.jpg")).text()).toBe(
      "JPG",
    );
  });
});

describe("DepotDeFiches, côté animal", () => {
  it("lit un animal, ses plages, ses modes, sa densité, sa routine et ses procédures", async () => {
    const { depot } = await ouvrir();
    const animal = await depot.lireAnimal("petit-gris");
    expect(animal).toMatchObject({
      id: "petit-gris",
      nom: "Petit-gris",
      nomLatin: "Helix aspersa aspersa",
      famille: "helicides",
      milieu: "terrestre",
      protection: "encadree",
      densite: { min: 100, max: 150, unite: "par-m2-sol" },
      aliments: { plantes: ["basilic"], animaux: [] },
      complements: ["calcium", "farine-d-elevage"],
      reproduction: { mode: "oeufs", fecondite: { min: 80, max: 100 } },
      stades: ["oeuf", "juvenile", "adulte"],
      procedures: ["preparation-substrat-terre"],
      corps: "Le ramassage est encadré par arrêté préfectoral.",
    });
    expect(animal.plages).toContainEqual({
      parametre: "temperature-c",
      max: 0,
      etat: "mortel",
    });
    expect(animal.modes.map((m) => m.id)).toEqual([
      "hibernation",
      "activite-continue",
    ]);
    expect(animal.modes[0]?.phases[0]).toEqual({
      phase: "dormance",
      mois: [11, 12, 1, 2],
    });
    expect(animal.routine[2]).toEqual({
      soin: "controle",
      frequence: "hebdomadaire",
      phases: [],
    });
  });

  it("refuse un animal sans protection", async () => {
    const { depot } = await ouvrir({
      ...DEPOT_EXEMPLE,
      "animaux/daphnie.md": fiche(
        "id: daphnie\nnom: Daphnie\nmilieu: eau-douce",
      ),
    });
    await expect(depot.lireAnimal("daphnie")).rejects.toBeInstanceOf(
      FicheInvalide,
    );
  });

  // RG-page-d-un-animal : les plages regroupées par paramètre, de la plus basse à la plus haute.
  it("range les plages par paramètre, de la plus basse à la plus haute", async () => {
    const { depot } = await ouvrir();
    const { plages } = await depot.lireAnimal("petit-gris");
    expect(plages.map((p) => [p.parametre, p.etat])).toEqual([
      ["temperature-c", "mortel"],
      ["temperature-c", "dormance"],
      ["temperature-c", "a-eviter"],
      ["temperature-c", "actif"],
      ["humidite-pct", "actif"],
    ]);
  });

  // RG-navigation-par-regne
  it("liste les animaux par nom", async () => {
    const { depot } = await ouvrir({
      ...DEPOT_EXEMPLE,
      "animaux/daphnie.md": fiche(
        "id: daphnie\nnom: Daphnie\nmilieu: eau-douce\nprotection: aucune",
      ),
    });
    expect((await depot.listerAnimaux()).fiches.map((a) => a.id)).toEqual([
      "daphnie",
      "petit-gris",
    ]);
  });

  it("lit une installation, un élevage et une procédure", async () => {
    const { depot } = await ouvrir();
    expect(await depot.lireInstallation("aquarium-garage")).toMatchObject({
      nom: "Aquarium du garage",
      type: "aquarium",
      emplacement: "garage",
      dimensionsCm: { longueur: 96, largeur: 56, hauteur: 40 },
    });
    expect(await depot.lireElevage("2026-petit-gris-garage")).toMatchObject({
      animal: "petit-gris",
      installation: "aquarium-garage",
      debut: "2026-09-15",
      statut: "en-cours",
      origine: "souche",
      elevageParent: "2025-petit-gris-garage",
      mode: "hibernation",
      effectifCible: 60,
    });
    expect(
      await depot.lireProcedure("preparation-substrat-terre"),
    ).toMatchObject({
      nom: "Préparation d'un substrat de terre du jardin",
      corps: expect.stringContaining("1. **Prélever**"),
    });
  });

  it("donne les élevages d'un animal et d'une installation, en cours d'abord", async () => {
    const { depot } = await ouvrir();
    const attendus = ["2026-petit-gris-garage", "2025-petit-gris-garage"];
    expect(
      (await depot.elevagesDe("petit-gris")).fiches.map((e) => e.id),
    ).toEqual(attendus);
    expect(
      (await depot.elevagesDans("aquarium-garage")).fiches.map((e) => e.id),
    ).toEqual(attendus);
  });

  it("donne les installations d'un emplacement", async () => {
    const { depot } = await ouvrir();
    expect(
      (await depot.installationsA("garage")).fiches.map((i) => i.id),
    ).toEqual(["aquarium-garage"]);
    expect((await depot.installationsA("cuisine")).fiches).toEqual([]);
  });

  // RG-page-d-une-procedure : les espèces qui la citent se calculent.
  it("donne les espèces qui citent une procédure", async () => {
    const { depot } = await ouvrir();
    expect(
      (await depot.especesQuiCitent("preparation-substrat-terre")).fiches.map(
        (a) => a.id,
      ),
    ).toEqual(["petit-gris"]);
  });

  // RG-famille-montre-ses-especes
  it("donne les espèces d'une famille selon son règne, une famille sans règne étant végétale", async () => {
    const { depot } = await ouvrir();
    const helicides = await depot.especesDe(
      await depot.lireFamille("helicides"),
    );
    expect(helicides.regne).toBe("animal");
    expect(helicides.especes.fiches.map((e) => e.id)).toEqual(["petit-gris"]);
    const lamiacees = await depot.especesDe(
      await depot.lireFamille("lamiacees"),
    );
    expect(lamiacees.regne).toBe("vegetal");
    expect(lamiacees.especes.fiches.map((e) => e.id)).toEqual([
      "basilic",
      "menthe",
    ]);
  });

  it("donne le journal d'un élevage, le plus récent d'abord, sans lire les entrées d'avant son début", async () => {
    const { depot, lecteur } = await ouvrir();
    const elevage = await depot.lireElevage("2026-petit-gris-garage");
    const { fiches } = await depot.journalDElevage(elevage);
    expect(fiches.map((e) => [e.date, e.evenement])).toEqual([
      ["2026-11-03", "mise-en-dormance"],
      ["2026-10-01", "comptage"],
    ]);
    expect(fiches[1]).toMatchObject({
      effectif: 87,
      corps: "Compté à la lampe.",
    });
    expect(lecteur.lus).not.toContain(
      "journal/2026/2026-06-01-menthe-observation.md",
    );
  });

  it("donne le dernier effectif compté dans un journal", async () => {
    const { depot } = await ouvrir();
    const elevage = await depot.lireElevage("2026-petit-gris-garage");
    const journal = await depot.journalDElevage(elevage);
    expect(dernierEffectif(journal.fiches)).toMatchObject({
      date: "2026-10-01",
      effectif: 87,
    });
    expect(dernierEffectif([])).toBeUndefined();
  });

  // RG-accueil-elevages-en-cours
  it("montre à l'accueil les élevages en cours, avec leur animal, leur installation, la phase du moment et la dernière entrée", async () => {
    const { depot } = await ouvrir();
    const { elevages } = await depot.accueil(11);
    expect(
      elevages?.map((e) => [
        e.elevage.id,
        e.animal?.nom,
        e.installation?.nom,
        e.phase.connue ? e.phase.phases : e.phase.raison,
        e.derniere?.evenement,
      ]),
    ).toEqual([
      [
        "2026-petit-gris-garage",
        "Petit-gris",
        "Aquarium du garage",
        ["dormance"],
        "mise-en-dormance",
      ],
    ]);
  });

  it("ne lit, pour l'accueil, que les entrées d'après le plus ancien début des cultures et des élevages en cours", async () => {
    const { depot, lecteur } = await ouvrir();
    await depot.accueil(11);
    expect(lecteur.lus).not.toContain(
      "journal/2025/2025-07-01-petit-gris-ponte.md",
    );
  });

  it("lit le journal pour l'accueil quand seuls des élevages sont en cours", async () => {
    const sansCultureEnCours = Object.fromEntries(
      Object.entries(DEPOT_EXEMPLE).filter(
        ([chemin]) => !chemin.startsWith("cultures/2026"),
      ),
    );
    const { depot } = await ouvrir(sansCultureEnCours);
    const { cultures, elevages } = await depot.accueil(11);
    expect(cultures).toEqual([]);
    expect(elevages?.[0]?.derniere?.date).toBe("2026-11-03");
  });

  // RG-referentiel-yml-decrit-le-depot : un dépôt qui ne tient que des plantes reste lisible.
  describe("dans un dépôt qui ne déclare pas les collections de l'animal", () => {
    it("donne des listes vides, et un accueil sans élevages", async () => {
      const { depot } = await ouvrir(DEPOT_DE_PLANTES);
      expect(depot.declare("animaux")).toBe(false);
      expect(depot.declare("plantes")).toBe(true);
      expect((await depot.listerAnimaux()).fiches).toEqual([]);
      expect((await depot.installationsA("cuisine")).fiches).toEqual([]);
      expect((await depot.especesQuiCitent("x")).fiches).toEqual([]);
      const { cultures, elevages } = await depot.accueil(11);
      expect(cultures).toHaveLength(2);
      expect(elevages).toBeUndefined();
    });

    it("dit introuvable un animal désigné", async () => {
      const { depot } = await ouvrir(DEPOT_DE_PLANTES);
      await expect(depot.lireAnimal("petit-gris")).rejects.toBeInstanceOf(
        FicheIntrouvable,
      );
    });
  });
});

const petitGris = (): Promise<Animal> =>
  ouvrir().then(({ depot }) => depot.lireAnimal("petit-gris"));
const elevageEnCours = (champs: Partial<Elevage> = {}): Elevage => ({
  id: "2026-petit-gris-garage",
  animal: "petit-gris",
  installation: "aquarium-garage",
  debut: "2026-09-15",
  statut: "en-cours",
  origine: "achat",
  mode: "hibernation",
  photos: [],
  corps: "",
  ...champs,
});

// RG-phase-du-moment
describe("phaseDuMoment", () => {
  it("en novembre, en hibernation : la dormance, et les soins sans phase", async () => {
    const phase = phaseDuMoment(elevageEnCours(), await petitGris(), 11);
    expect(phase).toMatchObject({ connue: true, phases: ["dormance"] });
    expect(phase.connue && phase.soins.map((s) => s.soin)).toEqual([
      "controle",
    ]);
  });

  it("en avril, deux phases partagent le mois, et leurs soins s'additionnent", async () => {
    const phase = phaseDuMoment(elevageEnCours(), await petitGris(), 4);
    expect(phase).toMatchObject({
      connue: true,
      phases: ["reveil", "activite", "reproduction"],
    });
    expect(phase.connue && phase.soins.map((s) => s.soin)).toEqual([
      "brumisation",
      "nourrissage",
      "controle",
      "renouvellement-substrat",
    ]);
  });

  it("d'après le mode retenu par l'élevage", async () => {
    const phase = phaseDuMoment(
      elevageEnCours({ mode: "activite-continue" }),
      await petitGris(),
      11,
    );
    expect(phase).toMatchObject({ connue: true, phases: ["activite"] });
  });

  it("n'existe pas pour un élevage terminé ou perdu", async () => {
    const animal = await petitGris();
    for (const statut of ["terminee", "perdue"])
      expect(phaseDuMoment(elevageEnCours({ statut }), animal, 11)).toEqual({
        connue: false,
        raison: "pas-en-cours",
      });
  });

  it("n'existe pas sans mode retenu, ni pour un mode que l'animal ne connaît pas", async () => {
    const animal = await petitGris();
    expect(
      phaseDuMoment(elevageEnCours({ mode: undefined }), animal, 11),
    ).toEqual({ connue: false, raison: "sans-mode" });
    expect(
      phaseDuMoment(elevageEnCours({ mode: "inconnu" }), animal, 11),
    ).toEqual({ connue: false, raison: "mode-inconnu" });
  });
});

// RG-capacite-calculee
describe("capacite", () => {
  const installation = (champs: Partial<Installation> = {}): Installation => ({
    id: "bac",
    nom: "Bac",
    type: "bac",
    emplacement: "garage",
    photos: [],
    corps: "",
    ...champs,
  });
  const animal = async (densite: Animal["densite"]): Promise<Animal> => ({
    ...(await petitGris()),
    densite,
  });

  it("par m² au sol : la densité multipliée par longueur × largeur", async () => {
    expect(
      capacite(
        await animal({ min: 100, max: 150, unite: "par-m2-sol" }),
        installation({
          dimensionsCm: { longueur: 96, largeur: 56, hauteur: 40 },
        }),
      ),
    ).toEqual({ calculable: true, min: 53, max: 80 });
  });

  it("par litre : la densité multipliée par le volume utile, ou à défaut par celui des dimensions", async () => {
    const daphnie = await animal({ min: 50, max: 100, unite: "par-litre" });
    expect(
      capacite(
        daphnie,
        installation({
          volumeL: 10,
          dimensionsCm: { longueur: 30, largeur: 20, hauteur: 20 },
        }),
      ),
    ).toEqual({ calculable: true, min: 500, max: 1000 });
    expect(
      capacite(
        daphnie,
        installation({
          dimensionsCm: { longueur: 30, largeur: 20, hauteur: 20 },
        }),
      ),
    ).toEqual({ calculable: true, min: 600, max: 1200 });
  });

  it("ne se calcule pas sans densité, ni sans les dimensions ou le volume qu'elle demande", async () => {
    const dimensions = { longueur: 30, largeur: 20, hauteur: 20 };
    expect(
      capacite(
        await animal(undefined),
        installation({ dimensionsCm: dimensions }),
      ),
    ).toEqual({ calculable: false, raison: "sans-densite" });
    expect(
      capacite(
        await animal({ min: 1, max: 2, unite: "par-m2-sol" }),
        installation({ volumeL: 10 }),
      ),
    ).toEqual({ calculable: false, raison: "sans-surface" });
    expect(
      capacite(
        await animal({ min: 1, max: 2, unite: "par-litre" }),
        installation(),
      ),
    ).toEqual({ calculable: false, raison: "sans-volume" });
  });
});
