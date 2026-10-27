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
