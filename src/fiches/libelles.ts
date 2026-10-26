// Les valeurs énumérées s'écrivent en kebab-case sans accent (RG-valeurs-enumerees-fermees) ; l'écran les rend en français.

const ACCENTUES: Record<string, string> = {
  legume: "légume",
  modere: "modéré",
  regulier: "régulier",
  terminee: "terminée",
  recolte: "récolte",
  serre: "serre",
  jardiniere: "jardinière",
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
