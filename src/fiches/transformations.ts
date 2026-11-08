// Les transformations (cadrage 2026-007) : lire les recettes, les réalisations, les produits et les contenants, et calculer ce qui ne s'écrit sur aucune fiche — les durées, la comparaison à la recette, le délai et les moyennes d'une dégustation.

import {
  facultatif,
  fourchette,
  liste,
  nombre,
  objet,
  objets,
  texte,
  type Fourchette,
} from "./champs";
import type { EntreeDuJournal } from "./depot-de-fiches";
import { FicheInvalide, type FicheLue } from "./format";

// RG-quantite-et-unite
export interface Quantite {
  quantite: number;
  unite: string;
}

export interface IngredientDeRecette extends Quantite {
  ingredient: string;
  conservation?: string;
  note?: string;
  optionnel: boolean;
}

// RG-champs-de-la-fiche-recette : les durées cibles sont des plages de durées ISO 8601.
export interface PhaseDeRecette {
  id: string;
  libelle: string;
  dureeCible?: { min: string; max: string };
  temperatureC?: Fourchette;
  contenantCategorie?: string;
  conditions?: string;
}

export interface Recette {
  id: string;
  nom: string;
  categorie: string;
  version: number;
  deriveDe?: string;
  rendement?: Quantite;
  ingredients: IngredientDeRecette[];
  phases: PhaseDeRecette[];
  sources: string[];
  photos: string[];
  corps: string;
}

// RG-provenance-d-un-ingredient : au plus une provenance, un produit acheté ou une culture du jardin.
export interface IngredientDeRealisation extends Quantite {
  ingredient: string;
  conservation?: string;
  produit?: string;
  lot?: string;
  dluo?: string;
  achat?: { date?: string; lieu?: string; prixEur?: number };
  culture?: string;
  recolte?: string;
  ajoute: boolean;
}

// RG-phases-d-une-realisation : la durée ne s'écrit jamais, elle se calcule de `debut` à `fin`.
export interface PhaseDeRealisation {
  id: string;
  debut: string;
  fin?: string;
  contenant?: string;
  nombre: number;
  temperatureC?: Fourchette & { mesure?: string };
  conditions?: string;
  ajoutee: boolean;
}

export interface Realisation {
  id: string;
  nom: string;
  recette: string;
  recetteVersion: number;
  statut: string;
  debut: string;
  fin?: string;
  ingredients: IngredientDeRealisation[];
  phases: PhaseDeRealisation[];
  ecarts: string[];
  resultat?: { volumeObtenu?: Quantite; degreEstime?: number };
  photos: string[];
  corps: string;
}

export interface Produit {
  id: string;
  nom: string;
  ingredient: string;
  conservation?: string;
  marque?: string;
  fournisseur?: string;
  origine?: string;
  conditionnement?: Quantite;
  reference?: string;
  url?: string;
  photos: string[];
  corps: string;
}

export interface Contenant {
  id: string;
  nom: string;
  categorie: string;
  contenance?: Quantite;
  matiere: string;
  fermeture?: string;
  nombre?: number;
  photos: string[];
  corps: string;
}

// RG-valeurs-enumerees-fermees : les critères d'une dégustation, dans l'ordre où on les juge.
export const CRITERES = [
  "couleur",
  "limpidite",
  "nez",
  "bouche",
  "texture",
  "equilibre",
  "finale",
  "ensemble",
] as const;
export type Critere = (typeof CRITERES)[number];

export interface Avis {
  participant: string;
  criteres: Partial<Record<Critere, number>>;
  commentaire?: string;
}

const entier = (donnees: Record<string, unknown>, champ: string): number => {
  const valeur = donnees[champ];
  if (typeof valeur === "number" && Number.isInteger(valeur)) return valeur;
  throw new FicheInvalide(`champ « ${champ} » absent ou non entier`);
};

// Un code EAN s'écrit souvent sans guillemets, et YAML le lit alors comme un nombre.
const texteOuNombre = (donnees: Record<string, unknown>, champ: string) =>
  typeof donnees[champ] === "number"
    ? String(donnees[champ])
    : facultatif(donnees, champ);

function quantite(valeur: unknown): Quantite | undefined {
  const { quantite, unite } = objet(valeur);
  const q = nombre(quantite);
  return q !== undefined && typeof unite === "string"
    ? { quantite: q, unite }
    : undefined;
}

// Un élément de liste à qui manque ce qu'il faut pour l'afficher est laissé de côté, comme les plages d'un animal.
function elements<T>(
  valeur: unknown,
  convertir: (o: Record<string, unknown>) => T,
): T[] {
  return objets(valeur).flatMap((o) => {
    try {
      return [convertir(o)];
    } catch (erreur) {
      if (erreur instanceof FicheInvalide) return [];
      throw erreur;
    }
  });
}

function plageDeDurees(valeur: unknown) {
  const { min, max } = objet(valeur);
  return typeof min === "string" && typeof max === "string"
    ? { min, max }
    : undefined;
}

export function versRecette({ donnees, corps }: FicheLue): Recette {
  return {
    id: texte(donnees, "id"),
    nom: texte(donnees, "nom"),
    categorie: texte(donnees, "categorie"),
    version: entier(donnees, "version"),
    deriveDe: facultatif(donnees, "derive_de"),
    rendement: quantite(donnees.rendement),
    ingredients: elements(donnees.ingredients, (i) => ({
      ...quantiteObligatoire(i),
      ingredient: texte(i, "ingredient"),
      conservation: facultatif(i, "conservation"),
      note: facultatif(i, "note"),
      optionnel: i.optionnel === true,
    })),
    phases: elements(donnees.phases, (p) => ({
      id: texte(p, "id"),
      libelle: texte(p, "libelle"),
      dureeCible: plageDeDurees(p.duree_cible),
      temperatureC: fourchette(p.temperature_c),
      contenantCategorie: facultatif(p, "contenant_categorie"),
      conditions: facultatif(p, "conditions"),
    })),
    sources: liste(donnees.sources),
    photos: liste(donnees.photos),
    corps,
  };
}

function quantiteObligatoire(o: Record<string, unknown>): Quantite {
  const lue = quantite(o);
  if (!lue) throw new FicheInvalide("quantité ou unité absente");
  return lue;
}

export function versRealisation({ donnees, corps }: FicheLue): Realisation {
  const resultat = objet(donnees.resultat);
  return {
    id: texte(donnees, "id"),
    nom: texte(donnees, "nom"),
    recette: texte(donnees, "recette"),
    recetteVersion: entier(donnees, "recette_version"),
    statut: texte(donnees, "statut"),
    debut: texte(donnees, "debut"),
    fin: facultatif(donnees, "fin"),
    ingredients: elements(donnees.ingredients, (i) => {
      const achat = objet(i.achat);
      return {
        ...quantiteObligatoire(i),
        ingredient: texte(i, "ingredient"),
        conservation: facultatif(i, "conservation"),
        produit: facultatif(i, "produit"),
        lot: texteOuNombre(i, "lot"),
        dluo: facultatif(i, "dluo"),
        achat:
          i.achat === undefined
            ? undefined
            : {
                date: facultatif(achat, "date"),
                lieu: facultatif(achat, "lieu"),
                prixEur: nombre(achat.prix_eur),
              },
        culture: facultatif(i, "culture"),
        recolte: facultatif(i, "recolte"),
        ajoute: i.ajoute === true,
      };
    }),
    phases: elements(donnees.phases, (p) => {
      const plage = fourchette(p.temperature_c);
      return {
        id: texte(p, "id"),
        debut: texte(p, "debut"),
        fin: facultatif(p, "fin"),
        contenant: facultatif(p, "contenant"),
        nombre: nombre(p.nombre) ?? 1,
        temperatureC: plage && {
          ...plage,
          mesure: facultatif(objet(p.temperature_c), "mesure"),
        },
        conditions: facultatif(p, "conditions"),
        ajoutee: p.ajoutee === true,
      };
    }),
    ecarts: liste(donnees.ecarts),
    resultat:
      donnees.resultat === undefined || donnees.resultat === null
        ? undefined
        : {
            volumeObtenu: quantite(resultat.volume_obtenu),
            degreEstime: nombre(resultat.degre_estime),
          },
    photos: liste(donnees.photos),
    corps,
  };
}

export function versProduit({ donnees, corps }: FicheLue): Produit {
  return {
    id: texte(donnees, "id"),
    nom: texte(donnees, "nom"),
    ingredient: texte(donnees, "ingredient"),
    conservation: facultatif(donnees, "conservation"),
    marque: facultatif(donnees, "marque"),
    fournisseur: facultatif(donnees, "fournisseur"),
    origine: facultatif(donnees, "origine"),
    conditionnement: quantite(donnees.conditionnement),
    reference: texteOuNombre(donnees, "reference"),
    url: facultatif(donnees, "url"),
    photos: liste(donnees.photos),
    corps,
  };
}

export function versContenant({ donnees, corps }: FicheLue): Contenant {
  return {
    id: texte(donnees, "id"),
    nom: texte(donnees, "nom"),
    categorie: texte(donnees, "categorie"),
    contenance: quantite(donnees.contenance),
    matiere: texte(donnees, "matiere"),
    fermeture: facultatif(donnees, "fermeture"),
    nombre: nombre(donnees.nombre),
    photos: liste(donnees.photos),
    corps,
  };
}

// RG-degustation-d-une-realisation : une note hors de 0 à 10 ou sur un critère inconnu est laissée de côté ; une note absente ne vaut pas zéro.
export function versAvis(valeur: unknown): Avis[] {
  return elements(valeur, (a) => {
    const notes = objet(a.criteres);
    const criteres: Partial<Record<Critere, number>> = {};
    for (const critere of CRITERES) {
      const note = nombre(notes[critere]);
      if (note !== undefined && note >= 0 && note <= 10)
        criteres[critere] = note;
    }
    return {
      participant: texte(a, "participant"),
      criteres,
      commentaire: facultatif(a, "commentaire"),
    };
  });
}

// --- Le temps ---

const HEURE = 3600 * 1000;
const JOUR = 24 * HEURE;

// Les dates des fiches sont à l'heure de Paris (RG-champs-de-la-fiche-realisation). On les compte en millisecondes « murales », comme si Paris était en UTC : l'écart d'une heure au changement d'heure ne compte pas pour des durées de jours ou de semaines.
export function instant(date: string): number {
  return Date.parse(date.length === 10 ? `${date}T00:00Z` : `${date}Z`);
}

// Une date sans heure vaut pour toute la journée : elle commence à minuit et finit au minuit suivant.
const debutDe = (date: string) => instant(date);
const finDe = (date: string) =>
  date.length === 10 ? instant(date) + JOUR : instant(date);

const PARIS = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// L'heure de Paris au moment présent, dans le même compte que `instant`.
export function maintenantAParis(maintenant = new Date()): number {
  const parties = Object.fromEntries(
    PARIS.formatToParts(maintenant).map((p) => [p.type, p.value]),
  );
  return instant(
    `${parties.year}-${parties.month}-${parties.day}T${parties.hour}:${parties.minute}`,
  );
}

export interface Duree {
  ms: number;
  enCours: boolean;
}

// RG-page-d-une-realisation : une phase sans fin est en cours, et sa durée court jusqu'à maintenant.
export function dureeDePhase(
  periode: { debut: string; fin?: string },
  maintenant: number,
): Duree {
  const fin = periode.fin ? finDe(periode.fin) : maintenant;
  return {
    ms: Math.max(0, fin - debutDe(periode.debut)),
    enCours: !periode.fin,
  };
}

export const dureeTotale = dureeDePhase;

// Pour comparer des durées, un mois compte 30 jours et une année 365.
const DUREE_ISO =
  /^P(?!$)(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?=\d)(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;
const UNITES_ISO = [365 * JOUR, 30 * JOUR, 7 * JOUR, JOUR, HEURE, 60_000, 1000];

export function dureeIso(duree: string): number | undefined {
  const morceaux = DUREE_ISO.exec(duree);
  if (!morceaux) return undefined;
  return UNITES_ISO.reduce(
    (total, unite, i) => total + Number(morceaux[i + 1] ?? 0) * unite,
    0,
  );
}

// Les composantes d'une durée ISO, pour l'écrire en mots : P1Y2M → [[1, "an"], [2, "mois"]].
export function composantesIso(duree: string): [number, string][] {
  const morceaux = DUREE_ISO.exec(duree);
  if (!morceaux) return [];
  const noms = ["an", "mois", "semaine", "jour", "heure", "minute", "seconde"];
  return noms.flatMap((nom, i): [number, string][] =>
    morceaux[i + 1] ? [[Number(morceaux[i + 1]), nom]] : [],
  );
}

export interface Delai {
  depuis: "fin" | "debut";
  jours: number;
}

const jourDe = (date: string) => instant(date.slice(0, 10));

// RG-degustation-d-une-realisation : depuis la fin ; depuis le début si la dégustation la précède ou que la réalisation est en cours. Une dégustation datée du jour de la fin ne la précède pas : la date vaut pour toute la journée.
export function delaiDeDegustation(
  realisation: { debut: string; fin?: string },
  date: string,
): Delai {
  const fin = realisation.fin;
  const depuis = fin && jourDe(date) >= jourDe(fin) ? "fin" : "debut";
  const repere = fin && depuis === "fin" ? fin : realisation.debut;
  return {
    depuis,
    jours: Math.max(0, Math.round((jourDe(date) - jourDe(repere)) / JOUR)),
  };
}

// --- La comparaison à la recette (RG-comparaison-a-la-recette) ---

// RG-quantite-et-unite : deux quantités ne se comparent que dans des unités de même nature.
const NATURES: Record<string, { nature: string; facteur: number }> = {
  g: { nature: "masse", facteur: 1 },
  kg: { nature: "masse", facteur: 1000 },
  ml: { nature: "volume", facteur: 1 },
  cl: { nature: "volume", facteur: 10 },
  l: { nature: "volume", facteur: 1000 },
};

function versUnite(q: Quantite, unite: string): number | undefined {
  if (q.unite === unite) return q.quantite;
  const de = NATURES[q.unite];
  const vers = NATURES[unite];
  if (!de || !vers || de.nature !== vers.nature) return undefined;
  return (q.quantite * de.facteur) / vers.facteur;
}

const arrondi = (n: number) => Number(n.toFixed(6));

export type ComparaisonDIngredient =
  | {
      ingredient: string;
      etat: "employe";
      prevu: IngredientDeRecette;
      employe: IngredientDeRealisation;
      conservationDifferente: boolean;
      incomparable: boolean;
      ecart?: { quantite: number; unite: string; pourcentage: number };
    }
  | { ingredient: string; etat: "ajoute"; employe: IngredientDeRealisation }
  | {
      ingredient: string;
      etat: "manquant" | "facultatif-absent";
      prevu: IngredientDeRecette;
    };

export type HorsPlage = "courte" | "longue" | undefined;

export type ComparaisonDePhase =
  | {
      id: string;
      libelle: string;
      etat: "realisee" | "en-cours";
      reelle: PhaseDeRealisation;
      cible: PhaseDeRecette;
      duree: Duree & { horsPlage: HorsPlage };
      temperature?: { horsPlage: boolean };
    }
  | { id: string; libelle: string; etat: "ajoutee"; reelle: PhaseDeRealisation }
  | {
      id: string;
      libelle: string;
      etat: "absente" | "a-venir";
      cible: PhaseDeRecette;
    };

export interface Comparaison {
  versionDifferente: boolean;
  ingredients: ComparaisonDIngredient[];
  phases: ComparaisonDePhase[];
}

function comparerIngredient(
  prevu: IngredientDeRecette,
  employe: IngredientDeRealisation,
): ComparaisonDIngredient {
  // Cent grammes de feuilles fraîches ne valent pas cent grammes de feuilles séchées : pas d'écart de quantité quand la conservation diffère.
  const conservationDifferente =
    prevu.conservation !== undefined &&
    employe.conservation !== undefined &&
    prevu.conservation !== employe.conservation;
  const converti = versUnite(employe, prevu.unite);
  const ligne = {
    ingredient: prevu.ingredient,
    etat: "employe" as const,
    prevu,
    employe,
    conservationDifferente,
    incomparable: converti === undefined,
  };
  if (conservationDifferente || converti === undefined) return ligne;
  const ecart = arrondi(converti - prevu.quantite);
  return {
    ...ligne,
    ecart: {
      quantite: ecart,
      unite: prevu.unite,
      pourcentage: arrondi((ecart / prevu.quantite) * 100),
    },
  };
}

function horsDeLaPlage(duree: Duree, cible?: { min: string; max: string }) {
  if (!cible) return undefined;
  const min = dureeIso(cible.min);
  const max = dureeIso(cible.max);
  if (max !== undefined && duree.ms > max) return "longue";
  // Une phase en cours n'est pas encore trop courte : elle n'est pas finie.
  if (min !== undefined && duree.ms < min && !duree.enCours) return "courte";
  return undefined;
}

export function comparer(
  realisation: Realisation,
  recette: Recette,
  maintenant: number,
): Comparaison {
  const ingredients: ComparaisonDIngredient[] = recette.ingredients.map(
    (prevu) => {
      const employe = realisation.ingredients.find(
        (i) => i.ingredient === prevu.ingredient && !i.ajoute,
      );
      if (employe) return comparerIngredient(prevu, employe);
      return {
        ingredient: prevu.ingredient,
        etat: prevu.optionnel ? "facultatif-absent" : "manquant",
        prevu,
      };
    },
  );
  const prevus = new Set(recette.ingredients.map((i) => i.ingredient));
  for (const employe of realisation.ingredients)
    if (employe.ajoute || !prevus.has(employe.ingredient))
      ingredients.push({
        ingredient: employe.ingredient,
        etat: "ajoute",
        employe,
      });

  const enCours = realisation.statut === "en-cours";
  const phases: ComparaisonDePhase[] = recette.phases.map((cible) => {
    const reelle = realisation.phases.find(
      (p) => p.id === cible.id && !p.ajoutee,
    );
    if (!reelle)
      return {
        id: cible.id,
        libelle: cible.libelle,
        etat: enCours ? "a-venir" : "absente",
        cible,
      };
    const duree = dureeDePhase(reelle, maintenant);
    const relevee = reelle.temperatureC;
    const visee = cible.temperatureC;
    return {
      id: cible.id,
      libelle: cible.libelle,
      etat: duree.enCours ? "en-cours" : "realisee",
      reelle,
      cible,
      duree: { ...duree, horsPlage: horsDeLaPlage(duree, cible.dureeCible) },
      temperature:
        relevee && visee
          ? { horsPlage: relevee.min < visee.min || relevee.max > visee.max }
          : undefined,
    };
  });
  const ciblees = new Set(recette.phases.map((p) => p.id));
  for (const reelle of realisation.phases)
    if (reelle.ajoutee || !ciblees.has(reelle.id))
      phases.push({
        id: reelle.id,
        libelle: reelle.id,
        etat: "ajoutee",
        reelle,
      });

  return {
    versionDifferente: realisation.recetteVersion !== recette.version,
    ingredients,
    phases,
  };
}

// --- Les dégustations (RG-degustation-d-une-realisation) ---

export interface Degustation {
  entree: EntreeDuJournal;
  delai: Delai;
  avis: Avis[];
  // Les critères notés par au moins un participant, dans l'ordre de la liste fermée.
  criteres: Critere[];
  moyennes: Partial<Record<Critere, number>>;
}

const criteresNotes = (avis: Avis[]): Critere[] =>
  CRITERES.filter((c) => avis.some((a) => a.criteres[c] !== undefined));

// De la plus ancienne à la plus récente : c'est dans ce sens qu'une liqueur vieillit.
export function degustationsDe(
  realisation: { debut: string; fin?: string },
  journal: EntreeDuJournal[],
): Degustation[] {
  return journal
    .filter((e) => e.evenement === "degustation" && e.avis.length > 0)
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.chemin.localeCompare(b.chemin),
    )
    .map((entree) => {
      const criteres = criteresNotes(entree.avis);
      const moyennes: Partial<Record<Critere, number>> = {};
      for (const critere of criteres) {
        const notes = entree.avis.flatMap((a) => a.criteres[critere] ?? []);
        moyennes[critere] = arrondi(
          notes.reduce((s, n) => s + n, 0) / notes.length,
        );
      }
      return {
        entree,
        delai: delaiDeDegustation(realisation, entree.date),
        avis: entree.avis,
        criteres,
        moyennes,
      };
    });
}

// L'évolution de chaque critère, une moyenne par dégustation ; une dégustation qui ne l'a pas noté n'a pas de valeur, et non zéro.
export function evolutionDesCriteres(
  degustations: Degustation[],
): { critere: Critere; moyennes: (number | undefined)[] }[] {
  return CRITERES.filter((c) =>
    degustations.some((d) => d.moyennes[c] !== undefined),
  ).map((critere) => ({
    critere,
    moyennes: degustations.map((d) => d.moyennes[critere]),
  }));
}

// --- La liste des recettes (RG-entree-des-recettes) ---

export interface RecetteRangee {
  recette: Recette;
  variantes: RecetteRangee[];
}

// L'ordre de la liste fermée des catégories ; une catégorie inconnue vient après.
const CATEGORIES = ["liqueur", "sirop", "conserve", "fermentation", "autre"];
const rangDeCategorie = (c: string) =>
  CATEGORIES.includes(c) ? CATEGORIES.indexOf(c) : CATEGORIES.length;

const parNom = (a: Recette, b: Recette) => a.nom.localeCompare(b.nom, "fr");

// Rangées par catégorie puis par nom, chaque variante sous la recette dont elle dérive. Une variante dont la source manque, ou qu'une chaîne de `derive_de` ramène à elle-même, reste à la racine plutôt que de disparaître.
export function recettesParCategorie(
  recettes: Recette[],
): { categorie: string; recettes: RecetteRangee[] }[] {
  const ids = new Set(recettes.map((r) => r.id));
  const variantesDe = (id: string) =>
    recettes.filter((r) => r.deriveDe === id).sort(parNom);
  const placees = new Set<string>();
  const ranger = (recette: Recette): RecetteRangee => {
    placees.add(recette.id);
    return {
      recette,
      variantes: variantesDe(recette.id)
        .filter((v) => !placees.has(v.id))
        .map(ranger),
    };
  };
  const racines = recettes
    .filter((r) => !r.deriveDe || !ids.has(r.deriveDe))
    .sort(parNom)
    .map(ranger);
  for (const restee of [...recettes].sort(parNom))
    if (!placees.has(restee.id)) racines.push(ranger(restee));

  const categories = [...new Set(racines.map((r) => r.recette.categorie))].sort(
    (a, b) => rangDeCategorie(a) - rangDeCategorie(b) || a.localeCompare(b),
  );
  return categories.map((categorie) => ({
    categorie,
    recettes: racines
      .filter((r) => r.recette.categorie === categorie)
      .sort((a, b) => parNom(a.recette, b.recette)),
  }));
}
