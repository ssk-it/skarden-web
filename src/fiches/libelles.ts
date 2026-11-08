import { composantesIso, type Delai, type Quantite } from "./transformations";

// Les valeurs énumérées s'écrivent en kebab-case sans accent (RG-valeurs-enumerees-fermees) ; l'écran les rend en français.

const ACCENTUES: Record<string, string> = {
  legume: "légume",
  modere: "modéré",
  regulier: "régulier",
  terminee: "terminée",
  recolte: "récolte",
  serre: "serre",
  jardiniere: "jardinière",
  // L'animal (RG-valeurs-enumerees-fermees, cadrage 2026-003).
  elevage: "élevage",
  vegetal: "végétal",
  "eau-salee": "eau salée",
  encadree: "encadrée",
  protegee: "protégée",
  "temperature-c": "température (°C)",
  "humidite-pct": "humidité (%)",
  "salinite-g-l": "salinité (g/L)",
  ph: "pH",
  "a-eviter": "à éviter",
  reveil: "réveil",
  activite: "activité",
  preparation: "préparation",
  "par-m2-sol": "par m² au sol",
  "farine-d-elevage": "farine d'élevage",
  "eau-verte": "eau verte",
  oeufs: "œufs",
  parthenogenese: "parthénogenèse",
  oeuf: "œuf",
  neonate: "néonate",
  juvenile: "juvénile",
  controle: "contrôle",
  "renouvellement-substrat": "renouvellement du substrat",
  "changement-d-eau": "changement d'eau",
  aeration: "aération",
  quotidienne: "chaque jour",
  hebdomadaire: "chaque semaine",
  mensuelle: "chaque mois",
  bimestrielle: "tous les deux mois",
  saisonniere: "à chaque saison",
  eclosoir: "éclosoir",
  prelevement: "prélèvement",
  eclosion: "éclosion",
  // Les transformations (RG-valeurs-enumerees-fermees, cadrage 2026-007).
  seche: "séché",
  congele: "congelé",
  fut: "fût",
  gres: "grès",
  degustation: "dégustation",
  limpidite: "limpidité",
  equilibre: "équilibre",
};

export function libelle(valeur: string): string {
  return ACCENTUES[valeur] ?? valeur.replaceAll("-", " ");
}

const PERIODES: Record<string, string> = {
  semis_interieur: "Semis à l'intérieur",
  semis_exterieur: "Semis à l'extérieur",
  plantation: "Plantation",
  floraison: "Floraison",
  recolte: "Récolte",
  taille: "Taille",
};

export const libellePeriode = (periode: string) =>
  PERIODES[periode] ?? periode.replaceAll("_", " ");

const MOIS = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  timeZone: "UTC",
});
export const libelleMois = (mois: number) =>
  MOIS.format(new Date(Date.UTC(2000, mois - 1, 1)));

// Une date AAAA-MM-JJ, sans fuseau : « 2 mai 2026 ».
const DATE = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
export const libelleDate = (date: string) => {
  const jour = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(jour.getTime()) ? date : DATE.format(jour);
};

// Un nombre à la française : « 0,54 », « 215 ».
const NOMBRE = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
export const libelleNombre = (nombre: number) => NOMBRE.format(nombre);

const pluriel = (n: number, mot: string) =>
  n >= 2 && !mot.endsWith("s") ? `${mot}s` : mot;

// RG-quantite-et-unite : « 29 g », « 0,5 l », « 2 pincées ».
const UNITES: Record<string, string> = {
  piece: "pièce",
  pincee: "pincée",
  cac: "c. à café",
  cas: "c. à soupe",
};
export function libelleQuantite({ quantite, unite }: Quantite): string {
  const mot = UNITES[unite];
  const nom =
    mot && (unite === "piece" || unite === "pincee")
      ? pluriel(quantite, mot)
      : (mot ?? unite);
  return `${libelleNombre(quantite)} ${nom}`;
}

const HEURE = 3600 * 1000;
const JOUR = 24 * HEURE;

// Une durée calculée de dates (RG-phases-d-une-realisation) : en heures sous un jour, en jours au-delà, les heures tant qu'elles comptent encore.
export function libelleDuree(ms: number): string {
  const jours = Math.floor(ms / JOUR);
  const heures = Math.floor((ms % JOUR) / HEURE);
  if (jours === 0) return heures === 0 ? "moins d'une heure" : `${heures} h`;
  const enJours = `${jours} ${pluriel(jours, "jour")}`;
  return jours < 7 && heures > 0 ? `${enJours} et ${heures} h` : enJours;
}

// Une durée ISO 8601 en mots : « 3 jours », « 1 an et 2 mois ».
const enMots = (duree: string) => {
  const mots = composantesIso(duree).map(
    ([n, mot]) => `${n} ${pluriel(n, mot)}`,
  );
  return mots.length === 0
    ? duree
    : mots.length === 1
      ? (mots[0] ?? duree)
      : `${mots.slice(0, -1).join(", ")} et ${mots.at(-1)}`;
};

// RG-champs-de-la-fiche-recette : une plage de durées ; « 3 à 5 jours » quand les deux bornes ont la même unité.
export function libellePlageDeDurees({
  min,
  max,
}: {
  min: string;
  max: string;
}): string {
  if (min === max) return enMots(min);
  const bas = composantesIso(min);
  const haut = composantesIso(max);
  const [nBas, uBas] = bas[0] ?? [];
  const [nHaut, uHaut] = haut[0] ?? [];
  if (bas.length === 1 && haut.length === 1 && uBas === uHaut && uHaut)
    return `${nBas} à ${nHaut} ${pluriel(nHaut ?? 0, uHaut)}`;
  return `de ${enMots(min)} à ${enMots(max)}`;
}

// RG-degustation-d-une-realisation : le délai se calcule, et dit depuis quand il se compte.
export function libelleDelai({ depuis, jours }: Delai): string {
  if (depuis === "fin") {
    if (jours === 0) return "le jour de la fin";
    const mois = Math.round(jours / 30);
    const environ = mois >= 1 && jours >= 30 ? `, environ ${mois} mois` : "";
    return `${jours} ${pluriel(jours, "jour")} après la fin${environ}`;
  }
  const quand =
    jours === 0
      ? "le jour du début"
      : `${jours} ${pluriel(jours, "jour")} après le début`;
  return `${quand}, avant la fin`;
}
