// RG-photo-reduite-avant-l-envoi : chaque photo se réencode dans le navigateur avant de partir, ce qui retire toutes ses métadonnées. La position GPS de la maison ne quitte pas le téléphone, et le quota de Git LFS tient des milliers de photos.

const GRAND_COTE = 2560;
const QUALITE = 0.85;

export class PhotoIllisible extends Error {
  constructor() {
    super("photo illisible");
    this.name = "PhotoIllisible";
  }
}

// Une image du document se dessine dans le sens où on l'a prise (`image-orientation: from-image`) : l'orientation EXIF s'applique avant d'être effacée par le réencodage.
export async function reduirePhoto(fichier: Blob): Promise<Blob> {
  const adresse = URL.createObjectURL(fichier);
  try {
    const image = new Image();
    image.src = adresse;
    try {
      await image.decode();
    } catch {
      throw new PhotoIllisible();
    }
    const echelle = Math.min(
      1,
      GRAND_COTE / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.naturalWidth * echelle);
    canvas.height = Math.round(image.naturalHeight * echelle);
    canvas
      .getContext("2d")
      ?.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resoudre, rejeter) =>
      canvas.toBlob(
        (photo) => (photo ? resoudre(photo) : rejeter(new PhotoIllisible())),
        "image/jpeg",
        QUALITE,
      ),
    );
  } finally {
    URL.revokeObjectURL(adresse);
  }
}
