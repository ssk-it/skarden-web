// Le chemin d'une écriture du site dans le dépôt (ADR-donnees-dans-un-depot-a-part) : un commit sur une branche, une conversion quand il y a lieu, puis une demande de fusion suivie jusqu'à la fusion. Chaque étape se dit ; une étape qui échoue s'arrête là, et rien n'atteint la branche par défaut. Les photos (RG-photo-postee-depuis-le-site) et la fin d'une phase (RG-fin-de-phase-declaree-depuis-le-site) le prennent tous deux.

import {
  EcritureRefusee,
  type AvancementDeLAction,
  type Controles,
  type EcrivainDuDepot,
  type FichierEcrit,
} from "../depot/ecrivain";
import { FichierIntrouvable } from "../depot/lecteur";
import { PhaseDejaClose, PhaseIntrouvable } from "./fin-de-phase";
import { FicheNonModifiable } from "./photos-ajoutees";

export type Etape = "envoi" | "conversion" | "verification" | "fusion";

export type Echec =
  | { raison: "jeton-refuse" }
  | { raison: "reseau" }
  | { raison: "refusee"; message: string }
  | { raison: "fiche-absente" }
  | { raison: "fiche-non-modifiable"; message: string }
  | { raison: "phase-introuvable" }
  | { raison: "phase-deja-close"; fin: string }
  | { raison: "declaration-en-attente"; adresse?: string }
  | { raison: "conversion-absente" }
  | { raison: "conversion-echouee"; adresse: string }
  | { raison: "conversion-trop-longue"; adresse?: string }
  | { raison: "controles-rouges"; adresse: string }
  | { raison: "fusion-automatique-refusee"; adresse: string }
  | { raison: "fusion-trop-longue"; adresse: string };

export interface Suivi {
  faites: Etape[];
  enCours?: Etape;
  // La branche par défaut a avancé : la demande attend d'être mise à jour, comme le veut sa règle.
  aMettreAJour: boolean;
  demande?: string;
  echec?: Echec;
  // L'heure, en millisecondes, où chaque étape a commencé et fini : le site en tire leur durée.
  debuts: Partial<Record<Etape, number>>;
  fins: Partial<Record<Etape, number>>;
  // L'Action qui convertit, dès que GitHub l'a créée, et où elle en est.
  action?: string;
  conversion?: AvancementDeLAction;
  // Les contrôles de la demande de fusion, comptés.
  controles?: Controles;
}

// Ce qu'une écriture pose sur sa branche, préparé une fois la fiche relue sur la base : un défaut de préparation s'arrête avant que rien ne soit créé.
export interface Ecriture {
  titre: string;
  corps: string;
  // L'Action du dépôt convertit-elle la branche avant la demande de fusion ?
  conversion: boolean;
  preparer(): Promise<{
    branche: string;
    base: string;
    fichiers: FichierEcrit[];
  }>;
}

// Une écriture qui renonce avant le commit, avec sa raison.
export class Renoncement extends Error {
  constructor(readonly echec: Echec) {
    super(echec.raison);
    this.name = "Renoncement";
  }
}

export interface OptionsDEnvoi {
  attendre?: (millisecondes: number) => Promise<void>;
  horloge?: () => number;
}

// Une conversion prend une à deux minutes ; les contrôles et la fusion, quelques minutes de plus.
const CONVERSION = { intervalle: 5_000, tours: 72 };
const DEMANDE = { intervalle: 10_000, tours: 120 };

const attendreVraiment = (millisecondes: number) =>
  new Promise<void>((resoudre) => setTimeout(resoudre, millisecondes));

export async function ecrireParUneDemande(
  ecrivain: EcrivainDuDepot,
  { titre, corps, conversion: aConvertir, preparer }: Ecriture,
  signaler: (suivi: Suivi) => void,
  { attendre = attendreVraiment, horloge = Date.now }: OptionsDEnvoi = {},
): Promise<Suivi> {
  const suivi: Suivi = {
    faites: [],
    aMettreAJour: false,
    debuts: {},
    fins: {},
  };
  const publier = () => {
    const copie = {
      ...suivi,
      faites: [...suivi.faites],
      debuts: { ...suivi.debuts },
      fins: { ...suivi.fins },
    };
    signaler(copie);
    return copie;
  };
  const commencer = (etape: Etape) => {
    suivi.enCours = etape;
    suivi.debuts[etape] = horloge();
    publier();
  };
  const finir = () => {
    if (suivi.enCours) {
      suivi.faites.push(suivi.enCours);
      suivi.fins[suivi.enCours] = horloge();
    }
    suivi.enCours = undefined;
  };
  // Ne publie que ce qui change : la zone vivante n'annonce pas deux fois la même chose.
  const noter = <C extends "action" | "conversion" | "controles">(
    champ: C,
    valeur: Suivi[C],
  ) => {
    if (JSON.stringify(suivi[champ]) === JSON.stringify(valeur)) return;
    suivi[champ] = valeur;
    publier();
  };
  const echouer = (echec: Echec) => {
    suivi.echec = echec;
    return publier();
  };

  try {
    commencer("envoi");
    const { branche, base, fichiers } = await preparer();
    const commit = await ecrivain.commiterSurUneBranche({
      branche,
      base,
      message: titre,
      fichiers,
    });
    finir();

    if (aConvertir) {
      commencer("conversion");
      let convertie = false;
      for (let tour = 0; tour < CONVERSION.tours && !convertie; tour++) {
        const conversion = await ecrivain.conversion(branche, commit);
        if (conversion.etat === "absente")
          return echouer({ raison: "conversion-absente" });
        if (conversion.etat === "echouee")
          return echouer({
            raison: "conversion-echouee",
            adresse: conversion.adresse,
          });
        if (conversion.etat === "reussie") convertie = true;
        else {
          if (conversion.adresse) noter("action", conversion.adresse);
          if (conversion.statut)
            noter("conversion", {
              statut: conversion.statut,
              ...(conversion.etape && { etape: conversion.etape }),
            });
          await attendre(CONVERSION.intervalle);
        }
      }
      if (!convertie)
        return echouer({
          raison: "conversion-trop-longue",
          adresse: suivi.action,
        });
      suivi.conversion = undefined;
      finir();
    }

    commencer("verification");
    const demande = await ecrivain.ouvrirDemande({
      branche,
      titre,
      corps,
    });
    suivi.demande = demande.adresse;
    publier();
    try {
      await ecrivain.demanderLaFusionAutomatique(demande);
    } catch (erreur) {
      if (
        erreur instanceof EcritureRefusee &&
        erreur.raison === "fusion-automatique-refusee"
      )
        return echouer({
          raison: "fusion-automatique-refusee",
          adresse: demande.adresse,
        });
      throw erreur;
    }
    for (let tour = 0; tour < DEMANDE.tours; tour++) {
      const { etat, controles } = await ecrivain.etatDeLaDemande(demande);
      if (controles && etat !== "fusionnee") noter("controles", controles);
      if (etat === "controles-rouges")
        return echouer({
          raison: "controles-rouges",
          adresse: demande.adresse,
        });
      if (
        (etat === "verifiee" || etat === "fusionnee") &&
        suivi.enCours === "verification"
      ) {
        finir();
        commencer("fusion");
      }
      if (etat === "fusionnee") {
        finir();
        return publier();
      }
      if (suivi.aMettreAJour !== (etat === "a-mettre-a-jour")) {
        suivi.aMettreAJour = etat === "a-mettre-a-jour";
        publier();
      }
      await attendre(DEMANDE.intervalle);
    }
    return echouer({ raison: "fusion-trop-longue", adresse: demande.adresse });
  } catch (erreur) {
    if (erreur instanceof Renoncement) return echouer(erreur.echec);
    if (erreur instanceof PhaseIntrouvable)
      return echouer({ raison: "phase-introuvable" });
    if (erreur instanceof PhaseDejaClose)
      return echouer({ raison: "phase-deja-close", fin: erreur.fin });
    if (erreur instanceof FichierIntrouvable)
      return echouer({ raison: "fiche-absente" });
    if (erreur instanceof FicheNonModifiable)
      return echouer({
        raison: "fiche-non-modifiable",
        message: erreur.message,
      });
    if (erreur instanceof EcritureRefusee) {
      if (erreur.raison === "jeton-refuse" || erreur.raison === "reseau")
        return echouer({ raison: erreur.raison });
      return echouer({ raison: "refusee", message: erreur.message });
    }
    throw erreur;
  }
}
