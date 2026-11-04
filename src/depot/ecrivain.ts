// La frontière du site avec le dépôt de données, côté écriture (ADR-photos-postees-par-une-branche) : ce que l'envoi de photos attend d'un dépôt, sans nommer GitHub. L'adaptateur est `github-ecriture.ts` ; les tests fournissent `ecrivain-en-memoire.ts`.

import type { DepotDesigne } from "./lecteur";

export interface FicheSurLaBase {
  texte: string;
  // Le commit de tête de la branche par défaut, d'où part la branche de l'envoi.
  base: string;
}

export interface FichierEcrit {
  chemin: string;
  contenu: Blob | string;
}

// Où en est l'Action qui convertit, pendant l'attente : en file, ou en cours sur l'une de ses étapes.
export interface AvancementDeLAction {
  statut: "en-file" | "en-cours";
  etape?: string;
}

export type EtatDeLaConversion =
  | ({ etat: "en-attente"; adresse?: string } & Partial<AvancementDeLAction>)
  | { etat: "reussie" }
  | { etat: "echouee"; adresse: string }
  | { etat: "absente" };

export interface DemandeDeFusion {
  numero: number;
  adresse: string;
  id: string;
}

export type EtatDeLaDemande =
  | "controles-en-cours"
  | "verifiee"
  | "controles-rouges"
  | "a-mettre-a-jour"
  | "fusionnee";

export interface Controles {
  finis: number;
  total: number;
}

export interface SuiviDeLaDemande {
  etat: EtatDeLaDemande;
  // Les contrôles du dernier commit de la demande, quand elle n'est pas encore fusionnée.
  controles?: Controles;
}

export interface EcrivainDuDepot {
  lireFicheSurLaBase(chemin: string): Promise<FicheSurLaBase>;
  // Un seul commit sur une branche neuve partie de `base` ; rend le SHA du commit.
  commiterSurUneBranche(envoi: {
    branche: string;
    base: string;
    message: string;
    fichiers: FichierEcrit[];
  }): Promise<string>;
  conversion(branche: string, commit: string): Promise<EtatDeLaConversion>;
  ouvrirDemande(envoi: {
    branche: string;
    titre: string;
    corps: string;
  }): Promise<DemandeDeFusion>;
  demanderLaFusionAutomatique(demande: DemandeDeFusion): Promise<void>;
  etatDeLaDemande(demande: DemandeDeFusion): Promise<SuiviDeLaDemande>;
}

export type OuvrirEcrivain = (
  depot: DepotDesigne,
  jeton: string,
) => EcrivainDuDepot;

export type RaisonDuRefus =
  "jeton-refuse" | "fusion-automatique-refusee" | "reseau" | "refusee";

// RG-depot-illisible-explique, côté écriture : un refus se dit avec sa cause.
export class EcritureRefusee extends Error {
  constructor(
    readonly raison: RaisonDuRefus,
    detail?: string,
  ) {
    super(detail ?? raison);
    this.name = "EcritureRefusee";
  }
}
