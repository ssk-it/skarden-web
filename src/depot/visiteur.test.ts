import { beforeEach, describe, expect, it } from "vitest";
import {
  lireDepotSaisi,
  memoireDeLOnglet,
  memoireDuVisiteur,
} from "./visiteur";

describe("lireDepotSaisi", () => {
  it.each([
    ["sskorupski/skarden", { proprietaire: "sskorupski", depot: "skarden" }],
    [
      "  sskorupski/skarden  ",
      { proprietaire: "sskorupski", depot: "skarden" },
    ],
    [
      "https://github.com/sskorupski/skarden",
      { proprietaire: "sskorupski", depot: "skarden" },
    ],
    [
      "https://github.com/sskorupski/skarden.git",
      { proprietaire: "sskorupski", depot: "skarden" },
    ],
    [
      "github.com/ssk-it/skarden-web/tree/main",
      { proprietaire: "ssk-it", depot: "skarden-web" },
    ],
  ])("comprend « %s »", (saisie, attendu) => {
    expect(lireDepotSaisi(saisie)).toEqual(attendu);
  });

  it.each(["", "skarden", "a/b/c d", "../x/y", "https://gitlab.com/a/b"])(
    "refuse « %s »",
    (saisie) => {
      expect(lireDepotSaisi(saisie)).toBeUndefined();
    },
  );
});

// RG-jeton-d-un-depot-prive, RG-depot-designe-par-le-visiteur
describe("memoireDuVisiteur", () => {
  beforeEach(() => localStorage.clear());

  it("mémorise le jeton sur l'appareil, jusqu'à ce qu'on l'oublie", () => {
    memoireDuVisiteur.retenirJeton("ghp_secret");
    expect(memoireDuVisiteur.jeton()).toBe("ghp_secret");
    memoireDuVisiteur.oublierJeton();
    expect(memoireDuVisiteur.jeton()).toBeUndefined();
  });

  it("retient le dernier dépôt lu", () => {
    memoireDuVisiteur.retenirDepot({
      proprietaire: "sskorupski",
      depot: "skarden",
    });
    expect(memoireDuVisiteur.dernierDepot()).toEqual({
      proprietaire: "sskorupski",
      depot: "skarden",
    });
  });

  it("se passe du stockage quand le navigateur le refuse", () => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error("SecurityError");
    };
    try {
      expect(memoireDuVisiteur.jeton()).toBeUndefined();
      expect(memoireDuVisiteur.dernierDepot()).toBeUndefined();
    } finally {
      Storage.prototype.getItem = original;
    }
  });
});

// RG-jeton-d-un-depot-prive : le jeton d'écriture ne vaut que pour un dépôt et le temps de l'onglet, jamais sur l'appareil.
describe("la mémoire de l'onglet", () => {
  const SKARDEN = { proprietaire: "sskorupski", depot: "skarden" };
  const AUTRE = { proprietaire: "sskorupski", depot: "autre" };
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("garde le jeton d'écriture d'un dépôt le temps de l'onglet, et nulle part sur l'appareil", () => {
    memoireDeLOnglet.retenirJetonDEcriture(SKARDEN, "github_pat_ecriture");
    expect(memoireDeLOnglet.jetonDEcriture(SKARDEN)).toBe(
      "github_pat_ecriture",
    );
    expect(memoireDeLOnglet.jetonDEcriture(AUTRE)).toBeUndefined();
    expect(localStorage.length).toBe(0);
    expect(
      sessionStorage.getItem("skarden.jeton-d-ecriture.sskorupski/skarden"),
    ).toBe("github_pat_ecriture");
  });

  it("l'oublie", () => {
    memoireDeLOnglet.retenirJetonDEcriture(SKARDEN, "github_pat_ecriture");
    memoireDeLOnglet.oublierJetonDEcriture(SKARDEN);
    expect(memoireDeLOnglet.jetonDEcriture(SKARDEN)).toBeUndefined();
  });
});
