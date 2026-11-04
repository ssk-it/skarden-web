import { describe, expect, it } from "vitest";
import { fiche } from "./depot-exemple";
import { lireFiche } from "./format";
import {
  FicheNonModifiable,
  ajouterAuxPhotos,
  nommerEnvoi,
} from "./photos-ajoutees";

const NOUVELLES = [
  "medias/plantes/basilic-1.jpg",
  "medias/plantes/basilic-2.jpg",
];

describe("le nommage d'un envoi", () => {
  // RG-photo-postee-depuis-le-site : medias/<dossier de la collection>/<fichier de la fiche>-<instant>-<rang>.jpg, sur photos/<fichier de la fiche>-<instant>.
  it("range les photos sous le dossier de la collection, d'après la fiche, l'instant et le rang", () => {
    const instant = new Date(2026, 10, 4, 14, 32, 59);
    expect(nommerEnvoi("animaux", "petit-gris", instant, 2)).toEqual({
      branche: "photos/petit-gris-20261104-1432",
      chemins: [
        "medias/animaux/petit-gris-20261104-1432-1.jpg",
        "medias/animaux/petit-gris-20261104-1432-2.jpg",
      ],
    });
  });

  it("complète d'un zéro les mois, jours, heures et minutes", () => {
    const instant = new Date(2027, 0, 2, 3, 4);
    expect(nommerEnvoi("plantes", "basilic", instant, 1).branche).toBe(
      "photos/basilic-20270102-0304",
    );
  });
});

describe("l'ajout des chemins au champ photos", () => {
  const champs = (texte: string) => lireFiche(texte).donnees;

  it("ajoute les chemins à la fin d'une liste en ligne", () => {
    const texte = fiche(
      "id: basilic\nnom: Basilic\nphotos: [medias/basilic.jpg]\ncycle: annuelle",
      "Craint le froid.\n",
    );
    expect(ajouterAuxPhotos(texte, NOUVELLES)).toBe(
      fiche(
        "id: basilic\nnom: Basilic\nphotos: [medias/basilic.jpg, medias/plantes/basilic-1.jpg, medias/plantes/basilic-2.jpg]\ncycle: annuelle",
        "Craint le froid.\n",
      ),
    );
  });

  it("remplit une liste en ligne vide", () => {
    const texte = fiche("id: basilic\nphotos: []");
    expect(champs(ajouterAuxPhotos(texte, NOUVELLES)).photos).toEqual(
      NOUVELLES,
    );
  });

  it("ajoute les chemins à la fin d'une liste en blocs, à la même indentation", () => {
    const texte = fiche(
      "id: basilic\nphotos:\n  - medias/basilic.jpg\nnom: Basilic",
      "Corps.",
    );
    expect(ajouterAuxPhotos(texte, NOUVELLES)).toBe(
      fiche(
        "id: basilic\nphotos:\n  - medias/basilic.jpg\n  - medias/plantes/basilic-1.jpg\n  - medias/plantes/basilic-2.jpg\nnom: Basilic",
        "Corps.",
      ),
    );
  });

  it("crée le champ à la fin du frontmatter quand il manque", () => {
    const texte = fiche("id: basilic\nnom: Basilic # le nom courant", "Corps.");
    expect(ajouterAuxPhotos(texte, NOUVELLES)).toBe(
      fiche(
        "id: basilic\nnom: Basilic # le nom courant\nphotos: [medias/plantes/basilic-1.jpg, medias/plantes/basilic-2.jpg]",
        "Corps.",
      ),
    );
  });

  it("garde les fins de ligne Windows d'une fiche", () => {
    const texte = "---\r\nid: basilic\r\nphotos: []\r\n---\r\n\r\nCorps.\r\n";
    expect(ajouterAuxPhotos(texte, NOUVELLES)).toBe(
      `---\r\nid: basilic\r\nphotos: [${NOUVELLES.join(", ")}]\r\n---\r\n\r\nCorps.\r\n`,
    );
  });

  // INV-2 de skarden : la fiche reste celle qu'on a écrite ; ce que le site ne sait pas modifier sans rien changer d'autre, il ne le modifie pas.
  it.each([
    ["une liste en ligne sur plusieurs lignes", "photos: [\n  medias/a.jpg\n]"],
    ["un champ qui n'est pas une liste", "photos: medias/a.jpg"],
    ["une liste suivie d'un commentaire", "photos: [medias/a.jpg] # à trier"],
  ])("refuse %s", (_, champ) => {
    expect(() =>
      ajouterAuxPhotos(fiche(`id: basilic\n${champ}`), NOUVELLES),
    ).toThrow(FicheNonModifiable);
  });

  it("refuse une fiche sans frontmatter", () => {
    expect(() => ajouterAuxPhotos("Rien.", NOUVELLES)).toThrow(
      FicheNonModifiable,
    );
  });
});
