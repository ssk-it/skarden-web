// RG-fin-de-phase-declaree-depuis-le-site : ce que la déclaration de la fin d'une phase change dans le dépôt, dit dans le vocabulaire des fiches. Rien n'y parle de GitHub.

import { FicheInvalide, lireFiche } from "./format";
import { libelleDateOuInstant } from "./libelles";
import { FicheNonModifiable } from "./photos-ajoutees";
import { instant, maintenantAParis } from "./transformations";

export class PhaseIntrouvable extends Error {
  constructor(readonly phase: string) {
    super(`la phase ${phase} n'est pas dans la fiche`);
    this.name = "PhaseIntrouvable";
  }
}

export class PhaseDejaClose extends Error {
  constructor(
    readonly phase: string,
    readonly fin: string,
  ) {
    super(`la phase ${phase} a déjà une fin, ${fin}`);
    this.name = "PhaseDejaClose";
  }
}

const deux = (n: number) => String(n).padStart(2, "0");

// L'instant de la branche se lit à l'heure du visiteur, comme pour une photo ; l'entrée se range au jour de la fin.
export function nommerFinDePhase({
  fichier,
  phase,
  fin,
  journal,
  instant: maintenant,
}: {
  fichier: string;
  phase: string;
  fin: string;
  journal: string;
  instant: Date;
}): { branche: string; entree: string } {
  const horodatage = `${maintenant.getFullYear()}${deux(maintenant.getMonth() + 1)}${deux(maintenant.getDate())}-${deux(maintenant.getHours())}${deux(maintenant.getMinutes())}`;
  const sansDate = fichier.replace(/^\d{4}-\d{2}-\d{2}-/, "");
  const jour = fin.slice(0, 10);
  return {
    branche: `phases/${fichier}-${phase}-${horodatage}`,
    entree: `${journal}/${jour.slice(0, 4)}/${jour}-${sansDate}-fin-de-${phase}.md`,
  };
}

export type ErreurDeFin = "invalide" | "avant-le-debut" | "a-venir";

const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

// RG-phases-d-une-realisation : une fin n'est pas antérieure au début ; face à un début sans heure, seuls les jours se comparent. Une fin à venir n'est pas encore une fin.
export function erreurDeFin(
  debut: string,
  fin: string,
  maintenant: number,
): ErreurDeFin | undefined {
  if (!INSTANT.test(fin) || Number.isNaN(instant(fin))) return "invalide";
  const longueur = Math.min(debut.length, fin.length);
  if (fin.slice(0, longueur) < debut.slice(0, longueur))
    return "avant-le-debut";
  if (instant(fin) > maintenant) return "a-venir";
  return undefined;
}

const FRONTMATTER = /^(---\r?\n)([\s\S]*?)(\r?\n---(?:\r?\n|$))/;
const ELEMENT_EN_BLOC = /^(\s*)- id:\s*(\S+)\s*$/;
const ELEMENT_EN_LIGNE = /^(\s*)- \{(.*)\}\s*$/;

// INV-2 de skarden : la fiche reste celle qu'on a écrite. La fin s'écrit par une retouche du texte, sous le début de la phase, et non par une réécriture du YAML. Une forme que la retouche ne sait pas prendre est refusée, et la fiche relue doit dire exactement ce qu'elle disait, plus cette fin.
export function ecrireLaFin(texte: string, phase: string, fin: string): string {
  const avant = lire(texte);
  const phases = avant.donnees.phases;
  const lue = Array.isArray(phases)
    ? (phases as { id?: unknown; fin?: unknown }[]).find((p) => p?.id === phase)
    : undefined;
  if (!lue) throw new PhaseIntrouvable(phase);
  if (lue.fin) throw new PhaseDejaClose(phase, String(lue.fin));

  const morceaux = FRONTMATTER.exec(texte);
  if (!morceaux)
    throw new FicheNonModifiable("la fiche n'a pas de frontmatter");
  const [entier, ouverture, frontmatter = "", fermeture] = morceaux;
  const finDeLigne = frontmatter.includes("\r\n") ? "\r\n" : "\n";
  const lignes = frontmatter.split(/\r?\n/);
  const debutDesPhases = lignes.findIndex((l) => /^phases:\s*$/.test(l));
  if (debutDesPhases === -1)
    throw new FicheNonModifiable("le champ phases n'a pas une forme connue");
  retoucher(lignes, debutDesPhases, phase, fin);

  const modifie = `${ouverture}${lignes.join(finDeLigne)}${fermeture}${texte.slice(entier.length)}`;
  verifier(avant, lire(modifie), phase, fin);
  return modifie;
}

function retoucher(
  lignes: string[],
  debutDesPhases: number,
  phase: string,
  fin: string,
) {
  for (let i = debutDesPhases + 1; i < lignes.length; i++) {
    const ligne = lignes[i] ?? "";
    if (!/^\s/.test(ligne)) break;
    const enLigne = ELEMENT_EN_LIGNE.exec(ligne);
    if (
      enLigne &&
      new RegExp(`(^|,)\\s*id:\\s*${phase}\\s*(,|$)`).test(enLigne[2] ?? "")
    ) {
      // Une fin vide se remplace ; sinon la fin s'insère juste après la valeur du début. Le reste de la ligne ne bouge pas, accolades imbriquées comprises.
      const finVide = /(\bfin:)[ \t]*(?:null|~)?(?=\s*[,}])/;
      const debut = /(\bdebut:\s*[^,}\s]+)/;
      if (finVide.test(ligne)) lignes[i] = ligne.replace(finVide, `$1 ${fin}`);
      else if (debut.test(ligne))
        lignes[i] = ligne.replace(debut, `$1, fin: ${fin}`);
      else break;
      return;
    }
    const enBloc = ELEMENT_EN_BLOC.exec(ligne);
    if (enBloc?.[2] !== phase) continue;
    const indentation = `${enBloc[1]}  `;
    let j = i + 1;
    let debut = -1;
    let finVide = -1;
    for (
      ;
      j < lignes.length && (lignes[j] ?? "").startsWith(indentation);
      j++
    ) {
      if ((lignes[j] ?? "").startsWith(`${indentation}debut:`)) debut = j;
      if ((lignes[j] ?? "").startsWith(`${indentation}fin:`)) finVide = j;
    }
    if (finVide !== -1) {
      lignes[finVide] = `${indentation}fin: ${fin}`;
      return;
    }
    if (debut === -1) break;
    lignes.splice(debut + 1, 0, `${indentation}fin: ${fin}`);
    return;
  }
  throw new FicheNonModifiable("la phase n'a pas une forme connue");
}

function lire(texte: string) {
  try {
    return lireFiche(texte);
  } catch (erreur) {
    if (erreur instanceof FicheInvalide)
      throw new FicheNonModifiable(erreur.message);
    throw erreur;
  }
}

function verifier(
  avant: ReturnType<typeof lireFiche>,
  apres: ReturnType<typeof lireFiche>,
  phase: string,
  fin: string,
) {
  const attendues = (avant.donnees.phases as Record<string, unknown>[]).map(
    (p) => (p.id === phase ? { ...p, fin } : p),
  );
  const sansPhases = (donnees: Record<string, unknown>) =>
    JSON.stringify({ ...donnees, phases: undefined });
  if (
    !memesPhases(apres.donnees.phases, attendues) ||
    sansPhases(apres.donnees) !== sansPhases(avant.donnees) ||
    apres.corps !== avant.corps
  )
    throw new FicheNonModifiable(
      "la phase n'a pas une forme que le site sait compléter",
    );
}

// L'ordre des champs d'une phase ne compte pas : la fin a pu remplacer une fin vide.
function memesPhases(lues: unknown, attendues: Record<string, unknown>[]) {
  if (!Array.isArray(lues) || lues.length !== attendues.length) return false;
  const trie = (p: Record<string, unknown>) =>
    JSON.stringify(Object.entries(p).sort(([a], [b]) => a.localeCompare(b)));
  return lues.every(
    (p, i) => trie(p as Record<string, unknown>) === trie(attendues[i] ?? {}),
  );
}

// RG-entree-du-journal : une fin de phase nomme sa phase, et se date du jour de la fin.
export function entreeDeFin({
  realisation,
  phase,
  libelle,
  fin,
  remarque,
}: {
  realisation: string;
  phase: string;
  libelle: string;
  fin: string;
  remarque: string;
}): string {
  const corps =
    remarque.trim() ||
    `Fin de la phase « ${libelle} » le ${libelleDateOuInstant(fin)}.`;
  return `---\ndate: ${fin.slice(0, 10)}\nrealisation: ${realisation}\nevenement: fin-de-phase\nphase: ${phase}\n---\n\n${corps}\n`;
}

// L'instant présent à l'heure de Paris, sous la forme qu'une fin s'écrit : AAAA-MM-JJTHH:MM.
export function instantAParis(maintenant = new Date()): string {
  return new Date(maintenantAParis(maintenant)).toISOString().slice(0, 16);
}
