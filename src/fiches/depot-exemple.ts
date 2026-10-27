// Un petit dépôt au format Skarden, partagé par les tests du domaine et des pages : des plantes, et un petit-gris élevé dans l'aquarium du garage.

export const REFERENTIEL_DE_PLANTES = `schema_version: 1
collections:
  familles: { dossier: familles }
  plantes: { dossier: plantes }
  emplacements: { dossier: emplacements }
  cultures: { dossier: cultures }
  journal: { dossier: journal, par_annee: true }
`;

export const REFERENTIEL = `${REFERENTIEL_DE_PLANTES}  animaux: { dossier: animaux }
  elevages: { dossier: elevages }
  installations: { dossier: installations }
  procedures: { dossier: procedures }
`;

export const fiche = (champs: string, corps = "") =>
  `---\n${champs}\n---\n\n${corps}`;

const FICHES_DE_LA_PLANTE: Record<string, string> = {
  "familles/lamiacees.md": fiche("id: lamiacees\nnom: Lamiacées"),
  "plantes/basilic.md": fiche(
    "id: basilic\nnom: Basilic\nfamille: lamiacees\ntype: aromatique\ncycle: annuelle\nexposition: plein-soleil\nphotos: [medias/basilic.jpg]",
    "Craint le froid.",
  ),
  "plantes/menthe.md": fiche(
    "id: menthe\nnom: Menthe\nfamille: lamiacees\ntype: aromatique\ncycle: vivace",
  ),
  "emplacements/cuisine.md": fiche(
    "id: cuisine\nnom: Rebord de la cuisine\ninterieur: true",
  ),
  "cultures/2025-basilic-cuisine.md": fiche(
    "id: 2025-basilic-cuisine\nplante: basilic\nemplacement: cuisine\ndebut: 2025-04-01\nfin: 2025-10-01\nstatut: terminee",
    "Bilan : trop peu de lumière.",
  ),
  "cultures/2026-basilic-cuisine.md": fiche(
    "id: 2026-basilic-cuisine\nplante: basilic\nemplacement: cuisine\ndebut: 2026-04-12\nstatut: en-cours",
  ),
  "cultures/2026-menthe-cuisine.md": fiche(
    "id: 2026-menthe-cuisine\nplante: menthe\nemplacement: cuisine\ndebut: 2026-05-20\nstatut: en-cours",
  ),
  "journal/2025/2025-06-01-basilic-recolte.md": fiche(
    "date: 2025-06-01\nculture: 2025-basilic-cuisine\nevenement: recolte",
  ),
  "journal/2026/2026-04-12-basilic-semis.md": fiche(
    "date: 2026-04-12\nculture: 2026-basilic-cuisine\nevenement: semis",
  ),
  "journal/2026/2026-05-02-basilic-rempotage.md": fiche(
    "date: 2026-05-02\nculture: 2026-basilic-cuisine\nevenement: rempotage\nphotos: [medias/rempotage.jpg]",
    "Racines sorties du pot.",
  ),
  "journal/2026/2026-06-01-menthe-observation.md": fiche(
    "date: 2026-06-01\nculture: 2026-menthe-cuisine\nevenement: observation",
  ),
  "medias/basilic.jpg": "JPG",
};

// Ce que l'animal ajoute au dépôt de plantes, d'après les fiches publiées de `sskorupski/skarden` (cadrage 2026-003).
const FICHES_DE_L_ANIMAL: Record<string, string> = {
  "familles/helicides.md": fiche(
    "id: helicides\nnom: Hélicidés\nnom_latin: Helicidae\nregne: animal",
  ),
  "animaux/petit-gris.md": fiche(
    `id: petit-gris
nom: Petit-gris
nom_latin: Helix aspersa aspersa
famille: helicides
milieu: terrestre
protection: encadree
plages:
  - { parametre: temperature-c, min: 18, max: 22, etat: actif }
  - { parametre: humidite-pct, min: 75, max: 90, etat: actif }
  - { parametre: temperature-c, max: 0, etat: mortel }
  - { parametre: temperature-c, min: 10, max: 12, etat: a-eviter }
  - { parametre: temperature-c, min: 5, max: 8, etat: dormance }
modes:
  - id: hibernation
    phases:
      - { phase: dormance, mois: [11, 12, 1, 2] }
      - { phase: reveil, mois: [3, 4] }
      - { phase: activite, mois: [4, 5, 6, 7, 8, 9] }
      - { phase: reproduction, mois: [4, 5, 6, 7, 8, 9] }
      - { phase: preparation, mois: [10] }
  - id: activite-continue
    phases:
      - { phase: activite, mois: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] }
densite: { min: 100, max: 150, unite: par-m2-sol }
complements: [calcium, farine-d-elevage]
reproduction:
  mode: oeufs
  fecondite: { min: 80, max: 100 }
stades: [oeuf, juvenile, adulte]
routine:
  - { soin: brumisation, frequence: quotidienne, phases: [activite, reproduction] }
  - { soin: nourrissage, frequence: quotidienne, phases: [activite] }
  - { soin: controle, frequence: hebdomadaire }
  - { soin: renouvellement-substrat, frequence: bimestrielle, phases: [reveil] }
procedures: [preparation-substrat-terre]`,
    "Le ramassage est encadré par arrêté préfectoral.",
  ),
  "emplacements/garage.md": fiche("id: garage\nnom: Garage\ninterieur: true"),
  "installations/aquarium-garage.md": fiche(
    "id: aquarium-garage\nnom: Aquarium du garage\ntype: aquarium\nemplacement: garage\ndimensions_cm: { longueur: 96, largeur: 56, hauteur: 40 }",
    "Couvercle de verre, bande de moustiquaire.",
  ),
  "procedures/preparation-substrat-terre.md": fiche(
    "id: preparation-substrat-terre\nnom: Préparation d'un substrat de terre du jardin",
    "1. **Prélever** la terre.\n2. **Tamiser**.\n3. **Stériliser** à 120 °C.",
  ),
  "elevages/2025-petit-gris-garage.md": fiche(
    "id: 2025-petit-gris-garage\nanimal: petit-gris\ninstallation: aquarium-garage\ndebut: 2025-05-01\nfin: 2025-10-30\nstatut: terminee\norigine: achat\nmode: hibernation",
  ),
  "elevages/2026-petit-gris-garage.md": fiche(
    "id: 2026-petit-gris-garage\nanimal: petit-gris\ninstallation: aquarium-garage\ndebut: 2026-09-15\nstatut: en-cours\norigine: souche\nelevage_parent: 2025-petit-gris-garage\nmode: hibernation\neffectif_cible: 60",
    "Une centaine de reproducteurs.",
  ),
  "journal/2025/2025-07-01-petit-gris-ponte.md": fiche(
    "date: 2025-07-01\nelevage: 2025-petit-gris-garage\nevenement: ponte",
  ),
  "journal/2026/2026-10-01-petit-gris-comptage.md": fiche(
    "date: 2026-10-01\nelevage: 2026-petit-gris-garage\nevenement: comptage\neffectif: 87",
    "Compté à la lampe.",
  ),
  "journal/2026/2026-11-03-petit-gris-mise-en-dormance.md": fiche(
    "date: 2026-11-03\nelevage: 2026-petit-gris-garage\nevenement: mise-en-dormance",
  ),
};

// Un dépôt qui ne déclare pas les collections de l'animal (RG-referentiel-yml-decrit-le-depot).
export const DEPOT_DE_PLANTES: Record<string, string> = {
  "referentiel.yml": REFERENTIEL_DE_PLANTES,
  ...FICHES_DE_LA_PLANTE,
};

export const DEPOT_EXEMPLE: Record<string, string> = {
  "referentiel.yml": REFERENTIEL,
  ...FICHES_DE_LA_PLANTE,
  ...FICHES_DE_L_ANIMAL,
};
