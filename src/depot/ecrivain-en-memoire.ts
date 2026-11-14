import {
  type BrancheEnAttente,
  type DemandeDeFusion,
  type EcrivainDuDepot,
  type EcritureRefusee,
  type EtatDeLaConversion,
  type EtatDeLaDemande,
  type FichierEcrit,
  type SuiviDeLaDemande,
} from "./ecrivain";
import { FichierIntrouvable } from "./lecteur";

export interface ScenarioDEcriture {
  // Ce que rendent les lectures successives ; la dernière se répète.
  conversion?: EtatDeLaConversion[];
  demande?: (EtatDeLaDemande | SuiviDeLaDemande)[];
  refus?: Partial<Record<keyof EcrivainDuDepot, EcritureRefusee>>;
  // Les branches déjà poussées, avec leur demande de fusion ouverte s'il y en a une.
  branches?: BrancheEnAttente[];
}

export interface CommitEnMemoire {
  branche: string;
  base: string;
  message: string;
  fichiers: FichierEcrit[];
}

// Un dépôt tenu en mémoire, pour les tests de l'envoi : la branche par défaut a pour tête `main-1`, et chaque écriture est consignée.
export function ecrivainEnMemoire(
  contenus: Record<string, string>,
  scenario: ScenarioDEcriture = {},
): EcrivainDuDepot & {
  commits: CommitEnMemoire[];
  demandes: { branche: string; titre: string }[];
  fusionAutomatique: DemandeDeFusion[];
} {
  const commits: CommitEnMemoire[] = [];
  const demandes: { branche: string; titre: string }[] = [];
  const fusionAutomatique: DemandeDeFusion[] = [];
  const suivant = <T>(file: T[] | undefined, defaut: T): T =>
    (file && file.length > 1 ? file.shift() : file?.[0]) ?? defaut;
  const refuser = (operation: keyof EcrivainDuDepot) => {
    const refus = scenario.refus?.[operation];
    if (refus) throw refus;
  };
  return {
    commits,
    demandes,
    fusionAutomatique,
    lireFicheSurLaBase: async (chemin) => {
      refuser("lireFicheSurLaBase");
      const texte = contenus[chemin];
      if (texte === undefined) throw new FichierIntrouvable(chemin);
      return { texte, base: "main-1" };
    },
    commiterSurUneBranche: async (envoi) => {
      refuser("commiterSurUneBranche");
      commits.push(envoi);
      return `commit-${commits.length}`;
    },
    conversion: async () => {
      refuser("conversion");
      return suivant(scenario.conversion, { etat: "reussie" });
    },
    ouvrirDemande: async ({ branche, titre }) => {
      refuser("ouvrirDemande");
      demandes.push({ branche, titre });
      return {
        numero: demandes.length,
        adresse: `https://github.test/pull/${demandes.length}`,
        id: `PR_${demandes.length}`,
      };
    },
    demanderLaFusionAutomatique: async (demande) => {
      refuser("demanderLaFusionAutomatique");
      fusionAutomatique.push(demande);
    },
    brancheEnAttente: async (prefixe) => {
      refuser("brancheEnAttente");
      return scenario.branches?.find(({ branche }) =>
        branche.startsWith(prefixe),
      );
    },
    etatDeLaDemande: async () => {
      refuser("etatDeLaDemande");
      const etat = suivant(scenario.demande, "fusionnee");
      return typeof etat === "string" ? { etat } : etat;
    },
  };
}
