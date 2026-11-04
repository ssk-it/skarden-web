import { describe, expect, it } from "vitest";
import { EcritureRefusee } from "../depot/ecrivain";
import {
  ecrivainEnMemoire,
  type ScenarioDEcriture,
} from "../depot/ecrivain-en-memoire";
import { fiche } from "./depot-exemple";
import { posterPhotos, type Suivi } from "./envoi-de-photos";

const BASILIC = fiche(
  "id: basilic\nnom: Basilic\nphotos: [medias/basilic.jpg]",
  "Craint le froid.",
);
const INSTANT = new Date(2026, 10, 4, 14, 32);

async function poster(
  scenario: ScenarioDEcriture = {},
  contenus: Record<string, string> = { "plantes/basilic.md": BASILIC },
) {
  const ecrivain = ecrivainEnMemoire(contenus, scenario);
  const suivis: Suivi[] = [];
  let attentes = 0;
  const fin = await posterPhotos(
    ecrivain,
    {
      dossier: "plantes",
      fichier: "basilic",
      photos: [new Blob(["photo-1"]), new Blob(["photo-2"])],
    },
    (suivi) => suivis.push(suivi),
    { maintenant: INSTANT, attendre: async () => void attentes++ },
  );
  return { ecrivain, suivis, fin, attentes };
}

describe("l'envoi de photos", () => {
  // RG-photo-postee-depuis-le-site : un seul commit, sur une branche partie de la tête de la branche par défaut.
  it("commite les photos et la fiche complétée en un seul commit, sur une branche à part", async () => {
    const { ecrivain } = await poster();
    expect(ecrivain.commits).toHaveLength(1);
    const [commit] = ecrivain.commits;
    expect(commit?.branche).toBe("photos/basilic-20261104-1432");
    expect(commit?.base).toBe("main-1");
    expect(commit?.fichiers.map((f) => f.chemin)).toEqual([
      "medias/plantes/basilic-20261104-1432-1.jpg",
      "medias/plantes/basilic-20261104-1432-2.jpg",
      "plantes/basilic.md",
    ]);
    expect(commit?.fichiers[2]?.contenu).toBe(
      fiche(
        "id: basilic\nnom: Basilic\nphotos: [medias/basilic.jpg, medias/plantes/basilic-20261104-1432-1.jpg, medias/plantes/basilic-20261104-1432-2.jpg]",
        "Craint le froid.",
      ),
    );
  });

  // ADR-photos-postees-par-une-branche : la demande de fusion ne s'ouvre que sur la branche convertie.
  it("attend la conversion avant d'ouvrir la demande de fusion, puis en demande la fusion automatique", async () => {
    const { ecrivain, attentes } = await poster({
      conversion: [
        { etat: "en-attente" },
        { etat: "en-attente" },
        { etat: "reussie" },
      ],
    });
    expect(attentes).toBeGreaterThanOrEqual(2);
    expect(ecrivain.demandes).toEqual([
      {
        branche: "photos/basilic-20261104-1432",
        titre: "Ajouter 2 photos à plantes/basilic.md",
      },
    ]);
    expect(ecrivain.fusionAutomatique).toHaveLength(1);
  });

  it("dit chaque étape : envoyé, converti, vérifié, fusionné", async () => {
    const { suivis, fin } = await poster({
      demande: ["controles-en-cours", "verifiee", "fusionnee"],
    });
    expect(suivis.map((s) => s.enCours).filter(Boolean)).toEqual(
      expect.arrayContaining(["envoi", "conversion", "verification", "fusion"]),
    );
    expect(fin).toEqual({
      faites: ["envoi", "conversion", "verification", "fusion"],
      aMettreAJour: false,
      demande: "https://github.test/pull/1",
    });
  });

  it("dit qu'une demande attend d'être mise à jour, puis reprend", async () => {
    const { suivis, fin } = await poster({
      demande: ["a-mettre-a-jour", "verifiee", "fusionnee"],
    });
    expect(suivis.some((s) => s.aMettreAJour)).toBe(true);
    expect(fin.faites).toContain("fusion");
    expect(fin.aMettreAJour).toBe(false);
  });

  describe("quand ça se passe mal, la photo n'atteint pas la branche par défaut", () => {
    it("jeton refusé : rien n'est créé", async () => {
      const { ecrivain, fin } = await poster({
        refus: { lireFicheSurLaBase: new EcritureRefusee("jeton-refuse") },
      });
      expect(ecrivain.commits).toEqual([]);
      expect(fin.echec).toEqual({ raison: "jeton-refuse" });
      expect(fin.enCours).toBe("envoi");
    });

    it("fiche que le site ne sait pas compléter : rien n'est créé", async () => {
      const { ecrivain, fin } = await poster(
        {},
        {
          "plantes/basilic.md": fiche("id: basilic\nphotos: medias/a.jpg"),
        },
      );
      expect(ecrivain.commits).toEqual([]);
      expect(fin.echec?.raison).toBe("fiche-non-modifiable");
    });

    it("fiche absente de la branche par défaut : rien n'est créé", async () => {
      const { ecrivain, fin } = await poster({}, {});
      expect(ecrivain.commits).toEqual([]);
      expect(fin.echec).toEqual({ raison: "fiche-absente" });
    });

    it("conversion qui échoue : le lien de l'Action, et aucune demande", async () => {
      const { ecrivain, fin } = await poster({
        conversion: [{ etat: "echouee", adresse: "https://github.test/run/7" }],
      });
      expect(ecrivain.demandes).toEqual([]);
      expect(fin.echec).toEqual({
        raison: "conversion-echouee",
        adresse: "https://github.test/run/7",
      });
      expect(fin.faites).toEqual(["envoi"]);
    });

    it("dépôt sans conversion : aucune demande", async () => {
      const { ecrivain, fin } = await poster({
        conversion: [{ etat: "absente" }],
      });
      expect(ecrivain.demandes).toEqual([]);
      expect(fin.echec).toEqual({ raison: "conversion-absente" });
    });

    it("conversion qui tarde : le site cesse d'attendre et donne le lien de l'Action", async () => {
      const { ecrivain, fin } = await poster({
        conversion: [
          { etat: "en-attente", adresse: "https://github.test/run/8" },
        ],
      });
      expect(ecrivain.demandes).toEqual([]);
      expect(fin.echec).toEqual({
        raison: "conversion-trop-longue",
        adresse: "https://github.test/run/8",
      });
    });

    it("contrôles rouges : le lien de la demande, qui reste ouverte", async () => {
      const { fin } = await poster({
        demande: ["controles-en-cours", "controles-rouges"],
      });
      expect(fin.echec).toEqual({
        raison: "controles-rouges",
        adresse: "https://github.test/pull/1",
      });
      expect(fin.faites).toEqual(["envoi", "conversion"]);
    });

    it("fusion automatique refusée par le dépôt : le lien de la demande", async () => {
      const { fin } = await poster({
        refus: {
          demanderLaFusionAutomatique: new EcritureRefusee(
            "fusion-automatique-refusee",
          ),
        },
      });
      expect(fin.echec).toEqual({
        raison: "fusion-automatique-refusee",
        adresse: "https://github.test/pull/1",
      });
    });

    it("demande qui ne se fusionne pas : le site cesse d'attendre et donne son lien", async () => {
      const { fin } = await poster({ demande: ["verifiee"] });
      expect(fin.echec).toEqual({
        raison: "fusion-trop-longue",
        adresse: "https://github.test/pull/1",
      });
      expect(fin.enCours).toBe("fusion");
    });
  });
});
