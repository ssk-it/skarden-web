// RG-photo-postee-depuis-le-site, ADR-photos-postees-par-une-branche : un envoi de photos, de la branche à la fusion, par le chemin commun des écritures du site.

import type { EcrivainDuDepot } from "../depot/ecrivain";
import {
  ecrireParUneDemande,
  type OptionsDEnvoi,
  type Suivi,
} from "./ecriture-par-demande";
import { ajouterAuxPhotos, nommerEnvoi } from "./photos-ajoutees";

export type {
  Echec,
  Etape,
  OptionsDEnvoi,
  Suivi,
} from "./ecriture-par-demande";

export interface Envoi {
  // Le dossier de la collection, que `referentiel.yml` déclare.
  dossier: string;
  // Le nom du fichier de la fiche, sans `.md`.
  fichier: string;
  photos: Blob[];
}

export function posterPhotos(
  ecrivain: EcrivainDuDepot,
  { dossier, fichier, photos }: Envoi,
  signaler: (suivi: Suivi) => void,
  {
    maintenant = new Date(),
    ...options
  }: OptionsDEnvoi & { maintenant?: Date } = {},
): Promise<Suivi> {
  const cheminDeLaFiche = `${dossier}/${fichier}.md`;
  return ecrireParUneDemande(
    ecrivain,
    {
      titre: `Ajouter ${photos.length} photo${photos.length > 1 ? "s" : ""} à ${cheminDeLaFiche}`,
      corps:
        "Photos envoyées depuis skarden-web, converties en pointeurs LFS par photos-en-lfs.yml (ADR-photos-postees-par-une-branche).",
      conversion: true,
      async preparer() {
        const { texte, base } =
          await ecrivain.lireFicheSurLaBase(cheminDeLaFiche);
        const { branche, chemins } = nommerEnvoi(
          dossier,
          fichier,
          maintenant,
          photos.length,
        );
        const completee = ajouterAuxPhotos(texte, chemins);
        return {
          branche,
          base,
          fichiers: [
            ...photos.map((contenu, i) => ({
              chemin: chemins[i] as string,
              contenu,
            })),
            { chemin: cheminDeLaFiche, contenu: completee },
          ],
        };
      },
    },
    signaler,
    options,
  );
}
