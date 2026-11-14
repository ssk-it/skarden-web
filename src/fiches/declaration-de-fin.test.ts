import { describe, expect, it } from "vitest";
import { EcritureRefusee } from "../depot/ecrivain";
import {
  ecrivainEnMemoire,
  type ScenarioDEcriture,
} from "../depot/ecrivain-en-memoire";
import { declarerFinDePhase } from "./declaration-de-fin";
import type { Suivi } from "./ecriture-par-demande";

const CHEMIN = "realisations/2026-11-08-liqueur-hibiscus.md";
const FICHE = `---
id: 2026-11-08-liqueur-hibiscus
nom: Liqueur d'hibiscus
statut: en-cours
debut: 2026-11-08
phases:
  - id: maceration
    debut: 2026-11-08
    nombre: 1
---
`;

async function declarer(
  scenario: ScenarioDEcriture = {},
  contenus: Record<string, string> = { [CHEMIN]: FICHE },
) {
  const ecrivain = ecrivainEnMemoire(contenus, scenario);
  const suivis: Suivi[] = [];
  const fin = await declarerFinDePhase(
    ecrivain,
    {
      dossier: "realisations",
      journal: "journal",
      fichier: "2026-11-08-liqueur-hibiscus",
      phase: "maceration",
      libelle: "Macération",
      fin: "2026-11-20T10:15",
      remarque: "Filtrée au café.",
    },
    (suivi) => suivis.push(suivi),
    {
      maintenant: new Date(2026, 10, 20, 10, 17),
      attendre: async () => {},
      horloge: () => 0,
    },
  );
  return { ecrivain, suivis, fin };
}

describe("declarerFinDePhase", () => {
  it("écrit la fin et l'entrée du journal en un seul commit, puis fusionne sans conversion", async () => {
    const { ecrivain, fin } = await declarer();
    expect(ecrivain.commits).toHaveLength(1);
    const [commit] = ecrivain.commits;
    expect(commit?.branche).toBe(
      "phases/2026-11-08-liqueur-hibiscus-maceration-20261120-1017",
    );
    expect(commit?.base).toBe("main-1");
    expect(commit?.fichiers.map((f) => f.chemin)).toEqual([
      CHEMIN,
      "journal/2026/2026-11-20-liqueur-hibiscus-fin-de-maceration.md",
    ]);
    expect(commit?.fichiers[0]?.contenu).toContain(
      "    debut: 2026-11-08\n    fin: 2026-11-20T10:15\n",
    );
    expect(commit?.fichiers[1]?.contenu).toContain("phase: maceration");
    expect(ecrivain.demandes).toEqual([
      {
        branche: commit?.branche,
        titre:
          "Déclarer la fin de la phase maceration de 2026-11-08-liqueur-hibiscus",
      },
    ]);
    expect(ecrivain.fusionAutomatique).toHaveLength(1);
    expect(fin.faites).toEqual(["envoi", "verification", "fusion"]);
    expect(fin.echec).toBeUndefined();
  });

  it("n'écrit rien quand la phase est déjà close sur la base", async () => {
    const { ecrivain, fin } = await declarer(
      {},
      {
        [CHEMIN]: FICHE.replace(
          "    debut: 2026-11-08\n",
          "    debut: 2026-11-08\n    fin: 2026-11-19T08:00\n",
        ),
      },
    );
    expect(ecrivain.commits).toEqual([]);
    expect(fin.echec).toEqual({
      raison: "phase-deja-close",
      fin: "2026-11-19T08:00",
    });
  });

  it("n'écrit rien quand une déclaration de la même phase attend sa fusion", async () => {
    const { ecrivain, fin } = await declarer({
      branches: [
        {
          branche:
            "phases/2026-11-08-liqueur-hibiscus-maceration-20261119-2200",
          demande: "https://github.test/pull/7",
        },
      ],
    });
    expect(ecrivain.commits).toEqual([]);
    expect(fin.echec).toEqual({
      raison: "declaration-en-attente",
      adresse: "https://github.test/pull/7",
    });
  });

  it("ne confond pas la déclaration d'une autre phase", async () => {
    const { fin } = await declarer({
      branches: [
        { branche: "phases/2026-11-08-liqueur-hibiscus-repos-20261119-2200" },
      ],
    });
    expect(fin.echec).toBeUndefined();
  });

  it("dit un jeton refusé, sans rien créer", async () => {
    const { ecrivain, fin } = await declarer({
      refus: { lireFicheSurLaBase: new EcritureRefusee("jeton-refuse") },
    });
    expect(ecrivain.commits).toEqual([]);
    expect(fin.echec).toEqual({ raison: "jeton-refuse" });
  });

  it("dit des contrôles rouges, avec la demande de fusion", async () => {
    const { fin } = await declarer({ demande: ["controles-rouges"] });
    expect(fin.echec).toEqual({
      raison: "controles-rouges",
      adresse: "https://github.test/pull/1",
    });
  });
});
