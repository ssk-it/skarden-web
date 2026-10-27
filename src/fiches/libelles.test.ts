import { describe, expect, it } from "vitest";
import { libelle } from "./libelles";

// RG-page-d-un-animal : les valeurs fermées s'affichent en mots lisibles, jamais sous leur code.
describe("libelle", () => {
  it.each([
    ["a-eviter", "à éviter"],
    ["bimestrielle", "tous les deux mois"],
    ["quotidienne", "chaque jour"],
    ["par-m2-sol", "par m² au sol"],
    ["encadree", "encadrée"],
    ["protegee", "protégée"],
    ["temperature-c", "température (°C)"],
    ["humidite-pct", "humidité (%)"],
    ["salinite-g-l", "salinité (g/L)"],
    ["ph", "pH"],
    ["elevage", "élevage"],
    ["reveil", "réveil"],
    ["activite", "activité"],
    ["preparation", "préparation"],
    ["oeufs", "œufs"],
    ["juvenile", "juvénile"],
    ["farine-d-elevage", "farine d'élevage"],
    ["changement-d-eau", "changement d'eau"],
    ["renouvellement-substrat", "renouvellement du substrat"],
    ["controle", "contrôle"],
    ["eau-salee", "eau salée"],
    ["prelevement", "prélèvement"],
    ["eclosion", "éclosion"],
    ["mise-en-dormance", "mise en dormance"],
  ])("%s → %s", (valeur, attendu) => {
    expect(libelle(valeur)).toBe(attendu);
  });

  it("garde le repli : les tirets deviennent des espaces", () => {
    expect(libelle("plein-soleil")).toBe("plein soleil");
  });
});
