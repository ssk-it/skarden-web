<script setup lang="ts">
import { computed, inject, nextTick, ref, useId } from "vue";
import { CLE_OUVRIR_ECRIVAIN, ouvrirEcrivainSurGithub } from "../depot/ecrire";
import { declarerFinDePhase } from "../fiches/declaration-de-fin";
import type { Etape } from "../fiches/ecriture-par-demande";
import { erreurDeFin, instantAParis } from "../fiches/fin-de-phase";
import { libelleDateOuInstant, libelleDuree } from "../fiches/libelles";
import {
  dureeDePhase,
  maintenantAParis,
  type PhaseDeRealisation,
} from "../fiches/transformations";
import { useDepot, useEcriture } from "../pages/contexte";

// RG-fin-de-phase-declaree-depuis-le-site : depuis la page d'une réalisation, on déclare la fin d'une phase en cours. La date et l'heure se relisent avant d'être écrites, avec le jeton d'écriture de l'onglet (RG-jeton-d-un-depot-prive).
const props = defineProps<{
  realisation: string;
  phase: PhaseDeRealisation;
  libelle: string;
}>();
const depot = useDepot();
const ecriture = useEcriture();
const ouvrirEcrivain = inject(CLE_OUVRIR_ECRIVAIN, ouvrirEcrivainSurGithub);

const cle = computed(
  () => `realisations/${props.realisation}#${props.phase.id}`,
);
const suivi = computed(() => ecriture.envois.get(cle.value));
const fusionnee = computed(() => suivi.value?.faites.includes("fusion"));
const enAttente = computed(
  () => suivi.value && !suivi.value.echec && !fusionnee.value,
);

const boite = ref<HTMLDialogElement>();
const bouton = ref<HTMLButtonElement>();
const zoneDeSuivi = ref<HTMLElement>();
const titre = useId();
const aide = useId();
const message = useId();

const etape = ref<"saisie" | "recapitulatif">("saisie");
const fin = ref("");
const remarque = ref("");
const jetonSaisi = ref("");

const erreur = computed(() =>
  erreurDeFin(props.phase.debut, fin.value, maintenantAParis()),
);
const MESSAGES = {
  invalide: "Saisissez une date et une heure complètes.",
  "avant-le-debut": `La fin ne peut pas tomber avant le début de la phase, le ${libelleDateOuInstant(props.phase.debut)}.`,
  "a-venir": "La fin ne peut pas être à venir.",
} as const;
const duree = computed(() =>
  libelleDuree(
    dureeDePhase({ debut: props.phase.debut, fin: fin.value }, 0).ms,
  ),
);

function ouvrir() {
  etape.value = "saisie";
  fin.value = instantAParis();
  remarque.value = "";
  boite.value?.showModal();
}

// Fermer, par Annuler comme par Échap, n'écrit rien et rend le focus au bouton (WCAG 2.4.3).
function fermer() {
  if (boite.value?.open) boite.value.close();
}
function rendreLeFocus() {
  void nextTick(() => bouton.value?.focus());
}

function saisirJeton() {
  const valeur = jetonSaisi.value.trim();
  if (!valeur) return;
  jetonSaisi.value = "";
  ecriture.saisirJeton(valeur);
}

function continuer() {
  if (erreur.value) return;
  etape.value = "recapitulatif";
}

async function confirmer() {
  const dossier = depot.value.dossierDe("realisations");
  const journal = depot.value.dossierDe("journal");
  const jeton = ecriture.jeton.value;
  if (dossier === undefined || journal === undefined || !jeton || erreur.value)
    return;
  const declaration = {
    dossier,
    journal,
    fichier: props.realisation,
    phase: props.phase.id,
    libelle: props.libelle,
    fin: fin.value,
    remarque: remarque.value,
  };
  const cleDeLaDeclaration = cle.value;
  boite.value?.close();
  // Le bouton cède la place au suivi : le focus y passe.
  void nextTick(() => zoneDeSuivi.value?.focus());
  const termine = await declarerFinDePhase(
    ouvrirEcrivain(ecriture.designe.value, jeton),
    declaration,
    (etat) => ecriture.envois.set(cleDeLaDeclaration, etat),
  );
  if (termine.faites.includes("fusion")) ecriture.relire();
}

const ETAPES: { etape: Etape; enCours: string; faite: string }[] = [
  { etape: "envoi", enCours: "Envoi de la fin", faite: "Envoyée" },
  {
    etape: "verification",
    enCours: "Vérification par les contrôles du dépôt",
    faite: "Vérifiée",
  },
  { etape: "fusion", enCours: "Fusion dans la fiche", faite: "Fusionnée" },
];

const annonce = computed(() => {
  if (!suivi.value || suivi.value.echec) return "";
  if (fusionnee.value)
    return `La fin de la phase « ${props.libelle} » est sur la fiche.`;
  const enCours = ETAPES.findIndex((e) => e.etape === suivi.value?.enCours);
  if (enCours === -1) return "";
  return `Étape ${enCours + 1} sur ${ETAPES.length} : ${ETAPES[enCours]?.enCours}.`;
});

function etatDe(e: Etape) {
  if (suivi.value?.faites.includes(e)) return "faite";
  if (suivi.value?.enCours === e)
    return suivi.value.echec ? "echouee" : "en-cours";
  return "a-venir";
}
const MARQUES = { faite: "✓", "en-cours": "●", echouee: "✗", "a-venir": "○" };
const MOTS = {
  faite: "Fait",
  "en-cours": "En cours",
  echouee: "Échec",
  "a-venir": "À venir",
};
</script>

<template>
  <div class="fin-de-phase" data-test="fin-de-phase">
    <button
      v-if="!phase.fin && !enAttente && !fusionnee"
      ref="bouton"
      type="button"
      aria-haspopup="dialog"
      @click="ouvrir"
    >
      Déclarer la fin<span class="visuellement-cache">
        de la phase « {{ libelle }} »</span
      >
    </button>

    <div ref="zoneDeSuivi" tabindex="-1" data-test="suivi-de-fin">
      <p aria-live="polite" class="visuellement-cache">{{ annonce }}</p>
      <template v-if="enAttente">
        <p>
          Fin déclarée, en attente de fusion<template v-if="suivi?.demande">
            : <a :href="suivi.demande">voir la demande de fusion</a></template
          >.
        </p>
        <ol class="etapes">
          <li
            v-for="e in ETAPES"
            :key="e.etape"
            :aria-current="etatDe(e.etape) === 'en-cours' ? 'step' : undefined"
          >
            <span aria-hidden="true">{{ MARQUES[etatDe(e.etape)] }}</span>
            {{ etatDe(e.etape) === "faite" ? e.faite : e.enCours }} —
            {{ MOTS[etatDe(e.etape)] }}
          </li>
        </ol>
        <p v-if="suivi?.aMettreAJour">
          La branche par défaut a avancé depuis la déclaration : la demande de
          fusion attend d'être mise à jour.
        </p>
      </template>
      <p v-else-if="fusionnee">La fin de la phase est sur la fiche.</p>
    </div>

    <p v-if="suivi?.echec" class="erreur" role="alert">
      <template v-if="suivi.echec.raison === 'jeton-refuse'">
        GitHub refuse ce jeton d'écriture : il a expiré, ou n'a pas le droit
        d'écrire sur ce dépôt. Rien n'a été créé.
      </template>
      <template v-else-if="suivi.echec.raison === 'reseau'">
        GitHub n'a pas répondu. Vérifiez la connexion, puis réessayez.
      </template>
      <template v-else-if="suivi.echec.raison === 'phase-deja-close'">
        Cette phase a déjà une fin sur la branche par défaut, le
        {{ libelleDateOuInstant(suivi.echec.fin) }}. Rien n'a été écrit :
        rechargez la page.
      </template>
      <template v-else-if="suivi.echec.raison === 'declaration-en-attente'">
        Une déclaration de la fin de cette phase attend déjà sa fusion. Rien n'a
        été écrit.
        <a v-if="suivi.echec.adresse" :href="suivi.echec.adresse"
          >Voir la demande de fusion</a
        >
      </template>
      <template v-else-if="suivi.echec.raison === 'phase-introuvable'">
        Cette phase n'est plus dans la fiche sur la branche par défaut. Rien n'a
        été écrit.
      </template>
      <template v-else-if="suivi.echec.raison === 'fiche-absente'">
        Cette réalisation n'est pas sur la branche par défaut du dépôt. Rien n'a
        été écrit.
      </template>
      <template v-else-if="suivi.echec.raison === 'fiche-non-modifiable'">
        Le site ne sait pas écrire cette fin sans changer autre chose à la fiche
        ({{ suivi.echec.message }}). Rien n'a été écrit.
      </template>
      <template v-else-if="suivi.echec.raison === 'refusee'">
        GitHub a refusé la déclaration : {{ suivi.echec.message }}.
      </template>
      <template v-else-if="suivi.echec.raison === 'controles-rouges'">
        Les contrôles du dépôt refusent la déclaration. La demande de fusion
        reste ouverte.
        <a :href="suivi.echec.adresse">Voir la demande de fusion</a>
      </template>
      <template v-else-if="suivi.echec.raison === 'fusion-automatique-refusee'">
        Ce dépôt ne permet pas la fusion automatique. La demande de fusion reste
        ouverte.
        <a :href="suivi.echec.adresse">Voir la demande de fusion</a>
      </template>
      <template v-else-if="suivi.echec.raison === 'fusion-trop-longue'">
        La fusion tarde : le site cesse de l'attendre.
        <a :href="suivi.echec.adresse">Voir la demande de fusion</a>
      </template>
      <template v-else>La déclaration a échoué.</template>
    </p>

    <dialog
      ref="boite"
      :aria-labelledby="titre"
      class="boite"
      @close="rendreLeFocus"
    >
      <h2 :id="titre">Fin de la phase « {{ libelle }} »</h2>

      <form
        v-if="!ecriture.jeton.value"
        data-test="jeton-d-ecriture"
        @submit.prevent="saisirJeton"
      >
        <label>
          Jeton d'écriture GitHub, pour ce dépôt
          <input
            v-model="jetonSaisi"
            name="jeton-d-ecriture"
            type="password"
            autocomplete="off"
            spellcheck="false"
            :aria-describedby="aide"
          />
        </label>
        <p :id="aide" class="aide">
          Déclarer une fin demande un jeton à granularité fine, limité à ce
          dépôt, avec <em>Contents : read and write</em> et
          <em>Pull requests : read and write</em>, et une expiration courte,
          sept jours par exemple. Il se crée dans les
          <a href="https://github.com/settings/personal-access-tokens/new"
            >réglages de GitHub</a
          >. Le site ne le garde que le temps de cet onglet.
        </p>
        <p class="actions">
          <button type="button" @click="fermer">Annuler</button>
          <button type="submit">Utiliser pour cet onglet</button>
        </p>
      </form>

      <form
        v-else-if="etape === 'saisie'"
        novalidate
        @submit.prevent="continuer"
      >
        <label>
          Date et heure d'arrêt, à l'heure de Paris
          <input
            v-model="fin"
            type="datetime-local"
            name="fin"
            required
            :aria-invalid="erreur ? 'true' : undefined"
            :aria-describedby="message"
          />
        </label>
        <p :id="message" class="erreur" aria-live="polite">
          <template v-if="erreur">{{ MESSAGES[erreur] }}</template>
        </p>
        <label>
          Remarque, facultative, ajoutée au journal
          <textarea v-model="remarque" name="remarque" rows="3"></textarea>
        </label>
        <p class="actions">
          <button type="button" @click="fermer">Annuler</button>
          <button type="submit" :disabled="Boolean(erreur)">Continuer</button>
        </p>
      </form>

      <div v-else data-test="recapitulatif">
        <dl class="champs">
          <dt>Phase</dt>
          <dd>{{ libelle }}</dd>
          <dt>Début</dt>
          <dd>{{ libelleDateOuInstant(phase.debut) }}</dd>
          <dt>Fin</dt>
          <dd>{{ libelleDateOuInstant(fin) }}</dd>
          <dt>Durée</dt>
          <dd>{{ duree }}</dd>
          <dt>Journal</dt>
          <dd>
            Une entrée « fin de phase » du
            {{ libelleDateOuInstant(fin.slice(0, 10))
            }}<template v-if="remarque.trim()">
              : « {{ remarque.trim() }} »</template
            >
          </dd>
        </dl>
        <p>
          La fin s'écrit sur une branche du dépôt, puis entre dans la fiche par
          une demande de fusion, une fois les contrôles passés. La réalisation
          reste en cours.
        </p>
        <p class="actions">
          <button type="button" @click="etape = 'saisie'">Revenir</button>
          <button type="button" @click="confirmer">Confirmer la fin</button>
        </p>
      </div>
    </dialog>
  </div>
</template>

<style scoped>
.boite {
  max-inline-size: min(32rem, calc(100vw - 2rem));
}
.boite label {
  display: block;
  margin-block-end: 0.75rem;
}
.boite input,
.boite textarea {
  display: block;
  inline-size: 100%;
  box-sizing: border-box;
}
.actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  flex-wrap: wrap;
}
.etapes {
  list-style: none;
  padding: 0;
}
</style>
