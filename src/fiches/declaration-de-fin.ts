// RG-fin-de-phase-declaree-depuis-le-site : la fin d'une phase, de la branche à la fusion, par le chemin commun des écritures du site. Pas de conversion : rien n'y passe par Git LFS.

import type { EcrivainDuDepot } from "../depot/ecrivain";
import {
  Renoncement,
  ecrireParUneDemande,
  type OptionsDEnvoi,
  type Suivi,
} from "./ecriture-par-demande";
import { ecrireLaFin, entreeDeFin, nommerFinDePhase } from "./fin-de-phase";

export interface Declaration {
  // Les dossiers des réalisations et du journal, que `referentiel.yml` déclare.
  dossier: string;
  journal: string;
  // Le nom du fichier de la réalisation, sans `.md`, qui est aussi son identifiant.
  fichier: string;
  phase: string;
  libelle: string;
  // AAAA-MM-JJTHH:MM, à l'heure de Paris, déjà vérifiée par `erreurDeFin`.
  fin: string;
  remarque: string;
}

export function declarerFinDePhase(
  ecrivain: EcrivainDuDepot,
  { dossier, journal, fichier, phase, libelle, fin, remarque }: Declaration,
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
      titre: `Déclarer la fin de la phase ${phase} de ${fichier}`,
      corps: `Fin de la phase ${phase} déclarée depuis skarden-web : ${fin}, à l'heure de Paris (RG-fin-de-phase-declaree-depuis-le-site).`,
      conversion: false,
      async preparer() {
        const { texte, base } =
          await ecrivain.lireFicheSurLaBase(cheminDeLaFiche);
        const close = ecrireLaFin(texte, phase, fin);
        // Une seconde déclaration de la même phase, partie avant que la première ne soit fusionnée, n'en crée pas une autre.
        const enAttente = await ecrivain.brancheEnAttente(
          `phases/${fichier}-${phase}-`,
        );
        if (enAttente)
          throw new Renoncement({
            raison: "declaration-en-attente",
            ...(enAttente.demande && { adresse: enAttente.demande }),
          });
        const { branche, entree } = nommerFinDePhase({
          fichier,
          phase,
          fin,
          journal,
          instant: maintenant,
        });
        return {
          branche,
          base,
          fichiers: [
            { chemin: cheminDeLaFiche, contenu: close },
            {
              chemin: entree,
              contenu: entreeDeFin({
                realisation: fichier,
                phase,
                libelle,
                fin,
                remarque,
              }),
            },
          ],
        };
      },
    },
    signaler,
    options,
  );
}
