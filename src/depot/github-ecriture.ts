// L'adaptateur GitHub de la frontière d'écriture (ADR-photos-postees-par-une-branche). Le navigateur ne peut pas déposer un objet LFS, l'API LFS refusant sa prévolée : la photo part telle quelle par l'API REST, sur une branche que l'Action `photos-en-lfs.yml` du dépôt convertit. Ce qu'on lit d'elle suit le contrat de `docs/pratiques.md` de skarden, « Une photo postée depuis le site ».
// RG-jeton-d-un-depot-prive : le jeton d'écriture ne part que vers api.github.com, dans un en-tête. Il sert à tout l'envoi, suivi compris : sans jeton, l'API n'admet que 60 appels par heure.

import {
  EcritureRefusee,
  type DemandeDeFusion,
  type EcrivainDuDepot,
  type EtatDeLaDemande,
  type SuiviDeLaDemande,
} from "./ecrivain";
import { FichierIntrouvable, type DepotDesigne } from "./lecteur";

export interface OptionsGithubEcriture {
  fetch?: typeof globalThis.fetch;
}

const CONVERSION = "photos-en-lfs.yml";
const CONCLUSIONS_VERTES = ["success", "skipped", "neutral"];

export function ecrivainGithub(
  { proprietaire, depot }: DepotDesigne,
  jeton: string,
  { fetch = globalThis.fetch.bind(globalThis) }: OptionsGithubEcriture = {},
): EcrivainDuDepot {
  const api = `https://api.github.com/repos/${proprietaire}/${depot}`;

  const appeler = async (
    url: string,
    {
      method = "GET",
      corps,
      accept = "application/vnd.github+json",
    }: { method?: string; corps?: unknown; accept?: string } = {},
  ) => {
    let reponse: Response;
    try {
      reponse = await fetch(url, {
        method,
        headers: { Accept: accept, Authorization: `Bearer ${jeton}` },
        body: corps === undefined ? undefined : JSON.stringify(corps),
      });
    } catch {
      throw new EcritureRefusee("reseau");
    }
    if (reponse.status === 401 || reponse.status === 403)
      throw new EcritureRefusee("jeton-refuse");
    return reponse;
  };
  const json = async <T>(
    url: string,
    options?: Parameters<typeof appeler>[1],
  ): Promise<T> => {
    const reponse = await appeler(url, options);
    if (!reponse.ok)
      throw new EcritureRefusee(
        "refusee",
        `GitHub a répondu ${reponse.status}`,
      );
    return (await reponse.json()) as T;
  };

  let brancheParDefaut: Promise<string> | undefined;
  // La branche par défaut, et le droit d'écrire, se lisent une fois : un jeton qui ne peut pas écrire est refusé avant que rien ne soit créé.
  const lireBrancheParDefaut = () =>
    (brancheParDefaut ??= json<{
      default_branch: string;
      permissions?: { push?: boolean };
    }>(api).then((d) => {
      if (d.permissions?.push === false)
        throw new EcritureRefusee("jeton-refuse");
      return d.default_branch;
    }));

  const chemin = (c: string) => c.split("/").map(encodeURIComponent).join("/");

  // L'étape que l'Action exécute, pour dire où elle en est ; un détail, que l'envoi n'attend pas : faute de la lire, il s'en passe.
  const etapeEnCours = async (run: number) => {
    try {
      const { jobs } = await json<{
        jobs: { status: string; steps?: { name: string; status: string }[] }[];
      }>(`${api}/actions/runs/${run}/jobs`);
      return jobs
        .flatMap((job) => job.steps ?? [])
        .find((etape) => etape.status === "in_progress")?.name;
    } catch {
      return undefined;
    }
  };

  return {
    async lireFicheSurLaBase(c) {
      const branche = await lireBrancheParDefaut();
      const { object } = await json<{ object: { sha: string } }>(
        `${api}/git/ref/heads/${chemin(branche)}`,
      );
      const reponse = await appeler(
        `${api}/contents/${chemin(c)}?ref=${object.sha}`,
        {
          accept: "application/vnd.github.raw+json",
        },
      );
      if (reponse.status === 404) throw new FichierIntrouvable(c);
      if (!reponse.ok)
        throw new EcritureRefusee(
          "refusee",
          `GitHub a répondu ${reponse.status}`,
        );
      return { texte: await reponse.text(), base: object.sha };
    },

    async commiterSurUneBranche({ branche, base, message, fichiers }) {
      // Un blob après l'autre : l'API de GitHub limite les créations simultanées.
      const arbre = [];
      for (const { chemin: path, contenu } of fichiers) {
        const { sha } = await json<{ sha: string }>(`${api}/git/blobs`, {
          method: "POST",
          corps:
            typeof contenu === "string"
              ? { content: contenu, encoding: "utf-8" }
              : { content: await enBase64(contenu), encoding: "base64" },
        });
        arbre.push({ path, mode: "100644", type: "blob", sha });
      }
      const commitDeBase = await json<{ tree: { sha: string } }>(
        `${api}/git/commits/${base}`,
      );
      const { sha: tree } = await json<{ sha: string }>(`${api}/git/trees`, {
        method: "POST",
        corps: { base_tree: commitDeBase.tree.sha, tree: arbre },
      });
      const { sha } = await json<{ sha: string }>(`${api}/git/commits`, {
        method: "POST",
        corps: { message, tree, parents: [base] },
      });
      await json(`${api}/git/refs`, {
        method: "POST",
        corps: { ref: `refs/heads/${branche}`, sha },
      });
      return sha;
    },

    async conversion(branche, commit) {
      const parametres = new URLSearchParams({
        event: "push",
        branch: branche,
        head_sha: commit,
      });
      const reponse = await appeler(
        `${api}/actions/workflows/${CONVERSION}/runs?${parametres}`,
      );
      if (reponse.status === 404) return { etat: "absente" };
      if (!reponse.ok)
        throw new EcritureRefusee(
          "refusee",
          `GitHub a répondu ${reponse.status}`,
        );
      const { workflow_runs } = (await reponse.json()) as {
        workflow_runs: {
          id: number;
          status: string;
          conclusion: string | null;
          html_url: string;
        }[];
      };
      const [run] = workflow_runs;
      if (!run) return { etat: "en-attente" };
      if (run.status !== "in_progress" && run.status !== "completed")
        return { etat: "en-attente", adresse: run.html_url, statut: "en-file" };
      if (run.status === "in_progress") {
        const etape = await etapeEnCours(run.id);
        return {
          etat: "en-attente",
          adresse: run.html_url,
          statut: "en-cours",
          ...(etape && { etape }),
        };
      }
      return run.conclusion === "success"
        ? { etat: "reussie" }
        : { etat: "echouee", adresse: run.html_url };
    },

    async ouvrirDemande({ branche, titre, corps }) {
      const base = await lireBrancheParDefaut();
      const demande = await json<{
        number: number;
        html_url: string;
        node_id: string;
      }>(`${api}/pulls`, {
        method: "POST",
        corps: { title: titre, body: corps, head: branche, base },
      });
      return {
        numero: demande.number,
        adresse: demande.html_url,
        id: demande.node_id,
      };
    },

    async demanderLaFusionAutomatique(demande: DemandeDeFusion) {
      const { errors } = await json<{ errors?: { message: string }[] }>(
        "https://api.github.com/graphql",
        {
          method: "POST",
          corps: {
            query:
              "mutation($id: ID!) { enablePullRequestAutoMerge(input: { pullRequestId: $id }) { clientMutationId } }",
            variables: { id: demande.id },
          },
        },
      );
      if (!errors?.length) return;
      // GitHub refuse la fusion automatique d'une demande déjà prête : elle se fusionne alors aussitôt.
      if (errors.some((e) => /clean status/i.test(e.message))) {
        await json(`${api}/pulls/${demande.numero}/merge`, {
          method: "PUT",
          corps: {},
        });
        return;
      }
      throw new EcritureRefusee(
        "fusion-automatique-refusee",
        errors.map((e) => e.message).join(" ; "),
      );
    },

    async etatDeLaDemande(demande): Promise<SuiviDeLaDemande> {
      const pr = await json<{
        merged: boolean;
        mergeable_state: string;
        head: { sha: string };
      }>(`${api}/pulls/${demande.numero}`);
      if (pr.merged) return { etat: "fusionnee" };
      const { check_runs } = await json<{
        check_runs: { status: string; conclusion: string | null }[];
      }>(`${api}/commits/${pr.head.sha}/check-runs?per_page=100`);
      const controles = {
        finis: check_runs.filter((c) => c.status === "completed").length,
        total: check_runs.length,
      };
      const etat = ((): EtatDeLaDemande => {
        if (
          check_runs.some(
            (c) =>
              c.status === "completed" &&
              !CONCLUSIONS_VERTES.includes(c.conclusion ?? ""),
          )
        )
          return "controles-rouges";
        if (pr.mergeable_state === "behind") return "a-mettre-a-jour";
        if (controles.total && controles.finis === controles.total)
          return "verifiee";
        return "controles-en-cours";
      })();
      return { etat, controles };
    },
  };
}

async function enBase64(contenu: Blob): Promise<string> {
  const octets = new Uint8Array(await contenu.arrayBuffer());
  let binaire = "";
  // Par tranches : `String.fromCharCode` ne prend pas un million d'arguments.
  for (let i = 0; i < octets.length; i += 0x8000)
    binaire += String.fromCharCode(...octets.subarray(i, i + 0x8000));
  return btoa(binaire);
}
