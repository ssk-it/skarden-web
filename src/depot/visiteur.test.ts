import { beforeEach, describe, expect, it } from "vitest";
import { lireDepotSaisi, memoireDuVisiteur } from "./visiteur";

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
