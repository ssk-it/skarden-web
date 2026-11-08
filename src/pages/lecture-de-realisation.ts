// RG-page-d-une-realisation, RG-realisation-face-a-sa-recette : tout ce que la page d'une réalisation affiche, en une colonne comme en face de sa recette. Passer d'une réalisation à une autre de la même recette ne relit aucune fiche déjà lue (RG-fiche-relue-seulement-si-changee).

import type { DepotDeFiches } from "../fiches/depot-de-fiches";
import {
  comparer,
  degustationsDe,
  dureeTotale,
  evolutionDesCriteres,
  maintenantAParis,
  type Contenant,
  type Produit,
  type Realisation,
} from "../fiches/transformations";

// Une lecture par fiche et par dépôt lu : un autre commit est un autre dépôt, et repart de zéro.
const lectures = new WeakMap<DepotDeFiches, Map<string, Promise<unknown>>>();

function lecturesDe(depot: DepotDeFiches) {
  let deja = lectures.get(depot);
  if (!deja) lectures.set(depot, (deja = new Map()));
  return deja;
}

function uneFois<T>(
  depot: DepotDeFiches,
  cle: string,
  lire: () => Promise<T>,
): Promise<T> {
  const deja = lecturesDe(depot);
  if (!deja.has(cle)) deja.set(cle, lire());
  return deja.get(cle) as Promise<T>;
}

// Les réalisations d'une recette sont déjà lues : en choisir une autre ne relit pas sa fiche.
function retenirLesRealisations(depot: DepotDeFiches, liste: Realisation[]) {
  const deja = lecturesDe(depot);
  for (const r of liste)
    if (!deja.has(`realisation:${r.id}`))
      deja.set(`realisation:${r.id}`, Promise.resolve(r));
}

// Les fiches désignées, lues une fois chacune ; une fiche illisible laisse son identifiant à l'écran.
async function lireChacune<T>(
  ids: (string | undefined)[],
  lire: (id: string) => Promise<T>,
): Promise<Map<string, T>> {
  const uniques = [...new Set(ids.filter((id) => id !== undefined))];
  const lues = await Promise.all(
    uniques.map((id) => lire(id).catch(() => undefined)),
  );
  return new Map(
    uniques.flatMap((id, i) => {
      const lue = lues[i];
      return lue === undefined ? [] : [[id, lue] as [string, T]];
    }),
  );
}

const sansEchec = <T>(lecture: Promise<T>) =>
  lecture.catch(() => undefined as T | undefined);

export async function lireLaRealisation(depot: DepotDeFiches, id: string) {
  const realisation = await uneFois(depot, `realisation:${id}`, () =>
    depot.lireRealisation(id),
  );
  const recetteId = realisation.recette;
  const [recette, variantes, autres, produits, contenants, journal] =
    await Promise.all([
      uneFois(depot, `recette:${recetteId}`, () =>
        sansEchec(depot.lireRecette(recetteId)),
      ),
      uneFois(depot, `variantes:${recetteId}`, () =>
        depot.variantesDe(recetteId),
      ),
      uneFois(depot, `realisations:${recetteId}`, async () => {
        const liste = await depot.realisationsDe(recetteId);
        retenirLesRealisations(depot, liste.fiches);
        return liste;
      }),
      lireChacune<Produit>(
        realisation.ingredients.map((i) => i.produit),
        (p) => uneFois(depot, `produit:${p}`, () => depot.lireProduit(p)),
      ),
      lireChacune<Contenant>(
        realisation.phases.map((p) => p.contenant),
        (c) => uneFois(depot, `contenant:${c}`, () => depot.lireContenant(c)),
      ),
      uneFois(depot, `journal:${id}`, () =>
        depot.journalDeRealisation(realisation),
      ),
    ]);
  const source = recette?.deriveDe
    ? await uneFois(depot, `recette:${recette.deriveDe}`, () =>
        sansEchec(depot.lireRecette(recette.deriveDe as string)),
      )
    : undefined;
  const maintenant = maintenantAParis();
  const degustations = degustationsDe(realisation, journal.fiches);
  return {
    realisation,
    recette,
    source,
    variantes: variantes.fiches,
    autres: autres.fiches.filter((r) => r.id !== id),
    produits,
    contenants,
    journal,
    maintenant,
    duree: dureeTotale(realisation, maintenant),
    comparaison: recette && comparer(realisation, recette, maintenant),
    degustations,
    evolution: evolutionDesCriteres(degustations),
  };
}

export type LectureDeRealisation = Awaited<
  ReturnType<typeof lireLaRealisation>
>;
