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
  recettes: { dossier: recettes }
  realisations: { dossier: realisations }
  produits: { dossier: produits }
  contenants: { dossier: contenants }
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

// Les transformations, d'après la liqueur d'hibiscus de `sskorupski/skarden` et ses fixtures (cadrage 2026-007) : une recette, sa variante au gingembre, une réalisation finie et une en cours, une réalisation de la variante, qui emploient un produit, la menthe de la cuisine et un bocal.
const FICHES_DES_TRANSFORMATIONS: Record<string, string> = {
  "recettes/liqueur-hibiscus.md": fiche(
    `id: liqueur-hibiscus
nom: Liqueur d'hibiscus
categorie: liqueur
version: 2
rendement: { quantite: 1, unite: l }
ingredients:
  - { ingredient: hibiscus, quantite: 40, unite: g, conservation: seche }
  - { ingredient: alcool-neutre, quantite: 700, unite: ml, note: à 40 % vol }
  - { ingredient: sucre, quantite: 200, unite: g }
  - { ingredient: menthe, quantite: 5, unite: g, conservation: frais, optionnel: true }
phases:
  - id: maceration
    libelle: Macération des fleurs dans l'alcool
    duree_cible: { min: P3D, max: P5D }
    temperature_c: { min: 18, max: 22 }
    contenant_categorie: bocal
    conditions: à l'abri de la lumière
  - id: filtration
    libelle: Filtration
  - id: repos
    libelle: Repos avant de servir
    duree_cible: { min: P2W, max: P4W }
sources: [Un carnet de famille]`,
    "On filtre, puis on laisse reposer.",
  ),
  "recettes/liqueur-hibiscus-gingembre.md": fiche(
    `id: liqueur-hibiscus-gingembre
nom: Liqueur d'hibiscus au gingembre
categorie: liqueur
version: 1
derive_de: liqueur-hibiscus
ingredients:
  - { ingredient: hibiscus, quantite: 40, unite: g, conservation: seche }
  - { ingredient: gingembre, quantite: 20, unite: g, conservation: frais }
phases:
  - { id: maceration, libelle: Macération }`,
  ),
  "recettes/sirop-de-menthe.md": fiche(
    `id: sirop-de-menthe
nom: Sirop de menthe
categorie: sirop
version: 1
ingredients:
  - { ingredient: menthe, quantite: 100, unite: g, conservation: frais }
phases:
  - { id: infusion, libelle: Infusion }`,
  ),
  "realisations/2026-11-08-liqueur-hibiscus.md": fiche(
    `id: 2026-11-08-liqueur-hibiscus
nom: Liqueur d'hibiscus, novembre 2026
recette: liqueur-hibiscus
recette_version: 1
statut: en-cours
debut: 2026-11-08
fin: null
ingredients:
  - { ingredient: hibiscus, quantite: 29, unite: g, conservation: seche, produit: hibiscus-karcade, lot: YE1156 }
  - { ingredient: alcool-neutre, quantite: 0.5, unite: l }
  - { ingredient: sucre-roux, quantite: 143, unite: g, ajoute: true }
  - { ingredient: menthe, quantite: 5, unite: g, conservation: frais, culture: 2026-menthe-cuisine, recolte: 2026-11-07 }
phases:
  - { id: maceration, debut: 2026-11-08, contenant: bocal-parfait-1l, nombre: 1, temperature_c: { min: 19, max: 20, mesure: thermomètre de cuisine } }
ecarts:
  - Du sucre roux à la place du sucre de la recette.`,
  ),
  "realisations/2026-05-01-liqueur-hibiscus.md": fiche(
    `id: 2026-05-01-liqueur-hibiscus
nom: Liqueur d'hibiscus, mai 2026
recette: liqueur-hibiscus
recette_version: 2
statut: terminee
debut: 2026-05-01
fin: 2026-05-31
ingredients: []
phases:
  - { id: maceration, debut: 2026-05-01, fin: 2026-05-04, contenant: bocal-parfait-1l, nombre: 2 }
resultat: { volume_obtenu: { quantite: 1.2, unite: l }, degre_estime: 25 }`,
  ),
  "realisations/2026-06-01-liqueur-hibiscus-gingembre.md": fiche(
    `id: 2026-06-01-liqueur-hibiscus-gingembre
nom: Liqueur d'hibiscus au gingembre, juin 2026
recette: liqueur-hibiscus-gingembre
recette_version: 1
statut: terminee
debut: 2026-06-01
fin: 2026-06-05
ingredients:
  - { ingredient: hibiscus, quantite: 40, unite: g, conservation: seche }
  - { ingredient: gingembre, quantite: 25, unite: g, conservation: frais }
phases:
  - { id: maceration, debut: 2026-06-01, fin: 2026-06-05 }`,
  ),
  "produits/hibiscus-karcade.md": fiche(
    `id: hibiscus-karcade
nom: Hibiscus karcadé, sachet de 500 g
ingredient: hibiscus
conservation: seche
marque: Espig
fournisseur: Cepasco, Aubagne
origine: Afrique
conditionnement: { quantite: 500, unite: g }
reference: 3102870021875`,
    "Fleurs séchées, vendues sous vide.",
  ),
  "contenants/bocal-parfait-1l.md": fiche(
    `id: bocal-parfait-1l
nom: Bocal Le Parfait 1 l
categorie: bocal
contenance: { quantite: 1, unite: l }
matiere: verre
fermeture: joint et étrier
nombre: 4`,
  ),
  "journal/2026/2026-11-09-liqueur-hibiscus-observation.md": fiche(
    "date: 2026-11-09\nrealisation: 2026-11-08-liqueur-hibiscus\nevenement: observation",
    "La couleur fonce déjà.",
  ),
  "journal/2026/2026-06-30-liqueur-hibiscus-degustation.md": fiche(
    `date: 2026-06-30
realisation: 2026-05-01-liqueur-hibiscus
evenement: degustation
avis:
  - { participant: Camille, criteres: { couleur: 9, nez: 7 }, commentaire: Belle robe. }
  - { participant: Sam, criteres: { couleur: 8, bouche: 6.5 } }`,
  ),
  "journal/2026/2026-11-01-liqueur-hibiscus-degustation.md": fiche(
    `date: 2026-11-01
realisation: 2026-05-01-liqueur-hibiscus
evenement: degustation
avis:
  - { participant: Camille, criteres: { couleur: 9, nez: 8 } }`,
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
  ...FICHES_DES_TRANSFORMATIONS,
};
