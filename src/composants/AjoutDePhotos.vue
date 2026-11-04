<script setup lang="ts">
import {
  computed,
  inject,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
} from "vue";
import { CLE_OUVRIR_ECRIVAIN, ouvrirEcrivainSurGithub } from "../depot/ecrire";
import { posterPhotos, type Etape } from "../fiches/envoi-de-photos";
import type { Collection } from "../fiches/format";
import { useDepot, useEcriture } from "../pages/contexte";
import { reduirePhoto } from "./reduction";

// RG-photo-postee-depuis-le-site : depuis la page d'une fiche, une ou plusieurs photos en un seul envoi, réduites avant de partir (RG-photo-reduite-avant-l-envoi), avec le jeton d'écriture de l'onglet (RG-qui-peut-poster-une-photo).
const props = defineProps<{ collection: Collection; fichier: string }>();
const depot = useDepot();
const ecriture = useEcriture();
const ouvrirEcrivain = inject(CLE_OUVRIR_ECRIVAIN, ouvrirEcrivainSurGithub);

interface Choisie {
  cle: number;
  nom: string;
  etat: "reduction" | "prete" | "refusee";
  photo?: Blob;
  adresse?: string;
}

const choisies = ref<Choisie[]>([]);
let compteur = 0;
const pretes = computed(() => choisies.value.filter((c) => c.etat === "prete"));
const reductionEnCours = computed(() =>
  choisies.value.some((c) => c.etat === "reduction"),
);

const cleDeLEnvoi = computed(() => `${props.collection}/${props.fichier}`);
const suivi = computed(() => ecriture.envois.get(cleDeLEnvoi.value));
const fusionne = computed(() => suivi.value?.faites.includes("fusion"));
const envoiEnCours = computed(
  () => suivi.value && !suivi.value.echec && !fusionne.value,
);

const zoneDeSuivi = ref<HTMLElement>();
const jetonSaisi = ref("");
function saisirJeton() {
  const valeur = jetonSaisi.value.trim();
  if (!valeur) return;
  jetonSaisi.value = "";
  ecriture.saisirJeton(valeur);
}

function choisir(evenement: Event) {
  const champ = evenement.target as HTMLInputElement;
  const fichiers = [...(champ.files ?? [])];
  champ.value = "";
  for (const fichier of fichiers) {
    const cle = ++compteur;
    choisies.value.push({ cle, nom: fichier.name, etat: "reduction" });
    void reduirePhoto(fichier).then(
      (photo) => {
        const choisie = choisies.value.find((c) => c.cle === cle);
        if (!choisie) return;
        choisie.photo = photo;
        choisie.adresse = URL.createObjectURL(photo);
        choisie.etat = "prete";
      },
      () => {
        const choisie = choisies.value.find((c) => c.cle === cle);
        if (choisie) choisie.etat = "refusee";
      },
    );
  }
}

function retirer(cle: number) {
  const choisie = choisies.value.find((c) => c.cle === cle);
  if (choisie?.adresse) URL.revokeObjectURL(choisie.adresse);
  choisies.value = choisies.value.filter((c) => c.cle !== cle);
}

function liberer() {
  for (const { adresse } of choisies.value)
    if (adresse) URL.revokeObjectURL(adresse);
  choisies.value = [];
}

onBeforeUnmount(liberer);

// Une fois l'envoi fusionné, le dépôt se relit et la page se remonte : le focus, tombé sur le corps de la page, revient au suivi.
onMounted(() => {
  if (suivi.value && document.activeElement === document.body)
    zoneDeSuivi.value?.focus();
});

async function envoyer() {
  const dossier = depot.value.dossierDe(props.collection);
  const jeton = ecriture.jeton.value;
  if (dossier === undefined || !jeton) return;
  const photos = pretes.value.map((c) => c.photo as Blob);
  liberer();
  // Le bouton disparaît avec les photos choisies : le focus passe au suivi de l'envoi (WCAG 2.4.3).
  void nextTick(() => zoneDeSuivi.value?.focus());
  const cle = cleDeLEnvoi.value;
  const fin = await posterPhotos(
    ouvrirEcrivain(ecriture.designe.value, jeton),
    { dossier, fichier: props.fichier, photos },
    (etat) => ecriture.envois.set(cle, etat),
  );
  if (fin.faites.includes("fusion")) ecriture.relire();
}

const ETAPES: { etape: Etape; enCours: string; faite: string }[] = [
  { etape: "envoi", enCours: "Envoi des photos", faite: "Envoyées" },
  {
    etape: "conversion",
    enCours: "Conversion en pointeurs Git LFS",
    faite: "Converties",
  },
  {
    etape: "verification",
    enCours: "Vérification par les contrôles du dépôt",
    faite: "Vérifiées",
  },
  { etape: "fusion", enCours: "Fusion dans la fiche", faite: "Fusionnées" },
];

function etatDe(etape: Etape) {
  if (suivi.value?.faites.includes(etape)) return "faite";
  if (suivi.value?.enCours === etape)
    return suivi.value.echec ? "echouee" : "en-cours";
  return "a-venir";
}

const POIDS = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
const kilo = (photo?: Blob) =>
  Math.max(1, Math.round((photo?.size ?? 0) / 1024));
</script>

<template>
  <section class="ajout" data-test="ajout-de-photos">
    <template v-if="ecriture.jeton.value">
      <p v-if="!envoiEnCours">
        <label class="choix">
          Ajouter des photos
          <input type="file" accept="image/*" multiple @change="choisir" />
        </label>
      </p>
      <ul v-if="choisies.length" class="apercus">
        <li v-for="choisie in choisies" :key="choisie.cle">
          <template v-if="choisie.etat === 'reduction'"
            >{{ choisie.nom }} : réduction…</template
          >
          <template v-else-if="choisie.etat === 'refusee'"
            >{{ choisie.nom }} : le navigateur ne sait pas lire cette photo,
            elle ne partira pas.</template
          >
          <template v-else>
            <img :src="choisie.adresse" :alt="`Aperçu de ${choisie.nom}`" />
            <span
              >{{ choisie.nom }} —
              <template v-if="kilo(choisie.photo) < 1024"
                >{{ kilo(choisie.photo) }} Ko</template
              ><template v-else
                >{{ POIDS.format(kilo(choisie.photo) / 1024) }} Mo</template
              ></span
            >
          </template>
          <button
            type="button"
            :aria-label="`Retirer ${choisie.nom}`"
            @click="retirer(choisie.cle)"
          >
            Retirer
          </button>
        </li>
      </ul>
      <p v-if="pretes.length">
        <button type="button" :disabled="reductionEnCours" @click="envoyer">
          Envoyer {{ pretes.length }} photo{{ pretes.length > 1 ? "s" : "" }}
        </button>
      </p>

      <!-- Présente avant l'envoi : une zone vivante n'annonce que ce qui change en elle. -->
      <div ref="zoneDeSuivi" aria-live="polite" tabindex="-1" class="suivi">
        <ol v-if="suivi" class="etapes">
          <li v-for="{ etape, enCours, faite } in ETAPES" :key="etape">
            <template v-if="etatDe(etape) === 'faite'">{{ faite }}</template>
            <template v-else-if="etatDe(etape) === 'en-cours'"
              >{{ enCours }}…</template
            >
            <template v-else-if="etatDe(etape) === 'echouee'"
              >{{ enCours }} : échec</template
            >
            <template v-else>{{ enCours }} : à venir</template>
          </li>
        </ol>
        <p v-if="suivi?.aMettreAJour">
          La branche par défaut a avancé depuis l'envoi : la demande de fusion
          attend d'être mise à jour.
          <a :href="suivi?.demande">Voir la demande de fusion</a>
        </p>
        <p v-if="fusionne">Les photos sont sur la fiche.</p>
      </div>

      <p v-if="suivi?.echec" class="erreur" role="alert">
        <template v-if="suivi.echec.raison === 'jeton-refuse'">
          GitHub refuse ce jeton d'écriture : il a expiré, ou n'a pas le droit
          d'écrire sur ce dépôt. Rien n'a été créé. Oubliez-le, puis
          saisissez-en un autre.
        </template>
        <template v-else-if="suivi.echec.raison === 'reseau'">
          GitHub n'a pas répondu. Vérifiez la connexion, puis réessayez.
        </template>
        <template v-else-if="suivi.echec.raison === 'refusee'">
          GitHub a refusé l'envoi : {{ suivi.echec.message }}.
        </template>
        <template v-else-if="suivi.echec.raison === 'fiche-absente'">
          Cette fiche n'est pas sur la branche par défaut du dépôt. Rien n'a été
          créé.
        </template>
        <template v-else-if="suivi.echec.raison === 'fiche-non-modifiable'">
          Le site ne sait pas ajouter de photo à cette fiche sans en changer
          autre chose ({{ suivi.echec.message }}). Rien n'a été créé.
        </template>
        <template v-else-if="suivi.echec.raison === 'conversion-absente'">
          Ce dépôt ne convertit pas en Git LFS les photos postées depuis le site
          : il n'a pas de workflow photos-en-lfs.yml. La branche reste en place,
          sans demande de fusion.
        </template>
        <template v-else-if="suivi.echec.raison === 'conversion-echouee'">
          La conversion en pointeurs Git LFS a échoué : quota de Git LFS
          atteint, ou branche modifiée entretemps. La branche reste en place
          pour un nouvel essai.
          <a :href="suivi.echec.adresse">Voir l'Action</a>
        </template>
        <template v-else-if="suivi.echec.raison === 'conversion-trop-longue'">
          La conversion tarde : le site cesse de l'attendre. La branche reste en
          place.
          <a v-if="suivi.echec.adresse" :href="suivi.echec.adresse"
            >Voir l'Action</a
          >
        </template>
        <template v-else-if="suivi.echec.raison === 'controles-rouges'">
          Les contrôles du dépôt refusent l'envoi. La demande de fusion reste
          ouverte.
          <a :href="suivi.echec.adresse">Voir la demande de fusion</a>
        </template>
        <template
          v-else-if="suivi.echec.raison === 'fusion-automatique-refusee'"
        >
          Ce dépôt ne permet pas la fusion automatique. La demande de fusion
          reste ouverte.
          <a :href="suivi.echec.adresse">Voir la demande de fusion</a>
        </template>
        <template v-else-if="suivi.echec.raison === 'fusion-trop-longue'">
          La fusion tarde : le site cesse de l'attendre.
          <a :href="suivi.echec.adresse">Voir la demande de fusion</a>
        </template>
      </p>
    </template>

    <details v-else>
      <summary>Ajouter des photos</summary>
      <form data-test="jeton-d-ecriture" @submit.prevent="saisirJeton">
        <label>
          Jeton d'écriture GitHub, pour ce dépôt
          <input
            v-model="jetonSaisi"
            name="jeton-d-ecriture"
            type="password"
            autocomplete="off"
            spellcheck="false"
          />
        </label>
        <button type="submit">Utiliser pour cet onglet</button>
        <p class="aide">
          Poster une photo demande un jeton à granularité fine, limité à ce
          dépôt, avec <em>Contents : read and write</em> et
          <em>Pull requests : read and write</em>, et une expiration courte,
          sept jours par exemple. Il se crée dans les
          <a href="https://github.com/settings/personal-access-tokens/new"
            >réglages de GitHub</a
          >. Le site ne le garde que le temps de cet onglet, et ne s'en sert que
          pour poster.
        </p>
      </form>
    </details>
  </section>
</template>
