// Ce que les pages demandent au dépôt, dans le vocabulaire des fiches : lire une plante, les cultures d'une plante, le journal d'une culture, l'accueil. Les pages ne nomment ni GitHub ni une URL (docs/pratiques.md).

import {
  DepotIllisible,
  FichierIntrouvable,
  type LecteurDuDepot,
} from "../depot/lecteur";
import {
  FicheInvalide,
  lireFiche,
  lireReferentiel,
  type Collection,
  type FicheLue,
  type Referentiel,
} from "./format";

export interface Famille {
  id: string;
  nom: string;
  nomLatin?: string;
  corps: string;
}

export interface Plante {
  id: string;
  nom: string;
  nomLatin?: string;
  famille: string;
  type: string;
  cycle: string;
  exposition?: string;
  arrosage?: string;
  temperatureMinC?: number;
  calendrier: Record<string, number[]>;
  associations: { favorables: string[]; defavorables: string[] };
  photos: string[];
  corps: string;
}

export interface Emplacement {
  id: string;
  nom: string;
  interieur: boolean;
  exposition?: string;
  support?: string;
  photos: string[];
  corps: string;
}

export interface Culture {
  id: string;
  plante: string;
  emplacement: string;
  origine?: string;
  debut: string;
  fin?: string;
  statut: string;
  photos: string[];
  corps: string;
}

export interface EntreeDuJournal {
  chemin: string;
  date: string;
  culture: string;
  evenement: string;
  photos: string[];
  corps: string;
}

export interface FicheEnErreur {
  chemin: string;
  message: string;
}

export interface Liste<T> {
  fiches: T[];
  invalides: FicheEnErreur[];
}

export interface CultureALaUne {
  culture: Culture;
  plante?: Plante;
  emplacement?: Emplacement;
  derniere?: EntreeDuJournal;
}

export class FicheIntrouvable extends Error {
  constructor(
    readonly collection: Collection,
    readonly id: string,
  ) {
    super(`aucune fiche « ${id} » dans ${collection}`);
    this.name = "FicheIntrouvable";
  }
}

// RG-entree-du-journal : le nom de fichier d'une entrée commence par sa date, ce qui permet de choisir quelles entrées lire sans les ouvrir.
const DATE_EN_TETE = /^(\d{4}-\d{2}-\d{2})/;

export class DepotDeFiches {
  private constructor(
    private readonly lecteur: LecteurDuDepot,
    private readonly referentiel: Referentiel,
  ) {}

  static async ouvrir(lecteur: LecteurDuDepot): Promise<DepotDeFiches> {
    let texte: string;
    try {
      texte = await lecteur.lireTexte("referentiel.yml");
    } catch (erreur) {
      if (erreur instanceof FichierIntrouvable)
        throw new DepotIllisible("sans-referentiel");
      throw erreur;
    }
    return new DepotDeFiches(lecteur, lireReferentiel(texte));
  }

  lireFamille = (id: string) => this.lireUne("familles", id, versFamille);
  lirePlante = (id: string) => this.lireUne("plantes", id, versPlante);
  lireEmplacement = (id: string) =>
    this.lireUne("emplacements", id, versEmplacement);
  lireCulture = (id: string) => this.lireUne("cultures", id, versCulture);

  listerPlantes = async () =>
    parNom(await this.lireToutes("plantes", versPlante));
  listerCultures = () => this.lireToutes("cultures", versCulture);

  async plantesDe(familleId: string): Promise<Liste<Plante>> {
    return filtrer(await this.listerPlantes(), (p) => p.famille === familleId);
  }

  async culturesDe(planteId: string): Promise<Liste<Culture>> {
    return plusRecentesDAbord(
      filtrer(await this.listerCultures(), (c) => c.plante === planteId),
    );
  }

  async culturesA(emplacementId: string): Promise<Liste<Culture>> {
    return plusRecentesDAbord(
      filtrer(
        await this.listerCultures(),
        (c) => c.emplacement === emplacementId,
      ),
    );
  }

  async journalDe(culture: Culture): Promise<Liste<EntreeDuJournal>> {
    const entrees = await this.lireJournal(
      (date) => date >= culture.debut && (!culture.fin || date <= culture.fin),
    );
    return filtrer(entrees, (e) => e.culture === culture.id);
  }

  // RG-accueil-cultures-en-cours
  async accueil(): Promise<{
    cultures: CultureALaUne[];
    invalides: FicheEnErreur[];
  }> {
    const cultures = await this.listerCultures();
    const enCours = cultures.fiches.filter((c) => c.statut === "en-cours");
    if (enCours.length === 0)
      return { cultures: [], invalides: cultures.invalides };
    const plusAncienDebut = enCours.reduce(
      (plusAncien, c) => (c.debut < plusAncien ? c.debut : plusAncien),
      enCours[0]?.debut ?? "",
    );
    const journal = await this.lireJournal((date) => date >= plusAncienDebut);
    const [plantes, emplacements] = await Promise.all([
      Promise.all(
        enCours.map((c) => this.lirePlante(c.plante).catch(() => undefined)),
      ),
      Promise.all(
        enCours.map((c) =>
          this.lireEmplacement(c.emplacement).catch(() => undefined),
        ),
      ),
    ]);
    const aLaUne = enCours.map((culture, i) => ({
      culture,
      plante: plantes[i],
      emplacement: emplacements[i],
      derniere: journal.fiches.find((e) => e.culture === culture.id),
    }));
    // La culture la plus active d'abord : c'est elle qu'on vient voir.
    const activite = (c: CultureALaUne) => c.derniere?.date ?? c.culture.debut;
    aLaUne.sort((a, b) => activite(b).localeCompare(activite(a)));
    return {
      cultures: aLaUne,
      invalides: [...cultures.invalides, ...journal.invalides],
    };
  }

  lirePhoto(chemin: string): Promise<Blob> {
    return this.lecteur.lirePhoto(chemin);
  }

  private chemins(collection: Collection): string[] {
    const prefixe = `${this.referentiel.dossiers[collection]}/`;
    return this.lecteur.fichiers
      .map((f) => f.chemin)
      .filter((c) => c.startsWith(prefixe) && c.endsWith(".md"));
  }

  private async lireUne<T>(
    collection: Collection,
    id: string,
    convertir: (f: FicheLue) => T,
  ): Promise<T> {
    const chemin = `${this.referentiel.dossiers[collection]}/${id}.md`;
    let texte: string;
    try {
      texte = await this.lecteur.lireTexte(chemin);
    } catch (erreur) {
      if (erreur instanceof FichierIntrouvable)
        throw new FicheIntrouvable(collection, id);
      throw erreur;
    }
    return convertir(lireFiche(texte));
  }

  private lireToutes<T>(
    collection: Collection,
    convertir: (f: FicheLue, chemin: string) => T,
    garder: (chemin: string) => boolean = () => true,
  ) {
    return lireListe(
      this.lecteur,
      this.chemins(collection).filter(garder),
      convertir,
    );
  }

  // Le plus récent d'abord ; `garderDate` choisit les entrées à lire d'après la date de leur nom de fichier.
  private async lireJournal(
    garderDate: (date: string) => boolean,
  ): Promise<Liste<EntreeDuJournal>> {
    const garder = (chemin: string) => {
      const date = DATE_EN_TETE.exec(
        chemin.slice(chemin.lastIndexOf("/") + 1),
      )?.[1];
      return date === undefined || garderDate(date);
    };
    const lues = await this.lireToutes("journal", versEntree, garder);
    const entrees = {
      ...lues,
      fiches: lues.fiches.filter((e): e is EntreeDuJournal => e !== undefined),
    };
    entrees.fiches.sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.chemin.localeCompare(a.chemin),
    );
    return entrees;
  }
}

async function lireListe<T>(
  lecteur: LecteurDuDepot,
  chemins: string[],
  convertir: (f: FicheLue, chemin: string) => T,
): Promise<Liste<T>> {
  const liste: Liste<T> = { fiches: [], invalides: [] };
  const lues = await Promise.all(
    chemins.map(async (chemin) => {
      try {
        return convertir(lireFiche(await lecteur.lireTexte(chemin)), chemin);
      } catch (erreur) {
        if (erreur instanceof FicheInvalide)
          return new FicheEnErreurLue(chemin, erreur.message);
        throw erreur;
      }
    }),
  );
  for (const lue of lues) {
    if (lue instanceof FicheEnErreurLue)
      liste.invalides.push({ chemin: lue.chemin, message: lue.message });
    else liste.fiches.push(lue);
  }
  return liste;
}

class FicheEnErreurLue {
  constructor(
    readonly chemin: string,
    readonly message: string,
  ) {}
}

const filtrer = <T>(liste: Liste<T>, garder: (f: T) => boolean): Liste<T> => ({
  ...liste,
  fiches: liste.fiches.filter(garder),
});
const parNom = <T extends { nom: string }>(liste: Liste<T>) => ({
  ...liste,
  fiches: [...liste.fiches].sort((a, b) => a.nom.localeCompare(b.nom, "fr")),
});
const plusRecentesDAbord = (liste: Liste<Culture>) => ({
  ...liste,
  fiches: [...liste.fiches].sort((a, b) => b.debut.localeCompare(a.debut)),
});

// Le dépôt de données vérifie ses fiches contre leurs schémas ; le site ne vérifie que ce dont il a besoin pour afficher, et refuse une fiche à qui cela manque.
function texte(donnees: Record<string, unknown>, champ: string): string {
  const valeur = donnees[champ];
  if (typeof valeur === "string" && valeur !== "") return valeur;
  // YAML 1.1 lirait une date comme un objet Date ; la bibliothèque `yaml` suit YAML 1.2 et rend une chaîne, mais rien ne coûte de l'accepter.
  if (valeur instanceof Date) return valeur.toISOString().slice(0, 10);
  throw new FicheInvalide(`champ « ${champ} » absent ou vide`);
}

const facultatif = (donnees: Record<string, unknown>, champ: string) =>
  donnees[champ] === undefined || donnees[champ] === null
    ? undefined
    : texte(donnees, champ);

const liste = (valeur: unknown): string[] =>
  Array.isArray(valeur)
    ? valeur.filter((v): v is string => typeof v === "string")
    : [];

function versFamille({ donnees, corps }: FicheLue): Famille {
  return {
    id: texte(donnees, "id"),
    nom: texte(donnees, "nom"),
    nomLatin: facultatif(donnees, "nom_latin"),
    corps,
  };
}

function versPlante({ donnees, corps }: FicheLue): Plante {
  const calendrier = (donnees.calendrier ?? {}) as Record<string, unknown>;
  const associations = (donnees.associations ?? {}) as Record<string, unknown>;
  return {
    id: texte(donnees, "id"),
    nom: texte(donnees, "nom"),
    nomLatin: facultatif(donnees, "nom_latin"),
    famille: texte(donnees, "famille"),
    type: texte(donnees, "type"),
    cycle: texte(donnees, "cycle"),
    exposition: facultatif(donnees, "exposition"),
    arrosage: facultatif(donnees, "arrosage"),
    temperatureMinC:
      typeof donnees.temperature_min_c === "number"
        ? donnees.temperature_min_c
        : undefined,
    calendrier: Object.fromEntries(
      Object.entries(calendrier).map(([periode, mois]) => [
        periode,
        Array.isArray(mois)
          ? mois.filter((m): m is number => typeof m === "number")
          : [],
      ]),
    ),
    associations: {
      favorables: liste(associations.favorables),
      defavorables: liste(associations.defavorables),
    },
    photos: liste(donnees.photos),
    corps,
  };
}

function versEmplacement({ donnees, corps }: FicheLue): Emplacement {
  return {
    id: texte(donnees, "id"),
    nom: texte(donnees, "nom"),
    interieur: donnees.interieur === true,
    exposition: facultatif(donnees, "exposition"),
    support: facultatif(donnees, "support"),
    photos: liste(donnees.photos),
    corps,
  };
}

function versCulture({ donnees, corps }: FicheLue): Culture {
  return {
    id: texte(donnees, "id"),
    plante: texte(donnees, "plante"),
    emplacement: texte(donnees, "emplacement"),
    origine: facultatif(donnees, "origine"),
    debut: texte(donnees, "debut"),
    fin: facultatif(donnees, "fin"),
    statut: texte(donnees, "statut"),
    photos: liste(donnees.photos),
    corps,
  };
}

// RG-entree-du-journal : une entrée désigne une culture ou un élevage. Le site ne présente pas encore les élevages : leurs entrées sont laissées de côté, sans être dites invalides.
function versEntree(
  { donnees, corps }: FicheLue,
  chemin: string,
): EntreeDuJournal | undefined {
  if (donnees.culture === undefined && donnees.elevage !== undefined)
    return undefined;
  return {
    chemin,
    date: texte(donnees, "date"),
    culture: texte(donnees, "culture"),
    evenement: texte(donnees, "evenement"),
    photos: liste(donnees.photos),
    corps,
  };
}
