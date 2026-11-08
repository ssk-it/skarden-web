// Lire un champ du frontmatter : ce que les fiches de toutes les collections partagent.

import { FicheInvalide } from "./format";

export interface Fourchette {
  min: number;
  max: number;
}

// Le dépôt de données vérifie ses fiches contre leurs schémas ; le site ne vérifie que ce dont il a besoin pour afficher, et refuse une fiche à qui cela manque.
export function texte(donnees: Record<string, unknown>, champ: string): string {
  const valeur = donnees[champ];
  if (typeof valeur === "string" && valeur !== "") return valeur;
  // YAML 1.1 lirait une date comme un objet Date ; la bibliothèque `yaml` suit YAML 1.2 et rend une chaîne, mais rien ne coûte de l'accepter.
  if (valeur instanceof Date) return valeur.toISOString().slice(0, 10);
  throw new FicheInvalide(`champ « ${champ} » absent ou vide`);
}

export const facultatif = (donnees: Record<string, unknown>, champ: string) =>
  donnees[champ] === undefined || donnees[champ] === null
    ? undefined
    : texte(donnees, champ);

export const liste = (valeur: unknown): string[] =>
  Array.isArray(valeur)
    ? valeur.filter((v): v is string => typeof v === "string")
    : [];

export const nombre = (valeur: unknown): number | undefined =>
  typeof valeur === "number" && Number.isFinite(valeur) ? valeur : undefined;

export const objet = (valeur: unknown): Record<string, unknown> =>
  typeof valeur === "object" && valeur !== null && !Array.isArray(valeur)
    ? (valeur as Record<string, unknown>)
    : {};

export const objets = (valeur: unknown): Record<string, unknown>[] =>
  Array.isArray(valeur) ? valeur.map(objet) : [];

export const mois = (valeur: unknown): number[] =>
  Array.isArray(valeur)
    ? valeur.filter((m): m is number => typeof m === "number")
    : [];

export function fourchette(valeur: unknown): Fourchette | undefined {
  const { min, max } = objet(valeur);
  const bas = nombre(min);
  const haut = nombre(max);
  return bas === undefined || haut === undefined
    ? undefined
    : { min: bas, max: haut };
}
