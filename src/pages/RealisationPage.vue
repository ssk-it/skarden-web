<script setup lang="ts">
import { RouterLink } from "vue-router";
import ComparaisonALaRecette from "../composants/ComparaisonALaRecette.vue";
import DegustationsDeRealisation from "../composants/DegustationsDeRealisation.vue";
import FichesInvalides from "../composants/FichesInvalides.vue";
import MessageErreur from "../composants/MessageErreur.vue";
import PhotosDeFiche from "../composants/PhotosDeFiche.vue";
import TexteDeFiche from "../composants/TexteDeFiche.vue";
import {
  libelle,
  libelleDate,
  libelleDateOuInstant,
  libelleDuree,
  libelleNombre,
  libelleQuantite,
  libelleTemperature,
} from "../fiches/libelles";
import {
  comparer,
  degustationsDe,
  dureeDePhase,
  dureeTotale,
  evolutionDesCriteres,
  maintenantAParis,
  type Contenant,
  type Produit,
} from "../fiches/transformations";
import type { DepotDeFiches } from "../fiches/depot-de-fiches";
import { useChargement, useIdentifiant } from "./contexte";

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

// RG-page-d-une-realisation : on la relit comme elle s'est déroulée, avec ses dates, et on y voit tout de suite ce qui l'a fait réussir ou rater. La comparaison se fait avec la version courante de la recette, sans rien lire de plus que le commit (cadrage 2026-007, décision 06).
const id = useIdentifiant();
const { valeur, erreur, enCours } = useChargement(
  async (depot: DepotDeFiches) => {
    const realisation = await depot.lireRealisation(id.value);
    const [recette, produits, contenants, journal] = await Promise.all([
      depot.lireRecette(realisation.recette).catch(() => undefined),
      lireChacune<Produit>(
        realisation.ingredients.map((i) => i.produit),
        depot.lireProduit,
      ),
      lireChacune<Contenant>(
        realisation.phases.map((p) => p.contenant),
        depot.lireContenant,
      ),
      depot.journalDeRealisation(realisation),
    ]);
    const maintenant = maintenantAParis();
    const degustations = degustationsDe(realisation, journal.fiches);
    return {
      realisation,
      recette,
      produits,
      contenants,
      journal,
      maintenant,
      duree: dureeTotale(realisation, maintenant),
      comparaison: recette && comparer(realisation, recette, maintenant),
      degustations,
      evolution: evolutionDesCriteres(degustations),
    };
  },
  () => id.value,
);

const libelleDePhase = (phaseId: string) =>
  valeur.value?.recette?.phases.find((p) => p.id === phaseId)?.libelle ??
  libelle(phaseId);
</script>

<template>
  <main>
    <p v-if="enCours" class="chargement">Lecture de la fiche…</p>
    <MessageErreur v-else-if="erreur" :erreur="erreur" />
    <article v-else-if="valeur">
      <h2>{{ valeur.realisation.nom }}</h2>
      <dl class="champs" data-test="champs">
        <dt>Recette</dt>
        <dd>
          <RouterLink
            :to="{
              name: 'recette',
              params: { id: valeur.realisation.recette },
            }"
            >{{ valeur.recette?.nom ?? valeur.realisation.recette }}</RouterLink
          >, version {{ valeur.realisation.recetteVersion }} suivie
        </dd>
        <dt>Statut</dt>
        <dd>{{ libelle(valeur.realisation.statut) }}</dd>
        <dt>Période</dt>
        <dd>
          depuis le {{ libelleDateOuInstant(valeur.realisation.debut)
          }}<template v-if="valeur.realisation.fin"
            >, jusqu'au
            {{ libelleDateOuInstant(valeur.realisation.fin) }}</template
          >
        </dd>
        <dt>Durée</dt>
        <dd>
          {{ libelleDuree(valeur.duree.ms)
          }}<template v-if="valeur.duree.enCours">, en cours</template>
        </dd>
      </dl>

      <h3>Ingrédients</h3>
      <p v-if="valeur.realisation.ingredients.length === 0">
        Aucun ingrédient noté.
      </p>
      <ul v-else class="liste" data-test="ingredients">
        <li
          v-for="ingredient in valeur.realisation.ingredients"
          :key="ingredient.ingredient"
        >
          {{ libelleQuantite(ingredient) }} — {{ libelle(ingredient.ingredient)
          }}<template v-if="ingredient.conservation"
            >, {{ libelle(ingredient.conservation) }}</template
          >
          <span v-if="ingredient.ajoute" class="discret">
            (absent de la recette)</span
          >
          <template v-if="ingredient.produit">
            — acheté :
            <RouterLink
              :to="{ name: 'produit', params: { id: ingredient.produit } }"
              >{{
                valeur.produits.get(ingredient.produit)?.nom ??
                ingredient.produit
              }}</RouterLink
            ><template v-if="ingredient.lot"
              >, lot {{ ingredient.lot }}</template
            ><template v-if="ingredient.dluo"
              >, DLUO {{ libelleDate(ingredient.dluo) }}</template
            ><template v-if="ingredient.achat?.date"
              >, acheté le {{ libelleDate(ingredient.achat.date) }}</template
            ><template v-if="ingredient.achat?.lieu">
              à {{ ingredient.achat.lieu }}</template
            ><template v-if="ingredient.achat?.prixEur !== undefined"
              >, {{ libelleNombre(ingredient.achat.prixEur) }} €</template
            >
          </template>
          <template v-else-if="ingredient.culture">
            — récolte de
            <RouterLink
              :to="{ name: 'culture', params: { id: ingredient.culture } }"
              >{{ ingredient.culture }}</RouterLink
            ><template v-if="ingredient.recolte"
              >, cueillie le {{ libelleDate(ingredient.recolte) }}</template
            >
          </template>
        </li>
      </ul>

      <h3>Phases</h3>
      <p v-if="valeur.realisation.phases.length === 0">
        Aucune phase commencée.
      </p>
      <ol v-else class="phases" data-test="frise">
        <li
          v-for="phase in valeur.realisation.phases"
          :key="phase.id"
          data-test="phase"
        >
          <p class="titre">
            {{ libelleDePhase(phase.id)
            }}<span v-if="phase.ajoutee" class="discret">
              (absente de la recette)</span
            >
          </p>
          <dl class="champs">
            <dt>Dates</dt>
            <dd>
              du {{ libelleDateOuInstant(phase.debut)
              }}<template v-if="phase.fin">
                au {{ libelleDateOuInstant(phase.fin) }}</template
              >
            </dd>
            <dt>Durée</dt>
            <dd>
              <template v-if="phase.fin">{{
                libelleDuree(dureeDePhase(phase, valeur.maintenant).ms)
              }}</template>
              <template v-else
                ><strong>en cours</strong>, depuis
                {{
                  libelleDuree(dureeDePhase(phase, valeur.maintenant).ms)
                }}</template
              >
            </dd>
            <template v-if="phase.contenant">
              <dt>Contenant</dt>
              <dd>
                <RouterLink
                  :to="{ name: 'contenant', params: { id: phase.contenant } }"
                  >{{
                    valeur.contenants.get(phase.contenant)?.nom ??
                    phase.contenant
                  }}</RouterLink
                ><template v-if="phase.nombre > 1">
                  × {{ phase.nombre }}</template
                >
              </dd>
            </template>
            <template v-if="phase.temperatureC">
              <dt>Température</dt>
              <dd>
                {{ libelleTemperature(phase.temperatureC)
                }}<template v-if="phase.temperatureC.mesure">
                  ({{ phase.temperatureC.mesure }})</template
                >
              </dd>
            </template>
            <template v-if="phase.conditions">
              <dt>Conditions</dt>
              <dd>{{ phase.conditions }}</dd>
            </template>
          </dl>
        </li>
      </ol>

      <template v-if="valeur.realisation.ecarts.length">
        <h3>Écarts</h3>
        <ul class="liste">
          <li v-for="ecart in valeur.realisation.ecarts" :key="ecart">
            {{ ecart }}
          </li>
        </ul>
      </template>

      <template v-if="valeur.realisation.resultat">
        <h3>Résultat</h3>
        <dl class="champs" data-test="resultat">
          <template v-if="valeur.realisation.resultat.volumeObtenu">
            <dt>Volume obtenu</dt>
            <dd>
              {{ libelleQuantite(valeur.realisation.resultat.volumeObtenu) }}
            </dd>
          </template>
          <template
            v-if="valeur.realisation.resultat.degreEstime !== undefined"
          >
            <dt>Degré estimé</dt>
            <dd>
              {{ libelleNombre(valeur.realisation.resultat.degreEstime) }} % vol
            </dd>
          </template>
        </dl>
      </template>

      <h3>Dégustations</h3>
      <DegustationsDeRealisation
        :degustations="valeur.degustations"
        :evolution="valeur.evolution"
      />

      <h3>Comparaison à la recette</h3>
      <div data-test="comparaison">
        <ComparaisonALaRecette
          v-if="valeur.comparaison && valeur.recette"
          :comparaison="valeur.comparaison"
          :version="valeur.recette.version"
          :suivie="valeur.realisation.recetteVersion"
        />
        <p v-else>
          La fiche de la recette « {{ valeur.realisation.recette }} » est
          introuvable ou illisible : pas de comparaison.
        </p>
      </div>

      <h3>Journal</h3>
      <div data-test="journal">
        <p v-if="valeur.journal.fiches.length === 0">Aucune entrée.</p>
        <ol class="journal">
          <li
            v-for="entree in valeur.journal.fiches"
            :key="entree.chemin"
            data-test="entree-du-journal"
          >
            <p class="date">
              {{ libelleDate(entree.date) }} — {{ libelle(entree.evenement) }}
            </p>
            <PhotosDeFiche
              :photos="entree.photos"
              :legende="`${libelle(entree.evenement)}, ${libelleDate(entree.date)}`"
            />
            <TexteDeFiche :corps="entree.corps" />
          </li>
        </ol>
        <FichesInvalides :invalides="valeur.journal.invalides" />
      </div>

      <PhotosDeFiche
        :photos="valeur.realisation.photos"
        :legende="valeur.realisation.nom"
      />
      <TexteDeFiche :corps="valeur.realisation.corps" />
    </article>
  </main>
</template>
