import { describe, expect, it } from "vitest";
import {
  libelle,
  libelleDelai,
  libelleDateOuInstant,
  libelleDuree,
  libelleEcart,
  libellePlageDeDurees,
  libelleQuantite,
  libelleTemperature,
} from "./libelles";

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

describe("les libellés des transformations", () => {
  const HEURE = 3600 * 1000;
  const JOUR = 24 * HEURE;

  it("écrit une quantité avec son unité, au pluriel s'il le faut", () => {
    expect(libelleQuantite({ quantite: 29, unite: "g" })).toBe("29 g");
    expect(libelleQuantite({ quantite: 0.5, unite: "l" })).toBe("0,5 l");
    expect(libelleQuantite({ quantite: 1, unite: "piece" })).toBe("1 pièce");
    expect(libelleQuantite({ quantite: 2, unite: "pincee" })).toBe("2 pincées");
    expect(libelleQuantite({ quantite: 1, unite: "cas" })).toBe("1 c. à soupe");
  });

  it("écrit une durée calculée en heures, puis en jours", () => {
    expect(libelleDuree(20 * 60 * 1000)).toBe("moins d'une heure");
    expect(libelleDuree(15 * HEURE)).toBe("15 h");
    expect(libelleDuree(JOUR + 6 * HEURE)).toBe("1 jour et 6 h");
    expect(libelleDuree(4 * JOUR)).toBe("4 jours");
    expect(libelleDuree(45 * JOUR)).toBe("45 jours");
  });

  it("écrit une plage de durées ISO en mots", () => {
    expect(libellePlageDeDurees({ min: "P3D", max: "P5D" })).toBe(
      "3 à 5 jours",
    );
    expect(libellePlageDeDurees({ min: "P2W", max: "P2W" })).toBe("2 semaines");
    expect(libellePlageDeDurees({ min: "PT12H", max: "P1D" })).toBe(
      "de 12 heures à 1 jour",
    );
    expect(libellePlageDeDurees({ min: "P1Y2M", max: "P1Y2M" })).toBe(
      "1 an et 2 mois",
    );
  });

  it("dit le délai d'une dégustation depuis la fin ou le début", () => {
    expect(libelleDelai({ depuis: "fin", jours: 0 })).toBe("le jour de la fin");
    expect(libelleDelai({ depuis: "fin", jours: 1 })).toBe(
      "1 jour après la fin",
    );
    expect(libelleDelai({ depuis: "fin", jours: 61 })).toBe(
      "61 jours après la fin, environ 2 mois",
    );
    expect(libelleDelai({ depuis: "debut", jours: 2 })).toBe(
      "2 jours après le début, avant la fin",
    );
  });

  it("écrit un écart signé, et sa part de la quantité prévue", () => {
    expect(
      libelleEcart({ quantite: -11, unite: "g", pourcentage: -27.5 }),
    ).toBe("−11 g (−27,5 %)");
    expect(libelleEcart({ quantite: 5, unite: "ml", pourcentage: 2 })).toBe(
      "+5 ml (+2 %)",
    );
  });

  it("écrit une température relevée ou visée", () => {
    expect(libelleTemperature({ min: 18, max: 22 })).toBe("18 à 22 °C");
    expect(libelleTemperature({ min: 20, max: 20 })).toBe("20 °C");
  });

  it("écrit une date, ou une date avec heure", () => {
    expect(libelleDateOuInstant("2026-11-08")).toBe("8 novembre 2026");
    expect(libelleDateOuInstant("2026-11-08T09:30")).toBe(
      "8 novembre 2026 à 9 h 30",
    );
  });

  it("rend en mots les valeurs des transformations", () => {
    expect(libelle("seche")).toBe("séché");
    expect(libelle("equilibre")).toBe("équilibre");
    expect(libelle("degustation")).toBe("dégustation");
  });
});
