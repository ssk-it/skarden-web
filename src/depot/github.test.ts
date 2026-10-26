import { describe, expect, it } from "vitest";
import { cacheEnMemoire } from "./cache";
import { ouvrirDepotGithub } from "./github";
import { DepotIllisible, PhotoIndisponible } from "./lecteur";

const COMMIT = "c0ffee";
const ARBRE = "a1b2c3";
const POINTEUR =
  "version https://git-lfs.github.com/spec/v1\noid sha256:abc\nsize 3\n";

type Reponse = {
  status?: number;
  corps?: string;
  entetes?: Record<string, string>;
};

// Un faux GitHub : chaque URL appelée est consignée, et répond selon la table.
function fauxGithub(table: Record<string, Reponse>) {
  const appels: { url: string; entetes: Record<string, string> }[] = [];
  const fetch = async (url: string | URL | Request, init?: RequestInit) => {
    const adresse = String(url);
    appels.push({
      url: adresse,
      entetes: (init?.headers ?? {}) as Record<string, string>,
    });
    const reponse = table[adresse];
    if (!reponse) return new Response("", { status: 404 });
    return new Response(reponse.corps ?? "", {
      status: reponse.status ?? 200,
      headers: reponse.entetes,
    });
  };
  return { fetch: fetch as typeof globalThis.fetch, appels };
}

const API = "https://api.github.com/repos/sskorupski/skarden";
const RAW = `https://raw.githubusercontent.com/sskorupski/skarden/${COMMIT}`;
const MEDIA = `https://media.githubusercontent.com/media/sskorupski/skarden/${COMMIT}`;

const depotPublic: Record<string, Reponse> = {
  [`${API}/commits/HEAD`]: {
    corps: JSON.stringify({ sha: COMMIT, commit: { tree: { sha: ARBRE } } }),
  },
  [`${API}/git/trees/${ARBRE}?recursive=1`]: {
    corps: JSON.stringify({
      tree: [
        { path: "plantes", type: "tree", sha: "d1" },
        { path: "plantes/basilic.md", type: "blob", sha: "b1" },
        { path: "medias/basilic.jpg", type: "blob", sha: "p1" },
        { path: "medias/brute.png", type: "blob", sha: "p2" },
      ],
    }),
  },
  [`${RAW}/plantes/basilic.md`]: { corps: "---\nid: basilic\n---\n" },
  [`${RAW}/medias/basilic.jpg`]: { corps: POINTEUR },
  [`${MEDIA}/medias/basilic.jpg`]: { corps: "JPG" },
  [`${RAW}/medias/brute.png`]: { corps: "PNG-brut" },
};

const ouvrir = (
  fetch: typeof globalThis.fetch,
  jeton?: string,
  cache = cacheEnMemoire(),
) =>
  ouvrirDepotGithub(
    { proprietaire: "sskorupski", depot: "skarden" },
    { fetch, jeton, cache },
  );

describe("ouvrirDepotGithub", () => {
  it("liste les fichiers du commit de la branche par défaut, avec leur empreinte", async () => {
    const { fetch } = fauxGithub(depotPublic);
    const lecteur = await ouvrir(fetch);
    expect(lecteur.fichiers).toEqual([
      { chemin: "plantes/basilic.md", empreinte: "b1" },
      { chemin: "medias/basilic.jpg", empreinte: "p1" },
      { chemin: "medias/brute.png", empreinte: "p2" },
    ]);
  });

  it("lit une fiche publique sur raw, au SHA du commit, sans jeton", async () => {
    const { fetch, appels } = fauxGithub(depotPublic);
    const lecteur = await ouvrir(fetch);
    expect(await lecteur.lireTexte("plantes/basilic.md")).toBe(
      "---\nid: basilic\n---\n",
    );
    const appel = appels.find((a) => a.url.startsWith(RAW));
    expect(appel).toBeDefined();
    expect(appel?.entetes.Authorization).toBeUndefined();
  });

  it("lit un dépôt privé par l'API, avec le jeton, raw refusant l'en-tête Authorization", async () => {
    const { fetch, appels } = fauxGithub({
      ...depotPublic,
      [`${API}/contents/plantes/basilic.md?ref=${COMMIT}`]: { corps: "privé" },
    });
    const lecteur = await ouvrir(fetch, "jeton-secret");
    expect(await lecteur.lireTexte("plantes/basilic.md")).toBe("privé");
    expect(
      appels.every((a) => a.entetes.Authorization === "Bearer jeton-secret"),
    ).toBe(true);
    expect(appels.some((a) => a.url.startsWith("https://raw."))).toBe(false);
  });

  it("une visite sans changement ne coûte qu'un appel à l'API : l'arbre d'un commit déjà lu vient du cache", async () => {
    const cache = cacheEnMemoire();
    await ouvrir(fauxGithub(depotPublic).fetch, undefined, cache);
    const seconde = fauxGithub(depotPublic);
    await ouvrir(seconde.fetch, undefined, cache);
    expect(seconde.appels.map((a) => a.url)).toEqual([`${API}/commits/HEAD`]);
  });

  it("ne relit pas une fiche dont l'empreinte est déjà dans le cache", async () => {
    const cache = cacheEnMemoire();
    await (
      await ouvrir(fauxGithub(depotPublic).fetch, undefined, cache)
    ).lireTexte("plantes/basilic.md");
    const seconde = fauxGithub(depotPublic);
    const texte = await (
      await ouvrir(seconde.fetch, undefined, cache)
    ).lireTexte("plantes/basilic.md");
    expect(texte).toBe("---\nid: basilic\n---\n");
    expect(seconde.appels.some((a) => a.url.startsWith(RAW))).toBe(false);
  });

  it("efface du cache ce que le commit lu ne désigne plus", async () => {
    const cache = cacheEnMemoire();
    await cache.ecrire("perime", new Blob(["vieux"]));
    await ouvrir(fauxGithub(depotPublic).fetch, undefined, cache);
    expect(await cache.lire("perime")).toBeUndefined();
  });

  it("lit une photo LFS sur media.githubusercontent.com, raw ne rendant que son pointeur", async () => {
    const lecteur = await ouvrir(fauxGithub(depotPublic).fetch);
    expect(await (await lecteur.lirePhoto("medias/basilic.jpg")).text()).toBe(
      "JPG",
    );
  });

  it("rend telle quelle une photo qui n'est pas un pointeur LFS", async () => {
    const lecteur = await ouvrir(fauxGithub(depotPublic).fetch);
    expect(await (await lecteur.lirePhoto("medias/brute.png")).text()).toBe(
      "PNG-brut",
    );
  });

  it("ne télécharge une photo qu'une fois", async () => {
    const cache = cacheEnMemoire();
    await (
      await ouvrir(fauxGithub(depotPublic).fetch, undefined, cache)
    ).lirePhoto("medias/basilic.jpg");
    const seconde = fauxGithub(depotPublic);
    await (
      await ouvrir(seconde.fetch, undefined, cache)
    ).lirePhoto("medias/basilic.jpg");
    expect(seconde.appels.some((a) => a.url.startsWith(MEDIA))).toBe(false);
  });

  it("signale une photo indisponible, quota LFS dépassé par exemple", async () => {
    const { fetch } = fauxGithub({
      ...depotPublic,
      [`${MEDIA}/medias/basilic.jpg`]: { status: 403 },
    });
    const lecteur = await ouvrir(fetch);
    await expect(
      lecteur.lirePhoto("medias/basilic.jpg"),
    ).rejects.toBeInstanceOf(PhotoIndisponible);
  });

  it.each([
    [404, {}, undefined, "introuvable"],
    [401, {}, "jeton", "jeton-refuse"],
    [403, {}, "jeton", "jeton-refuse"],
    [
      403,
      { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1793016383" },
      undefined,
      "limite-atteinte",
    ],
    [
      429,
      { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1793016383" },
      undefined,
      "limite-atteinte",
    ],
    [500, {}, undefined, "reseau"],
  ])(
    "traduit une réponse %i de l'API en raison lisible",
    async (status, entetes, jeton, raison) => {
      const { fetch } = fauxGithub({
        [`${API}/commits/HEAD`]: { status, entetes },
      });
      const erreur = await ouvrir(fetch, jeton).catch((e: unknown) => e);
      expect(erreur).toBeInstanceOf(DepotIllisible);
      expect((erreur as DepotIllisible).raison).toBe(raison);
    },
  );

  it("dit quand la limite de l'API se lève", async () => {
    const { fetch } = fauxGithub({
      [`${API}/commits/HEAD`]: {
        status: 403,
        entetes: {
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": "1793016383",
        },
      },
    });
    const erreur = (await ouvrir(fetch).catch(
      (e: unknown) => e,
    )) as DepotIllisible;
    expect(erreur.leveeA).toEqual(new Date(1793016383 * 1000));
  });

  it("traduit une panne de réseau", async () => {
    const fetch = (async () => {
      throw new TypeError("Failed to fetch");
    }) as typeof globalThis.fetch;
    const erreur = await ouvrir(fetch).catch((e: unknown) => e);
    expect((erreur as DepotIllisible).raison).toBe("reseau");
  });
});
