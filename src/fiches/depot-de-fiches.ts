// Ce que les pages demandent au dépôt, dans le vocabulaire des fiches : lire une plante ou un animal, les cultures d'une plante, les élevages d'une installation, le journal d'une culture ou d'un élevage, l'accueil. Les pages ne nomment ni GitHub ni une URL (docs/pratiques.md).

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

// RG-champs-de-la-fiche-famille : une famille sans `regne` est végétale, comme toutes celles d'avant l'animal.
export type Regne = "vegetal" | "animal";

export interface Famille {
  id: string;
  nom: string;
  nomLatin?: string;
  regne: Regne;
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

// RG-plages-de-conditions : une borne absente laisse la plage ouverte de ce côté.
export interface Plage {
  parametre: string;
  min?: number;
  max?: number;
  etat: string;
}

export interface PhaseDUnMode {
  phase: string;
  mois: number[];
}

export interface Mode {
  id: string;
  phases: PhaseDUnMode[];
}

// RG-routine-de-soins : un soin sans phases vaut dans toutes les phases.
export interface Soin {
  soin: string;
  frequence: string;
  phases: string[];
}

export interface Fourchette {
  min: number;
  max: number;
}

export interface Densite extends Fourchette {
  unite: "par-m2-sol" | "par-litre";
}

export interface Animal {
  id: string;
  nom: string;
  nomLatin?: string;
  famille?: string;
  milieu: string;
  protection: string;
  plages: Plage[];
  modes: Mode[];
  densite?: Densite;
  complements: string[];
  reproduction?: { mode?: string; fecondite?: Fourchette };
  stades: string[];
  routine: Soin[];
  procedures: string[];
  photos: string[];
  corps: string;
}

export interface Installation {
  id: string;
  nom: string;
  type: string;
  emplacement: string;
  dimensionsCm?: { longueur: number; largeur: number; hauteur: number };
  volumeL?: number;
  photos: string[];
  corps: string;
}

export interface Elevage {
  id: string;
  animal: string;
  installation: string;
  debut: string;
  fin?: string;
  statut: string;
  origine: string;
  elevageParent?: string;
  mode?: string;
  effectifCible?: number;
  photos: string[];
  corps: string;
}

export interface Procedure {
  id: string;
  nom: string;
  photos: string[];
  corps: string;
}

// RG-entree-du-journal : une entrée désigne exactement une culture ou un élevage.
export interface EntreeDuJournal {
  chemin: string;
  date: string;
  culture?: string;
  elevage?: string;
  evenement: string;
  effectif?: number;
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

// RG-phase-du-moment : un élevage terminé, perdu ou sans mode n'a pas de phase du moment ; on dit pourquoi, sans en inventer une.
export type PhaseDuMoment =
  | { connue: true; mois: number; phases: string[]; soins: Soin[] }
  | {
      connue: false;
      raison: "pas-en-cours" | "sans-mode" | "mode-inconnu" | "sans-animal";
    };

// RG-capacite-calculee : une fourchette, ou la raison pour laquelle elle ne se calcule pas.
export type Capacite =
  | ({ calculable: true } & Fourchette)
  | {
      calculable: false;
      raison: "sans-densite" | "sans-surface" | "sans-volume";
    };

export interface ElevageALaUne {
  elevage: Elevage;
  animal?: Animal;
  installation?: Installation;
  phase: PhaseDuMoment;
  derniere?: EntreeDuJournal;
}

export type EspecesDUneFamille =
  | { regne: "vegetal"; especes: Liste<Plante> }
  | { regne: "animal"; especes: Liste<Animal> };

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
  lireAnimal = (id: string) => this.lireUne("animaux", id, versAnimal);
  lireElevage = (id: string) => this.lireUne("elevages", id, versElevage);
  lireInstallation = (id: string) =>
    this.lireUne("installations", id, versInstallation);
  lireProcedure = (id: string) => this.lireUne("procedures", id, versProcedure);

  listerPlantes = async () =>
    parNom(await this.lireToutes("plantes", versPlante));
  listerCultures = () => this.lireToutes("cultures", versCulture);
  listerAnimaux = async () =>
    parNom(await this.lireToutes("animaux", versAnimal));
  listerElevages = () => this.lireToutes("elevages", versElevage);
  listerInstallations = async () =>
    parNom(await this.lireToutes("installations", versInstallation));

  // RG-referentiel-yml-decrit-le-depot : le site ne présente que les collections que le dépôt déclare.
  declare(collection: Collection): boolean {
    return this.referentiel.dossiers[collection] !== undefined;
  }

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

  // RG-page-d-un-animal : ses élevages, en cours d'abord.
  async elevagesDe(animalId: string): Promise<Liste<Elevage>> {
    return enCoursDAbord(
      filtrer(await this.listerElevages(), (e) => e.animal === animalId),
    );
  }

  async elevagesDans(installationId: string): Promise<Liste<Elevage>> {
    return enCoursDAbord(
      filtrer(
        await this.listerElevages(),
        (e) => e.installation === installationId,
      ),
    );
  }

  async installationsA(emplacementId: string): Promise<Liste<Installation>> {
    return filtrer(
      await this.listerInstallations(),
      (i) => i.emplacement === emplacementId,
    );
  }

  // RG-champs-de-la-fiche-procedure : une procédure ne désigne aucune espèce ; ce sont les espèces qui la citent.
  async especesQuiCitent(procedureId: string): Promise<Liste<Animal>> {
    return filtrer(await this.listerAnimaux(), (a) =>
      a.procedures.includes(procedureId),
    );
  }

  // RG-famille-montre-ses-especes
  async especesDe(famille: Famille): Promise<EspecesDUneFamille> {
    if (famille.regne === "animal")
      return {
        regne: "animal",
        especes: filtrer(
          await this.listerAnimaux(),
          (a) => a.famille === famille.id,
        ),
      };
    return { regne: "vegetal", especes: await this.plantesDe(famille.id) };
  }

  async journalDe(culture: Culture): Promise<Liste<EntreeDuJournal>> {
    const entrees = await this.lireJournal(pendant(culture));
    return filtrer(entrees, (e) => e.culture === culture.id);
  }

  async journalDElevage(elevage: Elevage): Promise<Liste<EntreeDuJournal>> {
    const entrees = await this.lireJournal(pendant(elevage));
    return filtrer(entrees, (e) => e.elevage === elevage.id);
  }

  // RG-accueil-cultures-en-cours, RG-accueil-elevages-en-cours : le journal ne se lit qu'une fois, à partir du plus ancien début de ce qui est en cours.
  async accueil(mois: number = moisEnCours()): Promise<{
    cultures: CultureALaUne[];
    elevages?: ElevageALaUne[];
    invalides: FicheEnErreur[];
  }> {
    const avecElevages = this.declare("elevages");
    const [cultures, elevages] = await Promise.all([
      this.listerCultures(),
      this.listerElevages(),
    ]);
    const culturesEnCours = cultures.fiches.filter(
      (c) => c.statut === "en-cours",
    );
    const elevagesEnCours = elevages.fiches.filter(
      (e) => e.statut === "en-cours",
    );
    const debuts = [...culturesEnCours, ...elevagesEnCours].map((l) => l.debut);
    const plusAncienDebut = debuts.reduce(
      (plusAncien, debut) => (debut < plusAncien ? debut : plusAncien),
      debuts[0] ?? "",
    );
    const journal: Liste<EntreeDuJournal> =
      debuts.length === 0
        ? { fiches: [], invalides: [] }
        : await this.lireJournal((date) => date >= plusAncienDebut);
    const [culturesALaUne, elevagesALaUne] = await Promise.all([
      this.culturesALaUne(culturesEnCours, journal.fiches),
      this.elevagesALaUne(elevagesEnCours, journal.fiches, mois),
    ]);
    return {
      cultures: culturesALaUne,
      elevages: avecElevages ? elevagesALaUne : undefined,
      invalides: [
        ...cultures.invalides,
        ...elevages.invalides,
        ...journal.invalides,
      ],
    };
  }

  private async culturesALaUne(
    enCours: Culture[],
    journal: EntreeDuJournal[],
  ): Promise<CultureALaUne[]> {
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
      derniere: journal.find((e) => e.culture === culture.id),
    }));
    // La culture la plus active d'abord : c'est elle qu'on vient voir.
    const activite = (c: CultureALaUne) => c.derniere?.date ?? c.culture.debut;
    return aLaUne.sort((a, b) => activite(b).localeCompare(activite(a)));
  }

  private async elevagesALaUne(
    enCours: Elevage[],
    journal: EntreeDuJournal[],
    mois: number,
  ): Promise<ElevageALaUne[]> {
    const [animaux, installations] = await Promise.all([
      Promise.all(
        enCours.map((e) => this.lireAnimal(e.animal).catch(() => undefined)),
      ),
      Promise.all(
        enCours.map((e) =>
          this.lireInstallation(e.installation).catch(() => undefined),
        ),
      ),
    ]);
    const aLaUne = enCours.map((elevage, i) => ({
      elevage,
      animal: animaux[i],
      installation: installations[i],
      phase: phaseDuMoment(elevage, animaux[i], mois),
      derniere: journal.find((e) => e.elevage === elevage.id),
    }));
    const activite = (e: ElevageALaUne) => e.derniere?.date ?? e.elevage.debut;
    return aLaUne.sort((a, b) => activite(b).localeCompare(activite(a)));
  }

  lirePhoto(chemin: string): Promise<Blob> {
    return this.lecteur.lirePhoto(chemin);
  }

  // Une collection que le dépôt ne déclare pas n'a aucune fiche : ses listes sont vides, jamais en erreur.
  private chemins(collection: Collection): string[] {
    const dossier = this.referentiel.dossiers[collection];
    if (dossier === undefined) return [];
    const prefixe = `${dossier}/`;
    return this.lecteur.fichiers
      .map((f) => f.chemin)
      .filter((c) => c.startsWith(prefixe) && c.endsWith(".md"));
  }

  private async lireUne<T>(
    collection: Collection,
    id: string,
    convertir: (f: FicheLue) => T,
  ): Promise<T> {
    const dossier = this.referentiel.dossiers[collection];
    if (dossier === undefined) throw new FicheIntrouvable(collection, id);
    const chemin = `${dossier}/${id}.md`;
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
    const entrees = await this.lireToutes("journal", versEntree, garder);
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
const plusRecentesDAbord = <T extends { debut: string }>(liste: Liste<T>) => ({
  ...liste,
  fiches: [...liste.fiches].sort((a, b) => b.debut.localeCompare(a.debut)),
});
const enCoursDAbord = (liste: Liste<Elevage>) => ({
  ...liste,
  fiches: [...liste.fiches].sort(
    (a, b) =>
      Number(b.statut === "en-cours") - Number(a.statut === "en-cours") ||
      b.debut.localeCompare(a.debut),
  ),
});
// Les entrées du journal datées pendant la période d'un lot.
const pendant =
  (lot: { debut: string; fin?: string }) =>
  (date: string): boolean =>
    date >= lot.debut && (!lot.fin || date <= lot.fin);

// RG-phase-du-moment : selon l'horloge du navigateur.
export const moisEnCours = () => new Date().getMonth() + 1;

// Les phases d'un mode qui contiennent ce mois : plusieurs quand deux phases partagent un mois de transition (RG-modes-et-phases).
export const phasesDuMois = (mode: Mode, mois: number): string[] => [
  ...new Set(
    mode.phases.filter((p) => p.mois.includes(mois)).map((p) => p.phase),
  ),
];

// RG-phase-du-moment : les phases du mode retenu qui contiennent ce mois, et les soins de la routine qui s'y appliquent ou ne précisent aucune phase.
export function phaseDuMoment(
  elevage: Elevage,
  animal: Animal | undefined,
  mois: number,
): PhaseDuMoment {
  if (elevage.statut !== "en-cours")
    return { connue: false, raison: "pas-en-cours" };
  if (!elevage.mode) return { connue: false, raison: "sans-mode" };
  if (!animal) return { connue: false, raison: "sans-animal" };
  const mode = animal.modes.find((m) => m.id === elevage.mode);
  if (!mode) return { connue: false, raison: "mode-inconnu" };
  const phases = phasesDuMois(mode, mois);
  const soins = animal.routine.filter(
    (s) => s.phases.length === 0 || s.phases.some((p) => phases.includes(p)),
  );
  return { connue: true, mois, phases, soins };
}

// La surface au sol en m², longueur × largeur.
export function surfaceAuSolM2(installation: Installation): number | undefined {
  const d = installation.dimensionsCm;
  return d ? (d.longueur * d.largeur) / 10_000 : undefined;
}

// RG-champs-de-la-fiche-installation : `volume_l` donne le volume utile quand il diffère du produit des dimensions.
export function volumeL(installation: Installation): number | undefined {
  if (installation.volumeL !== undefined) return installation.volumeL;
  const d = installation.dimensionsCm;
  return d ? (d.longueur * d.largeur * d.hauteur) / 1000 : undefined;
}

// RG-capacite-calculee : arrondie à l'individu inférieur, pour ne jamais promettre plus que le bac ne tient.
export function capacite(animal: Animal, installation: Installation): Capacite {
  const densite = animal.densite;
  if (!densite) return { calculable: false, raison: "sans-densite" };
  const mesure =
    densite.unite === "par-m2-sol"
      ? surfaceAuSolM2(installation)
      : volumeL(installation);
  if (mesure === undefined)
    return {
      calculable: false,
      raison: densite.unite === "par-m2-sol" ? "sans-surface" : "sans-volume",
    };
  // Arrondir avant le plancher : 0,5376 × 100 donne 53,760000000000005 en virgule flottante.
  const individus = (d: number) => Math.floor(Number((d * mesure).toFixed(6)));
  return {
    calculable: true,
    min: individus(densite.min),
    max: individus(densite.max),
  };
}

// Le dernier effectif compté : la plus récente entrée `comptage` qui porte un `effectif`. Le journal arrive le plus récent d'abord.
export function dernierEffectif(
  journal: EntreeDuJournal[],
): (EntreeDuJournal & { effectif: number }) | undefined {
  return journal.find(
    (e): e is EntreeDuJournal & { effectif: number } =>
      e.evenement === "comptage" && e.effectif !== undefined,
  );
}

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

const nombre = (valeur: unknown): number | undefined =>
  typeof valeur === "number" && Number.isFinite(valeur) ? valeur : undefined;

const objet = (valeur: unknown): Record<string, unknown> =>
  typeof valeur === "object" && valeur !== null && !Array.isArray(valeur)
    ? (valeur as Record<string, unknown>)
    : {};

const objets = (valeur: unknown): Record<string, unknown>[] =>
  Array.isArray(valeur) ? valeur.map(objet) : [];

const mois = (valeur: unknown): number[] =>
  Array.isArray(valeur)
    ? valeur.filter((m): m is number => typeof m === "number")
    : [];

function fourchette(valeur: unknown): Fourchette | undefined {
  const { min, max } = objet(valeur);
  const bas = nombre(min);
  const haut = nombre(max);
  return bas === undefined || haut === undefined
    ? undefined
    : { min: bas, max: haut };
}

function versFamille({ donnees, corps }: FicheLue): Famille {
  return {
    id: texte(donnees, "id"),
    nom: texte(donnees, "nom"),
    nomLatin: facultatif(donnees, "nom_latin"),
    regne: donnees.regne === "animal" ? "animal" : "vegetal",
    corps,
  };
}

// RG-page-d-un-animal : les plages regroupées par paramètre, dans l'ordre où la fiche les nomme, et rangées de la plus basse à la plus haute.
function rangerPlages(plages: Plage[]): Plage[] {
  const parametres = [...new Set(plages.map((p) => p.parametre))];
  const bas = (p: Plage) => p.min ?? p.max ?? 0;
  return plages
    .map((plage, i) => ({ plage, i }))
    .sort(
      (a, b) =>
        parametres.indexOf(a.plage.parametre) -
          parametres.indexOf(b.plage.parametre) ||
        (a.plage.min === undefined ? -1 : 0) -
          (b.plage.min === undefined ? -1 : 0) ||
        bas(a.plage) - bas(b.plage) ||
        a.i - b.i,
    )
    .map(({ plage }) => plage);
}

function versAnimal({ donnees, corps }: FicheLue): Animal {
  const densite = objet(donnees.densite);
  const bornes = fourchette(densite);
  const reproduction = objet(donnees.reproduction);
  return {
    id: texte(donnees, "id"),
    nom: texte(donnees, "nom"),
    nomLatin: facultatif(donnees, "nom_latin"),
    famille: facultatif(donnees, "famille"),
    milieu: texte(donnees, "milieu"),
    // RG-champs-de-la-fiche-animal : la protection est obligatoire, parce qu'elle s'oublie si on peut l'omettre.
    protection: texte(donnees, "protection"),
    plages: rangerPlages(
      objets(donnees.plages).flatMap((p) => {
        if (typeof p.parametre !== "string" || typeof p.etat !== "string")
          return [];
        const plage: Plage = { parametre: p.parametre, etat: p.etat };
        const min = nombre(p.min);
        const max = nombre(p.max);
        if (min !== undefined) plage.min = min;
        if (max !== undefined) plage.max = max;
        return min === undefined && max === undefined ? [] : [plage];
      }),
    ),
    modes: objets(donnees.modes).flatMap((m) =>
      typeof m.id === "string"
        ? [
            {
              id: m.id,
              phases: objets(m.phases).flatMap((p) =>
                typeof p.phase === "string"
                  ? [{ phase: p.phase, mois: mois(p.mois) }]
                  : [],
              ),
            },
          ]
        : [],
    ),
    densite:
      bornes &&
      (densite.unite === "par-m2-sol" || densite.unite === "par-litre")
        ? { ...bornes, unite: densite.unite }
        : undefined,
    complements: liste(donnees.complements),
    reproduction:
      donnees.reproduction === undefined
        ? undefined
        : {
            mode:
              typeof reproduction.mode === "string"
                ? reproduction.mode
                : undefined,
            fecondite: fourchette(reproduction.fecondite),
          },
    stades: liste(donnees.stades),
    routine: objets(donnees.routine).flatMap((s) =>
      typeof s.soin === "string" && typeof s.frequence === "string"
        ? [{ soin: s.soin, frequence: s.frequence, phases: liste(s.phases) }]
        : [],
    ),
    procedures: liste(donnees.procedures),
    photos: liste(donnees.photos),
    corps,
  };
}

function versInstallation({ donnees, corps }: FicheLue): Installation {
  const { longueur, largeur, hauteur } = objet(donnees.dimensions_cm);
  const l = nombre(longueur);
  const la = nombre(largeur);
  const h = nombre(hauteur);
  return {
    id: texte(donnees, "id"),
    nom: texte(donnees, "nom"),
    type: texte(donnees, "type"),
    emplacement: texte(donnees, "emplacement"),
    dimensionsCm:
      l !== undefined && la !== undefined && h !== undefined
        ? { longueur: l, largeur: la, hauteur: h }
        : undefined,
    volumeL: nombre(donnees.volume_l),
    photos: liste(donnees.photos),
    corps,
  };
}

function versElevage({ donnees, corps }: FicheLue): Elevage {
  return {
    id: texte(donnees, "id"),
    animal: texte(donnees, "animal"),
    installation: texte(donnees, "installation"),
    debut: texte(donnees, "debut"),
    fin: facultatif(donnees, "fin"),
    statut: texte(donnees, "statut"),
    origine: texte(donnees, "origine"),
    elevageParent: facultatif(donnees, "elevage_parent"),
    mode: facultatif(donnees, "mode"),
    effectifCible: nombre(donnees.effectif_cible),
    photos: liste(donnees.photos),
    corps,
  };
}

function versProcedure({ donnees, corps }: FicheLue): Procedure {
  return {
    id: texte(donnees, "id"),
    nom: texte(donnees, "nom"),
    photos: liste(donnees.photos),
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

// RG-entree-du-journal : une entrée désigne exactement un lot, une culture ou un élevage.
function versEntree(
  { donnees, corps }: FicheLue,
  chemin: string,
): EntreeDuJournal {
  const culture = facultatif(donnees, "culture");
  const elevage = facultatif(donnees, "elevage");
  if (culture === undefined && elevage === undefined)
    throw new FicheInvalide("champ « culture » ou « elevage » absent ou vide");
  if (culture !== undefined && elevage !== undefined)
    throw new FicheInvalide(
      "une entrée désigne une culture ou un élevage, pas les deux",
    );
  return {
    chemin,
    date: texte(donnees, "date"),
    culture,
    elevage,
    evenement: texte(donnees, "evenement"),
    effectif: elevage === undefined ? undefined : nombre(donnees.effectif),
    photos: liste(donnees.photos),
    corps,
  };
}
