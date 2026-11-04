// RG-photo-postee-depuis-le-site : ce que l'envoi de photos change dans le dépôt, dit dans le vocabulaire des fiches. Rien n'y parle de GitHub.

import { FicheInvalide, lireFiche } from "./format";

export interface EnvoiNomme {
  branche: string;
  chemins: string[];
}

const deux = (n: number) => String(n).padStart(2, "0");

// L'instant se lit à l'heure du visiteur, celle qu'il a sous les yeux quand il prend la photo.
export function nommerEnvoi(
  dossier: string,
  fichier: string,
  instant: Date,
  nombre: number,
): EnvoiNomme {
  const horodatage = `${instant.getFullYear()}${deux(instant.getMonth() + 1)}${deux(instant.getDate())}-${deux(instant.getHours())}${deux(instant.getMinutes())}`;
  const base = `${fichier}-${horodatage}`;
  return {
    branche: `photos/${base}`,
    chemins: Array.from(
      { length: nombre },
      (_, i) => `medias/${dossier}/${base}-${i + 1}.jpg`,
    ),
  };
}

export class FicheNonModifiable extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FicheNonModifiable";
  }
}

const FRONTMATTER = /^(---\r?\n)([\s\S]*?)(\r?\n---(?:\r?\n|$))/;
const LISTE_EN_LIGNE = /^photos:\s*\[([^\]]*)\]\s*$/;
const ELEMENT_EN_BLOC = /^(\s+)- /;

// INV-2 de skarden : la fiche reste celle qu'on a écrite. Les chemins s'ajoutent à la fin du champ `photos`, créé s'il manque, par une retouche du texte et non par une réécriture du YAML, qui changerait guillemets, commentaires et mise en forme. Une forme que la retouche ne sait pas prendre est refusée, et la fiche relue doit dire exactement ce qu'elle disait, plus les nouveaux chemins.
export function ajouterAuxPhotos(texte: string, chemins: string[]): string {
  const morceaux = FRONTMATTER.exec(texte);
  if (!morceaux)
    throw new FicheNonModifiable("la fiche n'a pas de frontmatter");
  const [entier, ouverture, frontmatter = "", fermeture] = morceaux;
  const fin =
    frontmatter.includes("\r\n") || ouverture?.includes("\r\n") ? "\r\n" : "\n";
  const lignes = frontmatter.split(/\r?\n/);
  const ligne = lignes.findIndex((l) => /^photos\s*:/.test(l));

  if (ligne === -1) {
    lignes.push(`photos: [${chemins.join(", ")}]`);
  } else {
    const enLigne = LISTE_EN_LIGNE.exec(lignes[ligne] ?? "");
    if (enLigne) {
      const deja = (enLigne[1] ?? "").trim();
      lignes[ligne] =
        `photos: [${[...(deja ? [deja] : []), ...chemins].join(", ")}]`;
    } else {
      if ((lignes[ligne] ?? "").replace(/^photos\s*:/, "").trim())
        throw new FicheNonModifiable(
          "le champ photos n'a pas une forme connue",
        );
      let derniere = ligne;
      while (ELEMENT_EN_BLOC.test(lignes[derniere + 1] ?? "")) derniere++;
      const indentation = ELEMENT_EN_BLOC.exec(lignes[derniere] ?? "")?.[1];
      if (indentation === undefined)
        throw new FicheNonModifiable("le champ photos est vide");
      lignes.splice(
        derniere + 1,
        0,
        ...chemins.map((c) => `${indentation}- ${c}`),
      );
    }
  }

  const modifie = `${ouverture}${lignes.join(fin)}${fermeture}${texte.slice(entier.length)}`;
  verifier(texte, modifie, chemins);
  return modifie;
}

function verifier(avant: string, apres: string, chemins: string[]) {
  let lue;
  try {
    lue = { avant: lireFiche(avant), apres: lireFiche(apres) };
  } catch (erreur) {
    if (erreur instanceof FicheInvalide)
      throw new FicheNonModifiable(erreur.message);
    throw erreur;
  }
  const { photos: photosAvant = [], ...autresAvant } = lue.avant.donnees;
  const { photos: photosApres, ...autresApres } = lue.apres.donnees;
  if (
    !Array.isArray(photosAvant) ||
    JSON.stringify(photosApres) !==
      JSON.stringify([...photosAvant, ...chemins]) ||
    JSON.stringify(autresApres) !== JSON.stringify(autresAvant) ||
    lue.apres.corps !== lue.avant.corps
  )
    throw new FicheNonModifiable(
      "le champ photos n'a pas une forme que le site sait compléter",
    );
}
