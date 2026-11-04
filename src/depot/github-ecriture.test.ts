import { describe, expect, it } from "vitest";
import { EcritureRefusee } from "./ecrivain";
import { ecrivainGithub } from "./github-ecriture";
import { FichierIntrouvable } from "./lecteur";

const API = "https://api.github.com/repos/sskorupski/skarden";
const JETON = "github_pat_ecriture";

type Reponse = { status?: number; corps?: unknown };

// Un faux GitHub qui écrit : chaque appel est consigné avec sa méthode et son corps, et répond selon la table, indexée par « MÉTHODE adresse ».
function fauxGithub(
  table: Record<string, Reponse | ((corps: unknown) => Reponse)>,
) {
  const appels: {
    cle: string;
    entetes: Record<string, string>;
    corps?: unknown;
  }[] = [];
  const fetch = async (url: string | URL | Request, init?: RequestInit) => {
    const cle = `${init?.method ?? "GET"} ${String(url)}`;
    const corps = init?.body ? JSON.parse(String(init.body)) : undefined;
    appels.push({
      cle,
      entetes: (init?.headers ?? {}) as Record<string, string>,
      corps,
    });
    const entree = table[cle];
    const reponse = typeof entree === "function" ? entree(corps) : entree;
    if (!reponse) return new Response("", { status: 404 });
    const texte =
      typeof reponse.corps === "string"
        ? reponse.corps
        : JSON.stringify(reponse.corps ?? {});
    return new Response(texte, { status: reponse.status ?? 200 });
  };
  return { fetch: fetch as typeof globalThis.fetch, appels };
}

const ecrivain = (table: Parameters<typeof fauxGithub>[0]) => {
  const faux = fauxGithub(table);
  return {
    ...faux,
    ecrivain: ecrivainGithub(
      { proprietaire: "sskorupski", depot: "skarden" },
      JETON,
      { fetch: faux.fetch },
    ),
  };
};

const DEPOT = {
  [`GET ${API}`]: {
    corps: { default_branch: "main", permissions: { push: true } },
  },
  [`GET ${API}/git/ref/heads/main`]: { corps: { object: { sha: "base-1" } } },
  [`GET ${API}/contents/plantes/basilic.md?ref=base-1`]: {
    corps: "---\nid: basilic\n---\n",
  },
};

describe("l'écriture dans un dépôt GitHub", () => {
  // RG-jeton-d-un-depot-prive : le jeton d'écriture ne part que vers api.github.com, dans un en-tête, jamais dans une adresse.
  it("lit la fiche à la tête de la branche par défaut, avec le jeton d'écriture", async () => {
    const { ecrivain: e, appels } = ecrivain(DEPOT);
    expect(await e.lireFicheSurLaBase("plantes/basilic.md")).toEqual({
      texte: "---\nid: basilic\n---\n",
      base: "base-1",
    });
    for (const appel of appels) {
      expect(appel.cle).toMatch(/^GET https:\/\/api\.github\.com\//);
      expect(appel.cle).not.toContain(JETON);
      expect(appel.entetes.Authorization).toBe(`Bearer ${JETON}`);
    }
  });

  it("refuse, avant de rien créer, un jeton sans droit d'écriture", async () => {
    const { ecrivain: e } = ecrivain({
      ...DEPOT,
      [`GET ${API}`]: {
        corps: { default_branch: "main", permissions: { push: false } },
      },
    });
    await expect(e.lireFicheSurLaBase("plantes/basilic.md")).rejects.toEqual(
      new EcritureRefusee("jeton-refuse"),
    );
  });

  it.each([401, 403])(
    "dit refusé un jeton auquel GitHub répond %i",
    async (status) => {
      const { ecrivain: e } = ecrivain({ [`GET ${API}`]: { status } });
      await expect(
        e.lireFicheSurLaBase("plantes/basilic.md"),
      ).rejects.toMatchObject({
        raison: "jeton-refuse",
      });
    },
  );

  it("dit absente une fiche que la branche par défaut n'a pas", async () => {
    const { ecrivain: e } = ecrivain({
      ...DEPOT,
      [`GET ${API}/contents/plantes/basilic.md?ref=base-1`]: { status: 404 },
    });
    await expect(
      e.lireFicheSurLaBase("plantes/basilic.md"),
    ).rejects.toBeInstanceOf(FichierIntrouvable);
  });

  it("commite photos et fiche en un seul commit, sur une branche neuve partie de la base", async () => {
    let blobs = 0;
    const { ecrivain: e, appels } = ecrivain({
      [`POST ${API}/git/blobs`]: () => ({
        status: 201,
        corps: { sha: `blob-${++blobs}` },
      }),
      [`GET ${API}/git/commits/base-1`]: {
        corps: { tree: { sha: "arbre-base" } },
      },
      [`POST ${API}/git/trees`]: { status: 201, corps: { sha: "arbre-1" } },
      [`POST ${API}/git/commits`]: { status: 201, corps: { sha: "commit-1" } },
      [`POST ${API}/git/refs`]: { status: 201, corps: {} },
    });
    const sha = await e.commiterSurUneBranche({
      branche: "photos/basilic-20261104-1432",
      base: "base-1",
      message: "Ajouter 1 photo à plantes/basilic.md",
      fichiers: [
        {
          chemin: "medias/plantes/basilic-20261104-1432-1.jpg",
          contenu: new Blob([new Uint8Array([0xff, 0xd8, 0xff])]),
        },
        { chemin: "plantes/basilic.md", contenu: "---\nid: basilic\n---\n" },
      ],
    });
    expect(sha).toBe("commit-1");
    const corps = (cle: string) =>
      appels.filter((a) => a.cle === cle).map((a) => a.corps);
    expect(corps(`POST ${API}/git/blobs`)).toEqual([
      { content: "/9j/", encoding: "base64" },
      { content: "---\nid: basilic\n---\n", encoding: "utf-8" },
    ]);
    expect(corps(`POST ${API}/git/trees`)).toEqual([
      {
        base_tree: "arbre-base",
        tree: [
          {
            path: "medias/plantes/basilic-20261104-1432-1.jpg",
            mode: "100644",
            type: "blob",
            sha: "blob-1",
          },
          {
            path: "plantes/basilic.md",
            mode: "100644",
            type: "blob",
            sha: "blob-2",
          },
        ],
      },
    ]);
    expect(corps(`POST ${API}/git/commits`)).toEqual([
      {
        message: "Ajouter 1 photo à plantes/basilic.md",
        tree: "arbre-1",
        parents: ["base-1"],
      },
    ]);
    expect(corps(`POST ${API}/git/refs`)).toEqual([
      { ref: "refs/heads/photos/basilic-20261104-1432", sha: "commit-1" },
    ]);
  });

  describe("la conversion, lue sur le run de photos-en-lfs.yml qui porte le commit du site", () => {
    const RUNS = `GET ${API}/actions/workflows/photos-en-lfs.yml/runs?event=push&branch=photos%2Fbasilic-1&head_sha=commit-1`;
    const lire = (reponse: Reponse) =>
      ecrivain({ [RUNS]: reponse }).ecrivain.conversion(
        "photos/basilic-1",
        "commit-1",
      );

    it("attend tant que GitHub n'a pas créé le run", async () => {
      expect(await lire({ corps: { workflow_runs: [] } })).toEqual({
        etat: "en-attente",
      });
    });

    it("attend un run en cours, dont elle garde le lien", async () => {
      expect(
        await lire({
          corps: {
            workflow_runs: [
              {
                status: "in_progress",
                conclusion: null,
                html_url: "https://github.com/run/1",
              },
            ],
          },
        }),
      ).toEqual({ etat: "en-attente", adresse: "https://github.com/run/1" });
    });

    it("réussit sur un run réussi", async () => {
      expect(
        await lire({
          corps: {
            workflow_runs: [
              { status: "completed", conclusion: "success", html_url: "u" },
            ],
          },
        }),
      ).toEqual({ etat: "reussie" });
    });

    it("échoue sur toute autre conclusion, avec le lien du run", async () => {
      expect(
        await lire({
          corps: {
            workflow_runs: [
              {
                status: "completed",
                conclusion: "failure",
                html_url: "https://github.com/run/2",
              },
            ],
          },
        }),
      ).toEqual({ etat: "echouee", adresse: "https://github.com/run/2" });
    });

    it("dit absente une conversion que le dépôt ne déclare pas", async () => {
      expect(await lire({ status: 404 })).toEqual({ etat: "absente" });
    });
  });

  it("ouvre la demande de fusion sur la branche convertie, vers la branche par défaut", async () => {
    const { ecrivain: e, appels } = ecrivain({
      ...DEPOT,
      [`POST ${API}/pulls`]: {
        status: 201,
        corps: {
          number: 42,
          html_url: "https://github.com/pull/42",
          node_id: "PR_42",
        },
      },
    });
    expect(
      await e.ouvrirDemande({
        branche: "photos/basilic-1",
        titre: "T",
        corps: "C",
      }),
    ).toEqual({
      numero: 42,
      adresse: "https://github.com/pull/42",
      id: "PR_42",
    });
    expect(appels.find((a) => a.cle === `POST ${API}/pulls`)?.corps).toEqual({
      title: "T",
      body: "C",
      head: "photos/basilic-1",
      base: "main",
    });
  });

  describe("la fusion automatique", () => {
    const DEMANDE = {
      numero: 42,
      adresse: "https://github.com/pull/42",
      id: "PR_42",
    };
    const GRAPHQL = "POST https://api.github.com/graphql";

    it("se demande par GraphQL, sur l'identifiant de la demande", async () => {
      const { ecrivain: e, appels } = ecrivain({
        [GRAPHQL]: { corps: { data: {} } },
      });
      await e.demanderLaFusionAutomatique(DEMANDE);
      const corps = appels[0]?.corps as { query: string; variables: unknown };
      expect(corps.query).toContain("enablePullRequestAutoMerge");
      expect(corps.variables).toEqual({ id: "PR_42" });
    });

    it("fusionne aussitôt une demande déjà prête, que la fusion automatique refuse", async () => {
      const { ecrivain: e, appels } = ecrivain({
        [GRAPHQL]: {
          corps: { errors: [{ message: "Pull request is in clean status" }] },
        },
        [`PUT ${API}/pulls/42/merge`]: { corps: { merged: true } },
      });
      await e.demanderLaFusionAutomatique(DEMANDE);
      expect(appels.map((a) => a.cle)).toContain(`PUT ${API}/pulls/42/merge`);
    });

    it("dit refusée la fusion automatique qu'un dépôt ne permet pas", async () => {
      const { ecrivain: e } = ecrivain({
        [GRAPHQL]: {
          corps: {
            errors: [
              {
                message:
                  "Pull request Auto merge is not allowed for this repository",
              },
            ],
          },
        },
      });
      await expect(
        e.demanderLaFusionAutomatique(DEMANDE),
      ).rejects.toMatchObject({ raison: "fusion-automatique-refusee" });
    });
  });

  describe("l'état de la demande", () => {
    const DEMANDE = { numero: 42, adresse: "u", id: "PR_42" };
    const lire = (pr: unknown, controles: unknown[] = []) =>
      ecrivain({
        [`GET ${API}/pulls/42`]: { corps: pr },
        [`GET ${API}/commits/tete/check-runs?per_page=100`]: {
          corps: { check_runs: controles },
        },
      }).ecrivain.etatDeLaDemande(DEMANDE);
    const ouverte = {
      merged: false,
      mergeable_state: "blocked",
      head: { sha: "tete" },
    };

    it("fusionnée", async () => {
      expect(await lire({ ...ouverte, merged: true })).toBe("fusionnee");
    });
    it("contrôles en cours", async () => {
      expect(
        await lire(ouverte, [{ status: "in_progress", conclusion: null }]),
      ).toBe("controles-en-cours");
    });
    it("vérifiée quand tous les contrôles sont verts", async () => {
      expect(
        await lire(ouverte, [
          { status: "completed", conclusion: "success" },
          { status: "completed", conclusion: "skipped" },
        ]),
      ).toBe("verifiee");
    });
    it("contrôles rouges", async () => {
      expect(
        await lire(ouverte, [
          { status: "completed", conclusion: "success" },
          { status: "completed", conclusion: "failure" },
        ]),
      ).toBe("controles-rouges");
    });
    it("à mettre à jour quand la branche par défaut a avancé", async () => {
      expect(
        await lire({ ...ouverte, mergeable_state: "behind" }, [
          { status: "completed", conclusion: "success" },
        ]),
      ).toBe("a-mettre-a-jour");
    });
  });
});
