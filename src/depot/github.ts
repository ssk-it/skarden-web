// L'adaptateur GitHub de la frontière (ADR-lecture-des-fiches-dans-le-navigateur). Les portes retenues, mesurées le 2026-10-26 :
// - l'API pour le commit de la branche par défaut et l'arbre de ce commit : deux appels au plus par visite, un seul si le commit est déjà lu ;
// - raw.githubusercontent.com au SHA du commit pour le contenu d'un dépôt public : hors de la limite de l'API, mais il refuse l'en-tête Authorization ;
// - l'API `contents` pour le contenu quand il y a un jeton ;
// - media.githubusercontent.com pour une photo LFS, raw ne rendant que son pointeur.

import type { CacheParEmpreinte } from "./cache";
import {
  DepotIllisible,
  FichierIntrouvable,
  PhotoIndisponible,
  type DepotDesigne,
  type FichierDuDepot,
  type LecteurDuDepot,
} from "./lecteur";

export interface OptionsGithub {
  jeton?: string;
  cache: CacheParEmpreinte;
  fetch?: typeof globalThis.fetch;
}

const ENTETE_LFS = "version https://git-lfs.github.com/spec/";
// Un pointeur LFS fait 130 octets environ ; au-delà, le fichier est la photo elle-même.
const TAILLE_MAX_POINTEUR = 1024;

export async function ouvrirDepotGithub(
  { proprietaire, depot }: DepotDesigne,
  { jeton, cache, fetch = globalThis.fetch.bind(globalThis) }: OptionsGithub,
): Promise<LecteurDuDepot> {
  const api = `https://api.github.com/repos/${proprietaire}/${depot}`;
  const entetes = (accept: string): Record<string, string> =>
    jeton
      ? { Accept: accept, Authorization: `Bearer ${jeton}` }
      : { Accept: accept };

  const appeler = async (
    url: string,
    accept = "application/vnd.github+json",
  ) => {
    let reponse: Response;
    try {
      reponse = await fetch(url, { headers: entetes(accept) });
    } catch {
      throw new DepotIllisible("reseau");
    }
    if (!reponse.ok) throw raisonDeLEchec(reponse, Boolean(jeton));
    return reponse;
  };

  const commit = (await (await appeler(`${api}/commits/HEAD`)).json()) as {
    sha: string;
    commit: { tree: { sha: string } };
  };
  const cleArbre = `arbre-${commit.commit.tree.sha}`;
  const fichiers = await lireArbre(cleArbre, () =>
    appeler(`${api}/git/trees/${commit.commit.tree.sha}?recursive=1`),
  );

  // Hors du chemin critique : un échec d'effacement ne doit pas empêcher de lire.
  void cache
    .conserverSeulement(
      new Set([cleArbre, ...fichiers.map((f) => f.empreinte)]),
    )
    .catch(() => undefined);

  const empreinteDe = (chemin: string) => {
    const fichier = fichiers.find((f) => f.chemin === chemin);
    if (!fichier) throw new FichierIntrouvable(chemin);
    return fichier.empreinte;
  };

  const chemin = (c: string) => c.split("/").map(encodeURIComponent).join("/");
  const telechargerContenu = (c: string) =>
    jeton
      ? appeler(
          `${api}/contents/${chemin(c)}?ref=${commit.sha}`,
          "application/vnd.github.raw+json",
        )
      : appeler(
          `https://raw.githubusercontent.com/${proprietaire}/${depot}/${commit.sha}/${chemin(c)}`,
        );

  const parEmpreinte = async (c: string, telecharger: () => Promise<Blob>) => {
    const empreinte = empreinteDe(c);
    const garde = await cache.lire(empreinte);
    if (garde) return garde;
    const contenu = await telecharger();
    await cache.ecrire(empreinte, contenu);
    return contenu;
  };

  return {
    fichiers,
    lireTexte: async (c) =>
      (
        await parEmpreinte(c, async () => (await telechargerContenu(c)).blob())
      ).text(),
    // L'empreinte d'un pointeur LFS désigne son `oid` sans ambiguïté : garder la photo sous l'empreinte du pointeur, c'est la garder sous son `oid`, sans relire le pointeur pour l'apprendre.
    lirePhoto: (c) =>
      parEmpreinte(c, async () => {
        try {
          const brut = await (await telechargerContenu(c)).blob();
          if (
            brut.size > TAILLE_MAX_POINTEUR ||
            !(await brut.text()).startsWith(ENTETE_LFS)
          )
            return brut;
          return await (
            await appeler(
              `https://media.githubusercontent.com/media/${proprietaire}/${depot}/${commit.sha}/${chemin(c)}`,
              "*/*",
            )
          ).blob();
        } catch {
          throw new PhotoIndisponible(c);
        }
      }),
  };

  async function lireArbre(
    cle: string,
    telecharger: () => Promise<Response>,
  ): Promise<FichierDuDepot[]> {
    const garde = await cache.lire(cle);
    if (garde) return JSON.parse(await garde.text()) as FichierDuDepot[];
    const { tree } = (await (await telecharger()).json()) as {
      tree: { path: string; type: string; sha: string }[];
    };
    const liste = tree
      .filter((entree) => entree.type === "blob")
      .map((entree) => ({ chemin: entree.path, empreinte: entree.sha }));
    await cache.ecrire(cle, new Blob([JSON.stringify(liste)]));
    return liste;
  }
}

function raisonDeLEchec(reponse: Response, avecJeton: boolean): DepotIllisible {
  const reset = reponse.headers.get("x-ratelimit-reset");
  if (
    (reponse.status === 403 || reponse.status === 429) &&
    reponse.headers.get("x-ratelimit-remaining") === "0"
  ) {
    return new DepotIllisible(
      "limite-atteinte",
      reset ? new Date(Number(reset) * 1000) : undefined,
    );
  }
  if (reponse.status === 401 || (reponse.status === 403 && avecJeton))
    return new DepotIllisible("jeton-refuse");
  // Sans jeton, GitHub répond 404 aussi pour un dépôt privé : le message le dit.
  if (reponse.status === 404) return new DepotIllisible("introuvable");
  return new DepotIllisible("reseau");
}
