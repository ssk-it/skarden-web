// La frontière du site avec le dépôt de données : ce que les fiches attendent d'un dépôt, sans nommer GitHub. Un adaptateur la réalise (`github.ts`) ; les tests en fournissent un en mémoire (`lecteur-en-memoire.ts`).

export interface FichierDuDepot {
  chemin: string;
  // Le SHA du blob : deux fichiers de même contenu ont la même empreinte.
  empreinte: string;
}

export interface LecteurDuDepot {
  readonly fichiers: readonly FichierDuDepot[];
  lireTexte(chemin: string): Promise<string>;
  lirePhoto(chemin: string): Promise<Blob>;
}

export interface DepotDesigne {
  proprietaire: string;
  depot: string;
}

export type RaisonIllisible =
  | "introuvable"
  | "jeton-refuse"
  | "limite-atteinte"
  | "sans-referentiel"
  | "format-inconnu"
  | "reseau";

// RG-depot-illisible-explique : un échec ne passe ni pour un dépôt vide, ni pour une fiche fausse.
export class DepotIllisible extends Error {
  constructor(
    readonly raison: RaisonIllisible,
    readonly leveeA?: Date,
  ) {
    super(raison);
    this.name = "DepotIllisible";
  }
}

export class FichierIntrouvable extends Error {
  constructor(readonly chemin: string) {
    super(`fichier introuvable : ${chemin}`);
    this.name = "FichierIntrouvable";
  }
}

export class PhotoIndisponible extends Error {
  constructor(readonly chemin: string) {
    super(`photo indisponible : ${chemin}`);
    this.name = "PhotoIndisponible";
  }
}
