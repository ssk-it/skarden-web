// RG-photo-postee-depuis-le-site, ADR-photos-postees-par-une-branche : le chemin d'un envoi de photos, de la branche à la fusion. Chaque étape se dit ; une étape qui échoue s'arrête là, et la photo n'atteint pas la branche par défaut.

import { EcritureRefusee, type EcrivainDuDepot } from "../depot/ecrivain";
import { FichierIntrouvable } from "../depot/lecteur";
import {
  FicheNonModifiable,
  ajouterAuxPhotos,
  nommerEnvoi,
} from "./photos-ajoutees";

export type Etape = "envoi" | "conversion" | "verification" | "fusion";

export type Echec =
  | { raison: "jeton-refuse" }
  | { raison: "reseau" }
  | { raison: "refusee"; message: string }
  | { raison: "fiche-absente" }
  | { raison: "fiche-non-modifiable"; message: string }
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
}

export interface Envoi {
  // Le dossier de la collection, que `referentiel.yml` déclare.
  dossier: string;
  // Le nom du fichier de la fiche, sans `.md`.
  fichier: string;
  photos: Blob[];
}

export interface OptionsDEnvoi {
  maintenant?: Date;
  attendre?: (millisecondes: number) => Promise<void>;
}

// Une conversion prend une à deux minutes ; les contrôles et la fusion, quelques minutes de plus.
const CONVERSION = { intervalle: 5_000, tours: 72 };
const DEMANDE = { intervalle: 10_000, tours: 120 };

const attendreVraiment = (millisecondes: number) =>
  new Promise<void>((resoudre) => setTimeout(resoudre, millisecondes));

export async function posterPhotos(
  ecrivain: EcrivainDuDepot,
  { dossier, fichier, photos }: Envoi,
  signaler: (suivi: Suivi) => void,
  { maintenant = new Date(), attendre = attendreVraiment }: OptionsDEnvoi = {},
): Promise<Suivi> {
  const suivi: Suivi = { faites: [], aMettreAJour: false };
  const publier = () => {
    const copie = { ...suivi, faites: [...suivi.faites] };
    signaler(copie);
    return copie;
  };
  const commencer = (etape: Etape) => {
    suivi.enCours = etape;
    publier();
  };
  const finir = () => {
    if (suivi.enCours) suivi.faites.push(suivi.enCours);
    suivi.enCours = undefined;
  };
  const echouer = (echec: Echec) => {
    suivi.echec = echec;
    return publier();
  };

  const cheminDeLaFiche = `${dossier}/${fichier}.md`;
  const titre = `Ajouter ${photos.length} photo${photos.length > 1 ? "s" : ""} à ${cheminDeLaFiche}`;
  try {
    commencer("envoi");
    const { texte, base } = await ecrivain.lireFicheSurLaBase(cheminDeLaFiche);
    const { branche, chemins } = nommerEnvoi(
      dossier,
      fichier,
      maintenant,
      photos.length,
    );
    const completee = ajouterAuxPhotos(texte, chemins);
    const commit = await ecrivain.commiterSurUneBranche({
      branche,
      base,
      message: titre,
      fichiers: [
        ...photos.map((contenu, i) => ({
          chemin: chemins[i] as string,
          contenu,
        })),
        { chemin: cheminDeLaFiche, contenu: completee },
      ],
    });
    finir();

    commencer("conversion");
    let action: string | undefined;
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
        action = conversion.adresse ?? action;
        await attendre(CONVERSION.intervalle);
      }
    }
    if (!convertie)
      return echouer({ raison: "conversion-trop-longue", adresse: action });
    finir();

    commencer("verification");
    const demande = await ecrivain.ouvrirDemande({
      branche,
      titre,
      corps:
        "Photos envoyées depuis skarden-web, converties en pointeurs LFS par photos-en-lfs.yml (ADR-photos-postees-par-une-branche).",
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
      const etat = await ecrivain.etatDeLaDemande(demande);
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
