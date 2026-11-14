import { describe, expect, it } from "vitest";
import { lireFiche } from "./format";
import {
  PhaseDejaClose,
  PhaseIntrouvable,
  ecrireLaFin,
  entreeDeFin,
  erreurDeFin,
  nommerFinDePhase,
} from "./fin-de-phase";
import { FicheNonModifiable } from "./photos-ajoutees";
import { instant } from "./transformations";

const REALISATION = `---
id: 2026-11-08-liqueur-hibiscus
nom: Liqueur d'hibiscus, novembre 2026
recette: liqueur-hibiscus
recette_version: 1
statut: en-cours
debut: 2026-11-08
fin: null
ingredients:
  - { ingredient: hibiscus, quantite: 29, unite: g }
phases:
  - id: maceration
    debut: 2026-11-08
    contenant: bocal-parfait-1l
    nombre: 1
  - id: repos
    debut: 2026-11-10T09:00
photos: []
---

Corps de la fiche.
`;

describe("nommerFinDePhase", () => {
  it("nomme la branche d'après la réalisation, la phase et l'instant, et range l'entrée au jour de la fin", () => {
    expect(
      nommerFinDePhase({
        fichier: "2026-11-08-liqueur-hibiscus",
        phase: "maceration",
        fin: "2026-11-20T10:15",
        journal: "journal",
        instant: new Date(2026, 10, 20, 10, 17),
      }),
    ).toEqual({
      branche: "phases/2026-11-08-liqueur-hibiscus-maceration-20261120-1017",
      entree: "journal/2026/2026-11-20-liqueur-hibiscus-fin-de-maceration.md",
    });
  });
});

describe("erreurDeFin", () => {
  const maintenant = instant("2026-11-20T10:30");

  it("admet une fin entre le début et maintenant", () => {
    expect(
      erreurDeFin("2026-11-08", "2026-11-20T10:15", maintenant),
    ).toBeUndefined();
  });

  it("refuse une fin vide ou mal formée", () => {
    expect(erreurDeFin("2026-11-08", "", maintenant)).toBe("invalide");
    expect(erreurDeFin("2026-11-08", "2026-11-20", maintenant)).toBe(
      "invalide",
    );
  });

  it("refuse une fin antérieure au début", () => {
    expect(
      erreurDeFin("2026-11-10T09:00", "2026-11-10T08:59", maintenant),
    ).toBe("avant-le-debut");
    expect(erreurDeFin("2026-11-08", "2026-11-07T23:59", maintenant)).toBe(
      "avant-le-debut",
    );
  });

  it("admet, face à un début sans heure, toute heure du même jour", () => {
    expect(
      erreurDeFin("2026-11-08", "2026-11-08T00:00", maintenant),
    ).toBeUndefined();
  });

  it("refuse une fin à venir", () => {
    expect(erreurDeFin("2026-11-08", "2026-11-20T10:31", maintenant)).toBe(
      "a-venir",
    );
  });
});

describe("ecrireLaFin", () => {
  it("écrit la fin sous le début de la phase, sans rien changer d'autre", () => {
    const modifiee = ecrireLaFin(REALISATION, "maceration", "2026-11-20T10:15");
    expect(modifiee).toBe(
      REALISATION.replace(
        "    debut: 2026-11-08\n    contenant",
        "    debut: 2026-11-08\n    fin: 2026-11-20T10:15\n    contenant",
      ),
    );
  });

  it("écrit la fin d'une phase en ligne", () => {
    const texte = REALISATION.replace(
      "  - id: repos\n    debut: 2026-11-10T09:00\n",
      "  - { id: repos, debut: 2026-11-10T09:00 }\n",
    );
    const modifiee = ecrireLaFin(texte, "repos", "2026-11-20T10:15");
    expect(modifiee).toContain(
      "  - { id: repos, debut: 2026-11-10T09:00, fin: 2026-11-20T10:15 }\n",
    );
    const phases = lireFiche(modifiee).donnees.phases as { fin?: string }[];
    expect(phases[1]?.fin).toBe("2026-11-20T10:15");
  });

  it("écrit la fin d'une phase en ligne aux champs imbriqués, sans toucher au reste de la ligne", () => {
    const ligne =
      "  - { id: maceration, debut: 2026-11-08, contenant: bocal-parfait-1l,  temperature_c: { min: 19, max: 20 } }";
    const texte = REALISATION.replace(
      "  - id: maceration\n    debut: 2026-11-08\n    contenant: bocal-parfait-1l\n    nombre: 1\n",
      `${ligne}\n`,
    );
    expect(ecrireLaFin(texte, "maceration", "2026-11-20T10:15")).toContain(
      "  - { id: maceration, debut: 2026-11-08, fin: 2026-11-20T10:15, contenant: bocal-parfait-1l,  temperature_c: { min: 19, max: 20 } }\n",
    );
  });

  it("remplace une fin vide", () => {
    const texte = REALISATION.replace(
      "    debut: 2026-11-10T09:00\n",
      "    debut: 2026-11-10T09:00\n    fin: null\n",
    );
    expect(ecrireLaFin(texte, "repos", "2026-11-20T10:15")).toContain(
      "    debut: 2026-11-10T09:00\n    fin: 2026-11-20T10:15\n",
    );
  });

  it("refuse une phase absente de la fiche", () => {
    expect(() =>
      ecrireLaFin(REALISATION, "filtrage", "2026-11-20T10:15"),
    ).toThrow(PhaseIntrouvable);
  });

  it("refuse une phase déjà close", () => {
    const texte = REALISATION.replace(
      "    debut: 2026-11-10T09:00\n",
      "    debut: 2026-11-10T09:00\n    fin: 2026-11-12T08:00\n",
    );
    expect(() => ecrireLaFin(texte, "repos", "2026-11-20T10:15")).toThrow(
      PhaseDejaClose,
    );
  });

  it("refuse une forme qu'il ne sait pas retoucher", () => {
    const texte = REALISATION.replace("phases:\n", "phases: &phases\n").replace(
      "photos: []",
      "photos: []\nautres: *phases",
    );
    expect(() => ecrireLaFin(texte, "maceration", "2026-11-20T10:15")).toThrow(
      FicheNonModifiable,
    );
  });
});

describe("entreeDeFin", () => {
  it("dit la réalisation, la phase et la remarque", () => {
    expect(
      entreeDeFin({
        realisation: "2026-11-08-liqueur-hibiscus",
        phase: "maceration",
        libelle: "Macération",
        fin: "2026-11-20T10:15",
        remarque: "  Couleur rubis, filtrée au café.  ",
      }),
    ).toBe(
      "---\ndate: 2026-11-20\nrealisation: 2026-11-08-liqueur-hibiscus\nevenement: fin-de-phase\nphase: maceration\n---\n\nCouleur rubis, filtrée au café.\n",
    );
  });

  it("dit, sans remarque, la phase close et son heure", () => {
    expect(
      entreeDeFin({
        realisation: "2026-11-08-liqueur-hibiscus",
        phase: "maceration",
        libelle: "Macération",
        fin: "2026-11-20T10:15",
        remarque: "",
      }),
    ).toMatch(
      /\n\nFin de la phase « Macération » le 20 novembre 2026 à 10 h 15\.\n$/,
    );
  });
});
