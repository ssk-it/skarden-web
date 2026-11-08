import { describe, expect, it } from "vitest";
import { lireFiche } from "./format";
import { fiche } from "./depot-exemple";
import {
  comparer,
  degustationsDe,
  delaiDeDegustation,
  dureeDePhase,
  dureeIso,
  dureeTotale,
  evolutionDesCriteres,
  instant,
  recettesParCategorie,
  versRealisation,
  versRecette,
  type Realisation,
  type Recette,
} from "./transformations";
import type { EntreeDuJournal } from "./depot-de-fiches";

const JOUR = 24 * 3600 * 1000;

const recette = (champs: string): Recette =>
  versRecette(lireFiche(fiche(champs)));
const realisation = (champs: string): Realisation =>
  versRealisation(lireFiche(fiche(champs)));

const LIQUEUR = recette(`id: liqueur-hibiscus
nom: Liqueur d'hibiscus
categorie: liqueur
version: 2
ingredients:
  - { ingredient: hibiscus, quantite: 40, unite: g, conservation: seche }
  - { ingredient: alcool-neutre, quantite: 700, unite: ml }
  - { ingredient: sucre, quantite: 200, unite: g }
  - { ingredient: zeste, quantite: 1, unite: piece, optionnel: true }
phases:
  - id: maceration
    libelle: Macération
    duree_cible: { min: P3D, max: P5D }
    temperature_c: { min: 18, max: 22 }
  - id: filtration
    libelle: Filtration
  - id: repos
    libelle: Repos
    duree_cible: { min: P2W, max: P4W }`);

describe("les durées", () => {
  it("lit une durée ISO 8601, un mois comptant 30 jours et une année 365", () => {
    expect(dureeIso("P3D")).toBe(3 * JOUR);
    expect(dureeIso("P2W")).toBe(14 * JOUR);
    expect(dureeIso("PT12H")).toBe(JOUR / 2);
    expect(dureeIso("P1M")).toBe(30 * JOUR);
    expect(dureeIso("P1Y2M")).toBe(425 * JOUR);
    expect(dureeIso("trois jours")).toBeUndefined();
  });

  it("compte une date sans heure pour toute la journée", () => {
    const phase = { debut: "2026-11-08", fin: "2026-11-11" };
    expect(dureeDePhase(phase, 0)).toEqual({ ms: 4 * JOUR, enCours: false });
    const sameJour = { debut: "2026-11-08", fin: "2026-11-08" };
    expect(dureeDePhase(sameJour, 0).ms).toBe(JOUR);
    const aLHeure = { debut: "2026-11-08T10:00", fin: "2026-11-08T22:00" };
    expect(dureeDePhase(aLHeure, 0).ms).toBe(JOUR / 2);
  });

  it("fait courir jusqu'à maintenant la durée d'une phase sans fin", () => {
    const maintenant = instant("2026-11-09T06:00");
    expect(dureeDePhase({ debut: "2026-11-08" }, maintenant)).toEqual({
      ms: 30 * 3600 * 1000,
      enCours: true,
    });
  });

  it("calcule la durée totale d'une réalisation, en cours ou finie", () => {
    const maintenant = instant("2026-11-10T00:00");
    expect(
      dureeTotale({ debut: "2026-11-08", fin: "2026-11-30" }, maintenant),
    ).toEqual({ ms: 23 * JOUR, enCours: false });
    expect(dureeTotale({ debut: "2026-11-08" }, maintenant)).toEqual({
      ms: 2 * JOUR,
      enCours: true,
    });
  });
});

describe("le délai d'une dégustation", () => {
  it("se compte depuis la fin de la réalisation", () => {
    expect(
      delaiDeDegustation(
        { debut: "2026-11-08", fin: "2026-11-30" },
        "2026-12-30",
      ),
    ).toEqual({ depuis: "fin", jours: 30 });
  });

  it("vaut zéro le jour de la fin, une date valant pour toute la journée", () => {
    expect(
      delaiDeDegustation(
        { debut: "2026-11-08", fin: "2026-11-30T18:00" },
        "2026-11-30",
      ),
    ).toEqual({ depuis: "fin", jours: 0 });
  });

  it("se compte depuis le début quand elle précède la fin ou que la réalisation est en cours", () => {
    expect(
      delaiDeDegustation(
        { debut: "2026-11-08", fin: "2026-11-30" },
        "2026-11-10",
      ),
    ).toEqual({ depuis: "debut", jours: 2 });
    expect(delaiDeDegustation({ debut: "2026-11-08" }, "2026-11-10")).toEqual({
      depuis: "debut",
      jours: 2,
    });
  });
});

describe("la lecture d'une réalisation", () => {
  it("admet des listes d'ingrédients et de phases vides", () => {
    const vide = realisation(`id: 2026-11-08-essai
nom: Essai
recette: liqueur-hibiscus
recette_version: 1
statut: en-cours
debut: 2026-11-08
fin: null
ingredients: []
phases: []`);
    expect(vide).toMatchObject({ ingredients: [], phases: [], fin: undefined });
  });

  it("lit la provenance d'un ingrédient et le nombre de contenants d'une phase", () => {
    const lue = realisation(`id: 2026-11-08-liqueur
nom: Liqueur
recette: liqueur-hibiscus
recette_version: 1
statut: en-cours
debut: 2026-11-08
ingredients:
  - { ingredient: hibiscus, quantite: 29, unite: g, conservation: seche, produit: karcade, lot: YE1156, dluo: 2027-06-01, achat: { date: 2026-10-01, lieu: Aubagne, prix_eur: 4.5 } }
  - { ingredient: menthe, quantite: 10, unite: g, culture: 2026-menthe-cuisine, recolte: 2026-11-07 }
phases:
  - { id: maceration, debut: 2026-11-08, contenant: bocal, temperature_c: { min: 19, max: 21, mesure: thermomètre } }`);
    expect(lue.ingredients[0]).toMatchObject({
      produit: "karcade",
      lot: "YE1156",
      dluo: "2027-06-01",
      achat: { date: "2026-10-01", lieu: "Aubagne", prixEur: 4.5 },
      ajoute: false,
    });
    expect(lue.ingredients[1]).toMatchObject({
      culture: "2026-menthe-cuisine",
      recolte: "2026-11-07",
    });
    expect(lue.phases[0]).toMatchObject({
      contenant: "bocal",
      nombre: 1,
      temperatureC: { min: 19, max: 21, mesure: "thermomètre" },
    });
  });
});

describe("la comparaison à la recette", () => {
  const faite = realisation(`id: 2026-11-08-liqueur
nom: Liqueur
recette: liqueur-hibiscus
recette_version: 1
statut: terminee
debut: 2026-11-08
fin: 2026-12-10
ingredients:
  - { ingredient: hibiscus, quantite: 29, unite: g, conservation: seche }
  - { ingredient: alcool-neutre, quantite: 0.5, unite: l }
  - { ingredient: sucre-roux, quantite: 143, unite: g, ajoute: true }
phases:
  - { id: maceration, debut: 2026-11-08, fin: 2026-11-13, temperature_c: { min: 19, max: 24 } }
  - { id: clarification, debut: 2026-11-14, fin: 2026-11-14, ajoutee: true }
  - { id: repos, debut: 2026-11-15, fin: 2026-11-20 }`);
  const comparaison = comparer(faite, LIQUEUR, 0);

  it("annonce que la recette a changé depuis la réalisation", () => {
    expect(comparaison.versionDifferente).toBe(true);
  });

  it("calcule l'écart d'une quantité dans des unités de même nature", () => {
    expect(comparaison.ingredients[0]).toMatchObject({
      ingredient: "hibiscus",
      etat: "employe",
      ecart: { quantite: -11, unite: "g", pourcentage: -27.5 },
    });
    expect(comparaison.ingredients[1]).toMatchObject({
      ingredient: "alcool-neutre",
      etat: "employe",
      ecart: { quantite: -200, unite: "ml" },
    });
  });

  it("signale les ingrédients manquants et ajoutés, sauf les facultatifs", () => {
    const etats = comparaison.ingredients.map((i) => [i.ingredient, i.etat]);
    expect(etats).toContainEqual(["sucre", "manquant"]);
    expect(etats).toContainEqual(["sucre-roux", "ajoute"]);
    expect(etats).toContainEqual(["zeste", "facultatif-absent"]);
  });

  it("signale une conservation différente sans calculer d'écart", () => {
    const fraiche = realisation(`id: x
nom: x
recette: liqueur-hibiscus
recette_version: 2
statut: en-cours
debut: 2026-11-08
ingredients:
  - { ingredient: hibiscus, quantite: 100, unite: g, conservation: frais }
phases: []`);
    const ligne = comparer(fraiche, LIQUEUR, 0).ingredients[0];
    expect(ligne).toMatchObject({
      etat: "employe",
      conservationDifferente: true,
    });
    expect(ligne && "ecart" in ligne ? ligne.ecart : undefined).toBeUndefined();
  });

  it("ne calcule pas d'écart entre une masse et un volume", () => {
    const enVolume = realisation(`id: x
nom: x
recette: liqueur-hibiscus
recette_version: 2
statut: en-cours
debut: 2026-11-08
ingredients:
  - { ingredient: sucre, quantite: 20, unite: cl }
phases: []`);
    const ligne = comparer(enVolume, LIQUEUR, 0).ingredients.find(
      (i) => i.ingredient === "sucre",
    );
    expect(ligne).toMatchObject({ etat: "employe", incomparable: true });
  });

  it("signale une durée ou une température hors de sa plage cible", () => {
    const maceration = comparaison.phases.find((p) => p.id === "maceration");
    expect(maceration).toMatchObject({
      etat: "realisee",
      duree: { ms: 6 * JOUR, horsPlage: "longue" },
      temperature: { horsPlage: true },
    });
    const repos = comparaison.phases.find((p) => p.id === "repos");
    expect(repos).toMatchObject({ duree: { horsPlage: "courte" } });
  });

  it("signale les phases ajoutées et celles qui n'ont pas eu lieu", () => {
    const etats = comparaison.phases.map((p) => [p.id, p.etat]);
    expect(etats).toContainEqual(["clarification", "ajoutee"]);
    expect(etats).toContainEqual(["filtration", "absente"]);
  });

  it("dit à venir les phases d'une réalisation en cours, et n'en juge pas trop tôt la durée", () => {
    const enCours = realisation(`id: x
nom: x
recette: liqueur-hibiscus
recette_version: 2
statut: en-cours
debut: 2026-11-08
ingredients: []
phases:
  - { id: maceration, debut: 2026-11-08 }`);
    const resultat = comparer(enCours, LIQUEUR, instant("2026-11-09T12:00"));
    expect(resultat.versionDifferente).toBe(false);
    expect(resultat.phases[0]).toMatchObject({
      etat: "en-cours",
      duree: { horsPlage: undefined },
    });
    expect(resultat.phases[1]).toMatchObject({
      id: "filtration",
      etat: "a-venir",
    });
    const tropLongue = comparer(enCours, LIQUEUR, instant("2026-11-20T00:00"));
    expect(tropLongue.phases[0]).toMatchObject({
      duree: { horsPlage: "longue" },
    });
  });
});

describe("les dégustations", () => {
  const entree = (
    date: string,
    avis: EntreeDuJournal["avis"],
  ): EntreeDuJournal => ({
    chemin: `journal/2026/${date}-degustation.md`,
    date,
    realisation: "r",
    evenement: "degustation",
    avis,
    photos: [],
    corps: "",
  });
  const journal = [
    entree("2027-06-10", [
      { participant: "Camille", criteres: { couleur: 9, nez: 8.5 } },
    ]),
    {
      ...entree("2026-12-20", []),
      evenement: "observation",
    },
    entree("2026-12-10", [
      { participant: "Camille", criteres: { couleur: 9, nez: 7 } },
      { participant: "Sam", criteres: { couleur: 8, bouche: 7.5 } },
    ]),
  ];
  const degustations = degustationsDe(
    { debut: "2026-11-08", fin: "2026-11-10" },
    journal,
  );

  it("les range de la plus ancienne à la plus récente, chacune avec son délai", () => {
    expect(degustations.map((d) => [d.entree.date, d.delai.jours])).toEqual([
      ["2026-12-10", 30],
      ["2027-06-10", 212],
    ]);
  });

  it("fait la moyenne de chaque critère sur les seuls participants qui l'ont noté", () => {
    expect(degustations[0]?.criteres).toEqual(["couleur", "nez", "bouche"]);
    expect(degustations[0]?.moyennes).toEqual({
      couleur: 8.5,
      nez: 7,
      bouche: 7.5,
    });
  });

  it("suit chaque critère d'une dégustation à l'autre", () => {
    expect(evolutionDesCriteres(degustations)).toEqual([
      { critere: "couleur", moyennes: [8.5, 9] },
      { critere: "nez", moyennes: [7, 8.5] },
      { critere: "bouche", moyennes: [7.5, undefined] },
    ]);
  });
});

describe("la liste des recettes", () => {
  const r = (id: string, categorie: string, nom: string, derive?: string) =>
    recette(
      `id: ${id}\nnom: ${nom}\ncategorie: ${categorie}\nversion: 1${derive ? `\nderive_de: ${derive}` : ""}\ningredients: [{ ingredient: a, quantite: 1, unite: g }]\nphases: [{ id: p, libelle: P }]`,
    );

  it("range par catégorie puis par nom, chaque variante sous sa source", () => {
    const rangees = recettesParCategorie([
      r("sirop-menthe", "sirop", "Sirop de menthe"),
      r(
        "liqueur-hibiscus-gingembre",
        "liqueur",
        "Au gingembre",
        "liqueur-hibiscus",
      ),
      r("liqueur-noix", "liqueur", "Liqueur de noix"),
      r("liqueur-hibiscus", "liqueur", "Liqueur d'hibiscus"),
      r(
        "gingembre-fort",
        "liqueur",
        "Gingembre fort",
        "liqueur-hibiscus-gingembre",
      ),
    ]);
    expect(
      rangees.map((c) => [c.categorie, c.recettes.map((n) => n.recette.id)]),
    ).toEqual([
      ["liqueur", ["liqueur-hibiscus", "liqueur-noix"]],
      ["sirop", ["sirop-menthe"]],
    ]);
    const hibiscus = rangees[0]?.recettes[0];
    expect(hibiscus?.variantes.map((v) => v.recette.id)).toEqual([
      "liqueur-hibiscus-gingembre",
    ]);
    expect(hibiscus?.variantes[0]?.variantes.map((v) => v.recette.id)).toEqual([
      "gingembre-fort",
    ]);
  });

  it("garde à la racine une variante dont la source manque ou qui tourne en rond", () => {
    const rangees = recettesParCategorie([
      r("orpheline", "sirop", "Orpheline", "disparue"),
      r("a", "sirop", "A", "b"),
      r("b", "sirop", "B", "a"),
    ]);
    const ids = rangees.flatMap((c) => c.recettes.map((n) => n.recette.id));
    expect(ids).toContain("orpheline");
    expect(ids.filter((id) => id === "a" || id === "b").length).toBeGreaterThan(
      0,
    );
  });
});
