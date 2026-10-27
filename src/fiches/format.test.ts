import { describe, expect, it } from "vitest";
import { DepotIllisible } from "../depot/lecteur";
import { FicheInvalide, lireFiche, lireReferentiel } from "./format";

const REFERENTIEL = `schema_version: 1
collections:
  familles: { dossier: familles, schema: schemas/famille.schema.json }
  plantes:
    dossier: plantes
    schema: schemas/plante.schema.json
    liens: { famille: familles }
  emplacements: { dossier: emplacements, schema: s.json }
  cultures: { dossier: cultures, schema: s.json }
  journal: { dossier: journal, schema: s.json, par_annee: true }
`;

describe("lireReferentiel", () => {
  it("trouve le dossier de chaque collection", () => {
    const referentiel = lireReferentiel(REFERENTIEL);
    expect(referentiel.dossiers).toEqual({
      familles: "familles",
      plantes: "plantes",
      emplacements: "emplacements",
      cultures: "cultures",
      journal: "journal",
    });
  });

  // RG-referentiel-yml-decrit-le-depot : les collections de l'animal sont facultatives.
  it("lit les collections de l'animal quand le dépôt les déclare", () => {
    const referentiel = lireReferentiel(
      `${REFERENTIEL}  animaux: { dossier: animaux }\n  elevages: { dossier: elevages }\n  installations: { dossier: installations }\n  procedures: { dossier: procedures }\n`,
    );
    expect(referentiel.dossiers).toMatchObject({
      animaux: "animaux",
      elevages: "elevages",
      installations: "installations",
      procedures: "procedures",
    });
  });

  it("accepte un dépôt qui ne déclare pas les collections de l'animal", () => {
    const { dossiers } = lireReferentiel(REFERENTIEL);
    expect(dossiers.animaux).toBeUndefined();
    expect(dossiers.elevages).toBeUndefined();
  });

  it("refuse une version de format inconnue", () => {
    const erreur = (() => {
      try {
        lireReferentiel(
          REFERENTIEL.replace("schema_version: 1", "schema_version: 2"),
        );
      } catch (e) {
        return e;
      }
    })();
    expect(erreur).toBeInstanceOf(DepotIllisible);
    expect((erreur as DepotIllisible).raison).toBe("format-inconnu");
  });

  it("refuse un référentiel auquel il manque une collection", () => {
    expect(() =>
      lireReferentiel(
        "schema_version: 1\ncollections:\n  plantes: { dossier: plantes }\n",
      ),
    ).toThrow(DepotIllisible);
  });

  it("refuse un YAML illisible", () => {
    expect(() => lireReferentiel("schema_version: [")).toThrow(DepotIllisible);
  });
});

describe("lireFiche", () => {
  it("sépare le frontmatter du corps", () => {
    const fiche = lireFiche(
      "---\nid: basilic\ndebut: 2026-04-12\ncalendrier:\n  recolte: [6, 7]\n---\n\nUn corps.\n",
    );
    expect(fiche.donnees).toEqual({
      id: "basilic",
      debut: "2026-04-12",
      calendrier: { recolte: [6, 7] },
    });
    expect(fiche.corps).toBe("Un corps.\n");
  });

  it("accepte les fins de ligne Windows", () => {
    expect(lireFiche("---\r\nid: a\r\n---\r\nTexte").donnees).toEqual({
      id: "a",
    });
  });

  it("refuse une fiche sans frontmatter", () => {
    expect(() => lireFiche("Pas de frontmatter")).toThrow(FicheInvalide);
  });

  it("refuse un frontmatter illisible", () => {
    expect(() => lireFiche("---\nid: [\n---\n")).toThrow(FicheInvalide);
  });

  it("refuse un frontmatter qui n'est pas un dictionnaire", () => {
    expect(() => lireFiche("---\n- a\n---\n")).toThrow(FicheInvalide);
  });
});
