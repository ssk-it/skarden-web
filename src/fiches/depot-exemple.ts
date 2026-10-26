// Un petit dépôt au format Skarden, partagé par les tests du domaine et des pages.

export const REFERENTIEL = `schema_version: 1
collections:
  familles: { dossier: familles }
  plantes: { dossier: plantes }
  emplacements: { dossier: emplacements }
  cultures: { dossier: cultures }
  journal: { dossier: journal, par_annee: true }
`;

export const fiche = (champs: string, corps = "") =>
  `---\n${champs}\n---\n\n${corps}`;

export const DEPOT_EXEMPLE: Record<string, string> = {
  "referentiel.yml": REFERENTIEL,
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
