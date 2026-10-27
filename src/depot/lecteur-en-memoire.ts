import { FichierIntrouvable, type LecteurDuDepot } from "./lecteur";

// Un dépôt tenu en mémoire, pour les tests : chaque fichier a pour empreinte son chemin, et chaque lecture est consignée.
export function lecteurEnMemoire(
  contenus: Record<string, string>,
): LecteurDuDepot & { lus: string[] } {
  const lus: string[] = [];
  const lire = (chemin: string) => {
    const contenu = contenus[chemin];
    if (contenu === undefined) throw new FichierIntrouvable(chemin);
    lus.push(chemin);
    return contenu;
  };
  return {
    lus,
    fichiers: Object.keys(contenus).map((chemin) => ({
      chemin,
      empreinte: chemin,
    })),
    lireTexte: async (chemin) => lire(chemin),
    lirePhoto: async (chemin) => new Blob([lire(chemin)]),
  };
}
