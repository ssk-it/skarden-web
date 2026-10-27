import { describe, expect, it } from "vitest";
import { DepotIllisible } from "../depot/lecteur";
import { lecteurEnMemoire } from "../depot/lecteur-en-memoire";
import { DepotDeFiches, FicheIntrouvable } from "./depot-de-fiches";
import { DEPOT_EXEMPLE, fiche } from "./depot-exemple";
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

  // RG-entree-du-journal : une entrée désigne une culture ou un élevage ; le site ne présente pas encore les élevages.
  it("laisse de côté, sans la dire invalide, une entrée du journal qui désigne un élevage", async () => {
    const { depot } = await ouvrir({
      ...DEPOT_EXEMPLE,
      "journal/2026/2026-11-03-petit-gris-mise-en-dormance.md": fiche(
        "date: 2026-11-03\nelevage: 2026-petit-gris-garage\nevenement: mise-en-dormance",
      ),
    });
    const { cultures, invalides } = await depot.accueil();
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

  it("lit une photo citée par une fiche", async () => {
    const { depot } = await ouvrir();
    expect(await (await depot.lirePhoto("medias/basilic.jpg")).text()).toBe(
      "JPG",
    );
  });
});
