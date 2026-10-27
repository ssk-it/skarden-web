// Le format que le dépôt de données déclare (`referentiel.yml`) : le site ne le redéfinit pas, il le lit (RG-referentiel-yml-decrit-le-depot).

import { parse } from "yaml";
import { DepotIllisible } from "../depot/lecteur";

// Les collections de la plante sont obligatoires ; celles de l'animal, facultatives : un dépôt qui ne tient que des plantes reste lisible (cadrage 2026-004, décision 04-collections-facultatives).
export const COLLECTIONS_OBLIGATOIRES = [
  "familles",
  "plantes",
  "emplacements",
  "cultures",
  "journal",
] as const;
export const COLLECTIONS_FACULTATIVES = [
  "animaux",
  "elevages",
  "installations",
  "procedures",
] as const;
export type CollectionObligatoire = (typeof COLLECTIONS_OBLIGATOIRES)[number];
export type CollectionFacultative = (typeof COLLECTIONS_FACULTATIVES)[number];
export type Collection = CollectionObligatoire | CollectionFacultative;

// Les versions du format que ce site sait lire.
const VERSIONS_CONNUES = [1];

export interface Referentiel {
  dossiers: Record<CollectionObligatoire, string> &
    Partial<Record<CollectionFacultative, string>>;
}

export function lireReferentiel(texte: string): Referentiel {
  let contenu: unknown;
  try {
    contenu = parse(texte);
  } catch {
    throw new DepotIllisible("format-inconnu");
  }
  const { schema_version, collections } = (contenu ?? {}) as {
    schema_version?: unknown;
    collections?: Record<string, { dossier?: unknown }>;
  };
  if (!VERSIONS_CONNUES.includes(schema_version as number) || !collections) {
    throw new DepotIllisible("format-inconnu");
  }
  const dossiers = {} as Referentiel["dossiers"];
  for (const collection of COLLECTIONS_OBLIGATOIRES) {
    const dossier = collections[collection]?.dossier;
    if (typeof dossier !== "string") throw new DepotIllisible("format-inconnu");
    dossiers[collection] = dossier;
  }
  for (const collection of COLLECTIONS_FACULTATIVES) {
    const declaree = collections[collection];
    if (declaree === undefined || declaree === null) continue;
    if (typeof declaree.dossier !== "string")
      throw new DepotIllisible("format-inconnu");
    dossiers[collection] = declaree.dossier;
  }
  return { dossiers };
}

export class FicheInvalide extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FicheInvalide";
  }
}

export interface FicheLue {
  donnees: Record<string, unknown>;
  corps: string;
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

export function lireFiche(texte: string): FicheLue {
  const morceaux = FRONTMATTER.exec(texte);
  if (!morceaux)
    throw new FicheInvalide(
      "frontmatter absent : la fiche doit commencer par un bloc « --- »",
    );
  let donnees: unknown;
  try {
    donnees = parse(morceaux[1] ?? "");
  } catch {
    throw new FicheInvalide("frontmatter YAML illisible");
  }
  if (
    typeof donnees !== "object" ||
    donnees === null ||
    Array.isArray(donnees)
  ) {
    throw new FicheInvalide("le frontmatter n'est pas une liste de champs");
  }
  return {
    donnees: donnees as Record<string, unknown>,
    corps: texte.slice(morceaux[0].length).replace(/^(\r?\n)+/, ""),
  };
}
