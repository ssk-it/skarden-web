import { describe, expect, it } from "vitest";
import { PhotoIllisible, reduirePhoto } from "./reduction";

async function toile(largeur: number, hauteur: number, type: string) {
  const canvas = document.createElement("canvas");
  canvas.width = largeur;
  canvas.height = hauteur;
  const contexte = canvas.getContext("2d");
  if (!contexte) throw new Error("pas de contexte 2d");
  contexte.fillStyle = "#2e8b57";
  contexte.fillRect(0, 0, largeur, hauteur);
  return new Promise<Blob>((resoudre, rejeter) =>
    canvas.toBlob((b) => (b ? resoudre(b) : rejeter(new Error())), type),
  );
}

// Un JPEG de téléphone : un segment EXIF, juste après le début de l'image, qui dit l'orientation (6 : tournée d'un quart de tour) et porte un texte témoin.
async function jpegAvecExif(largeur: number, hauteur: number) {
  const jpeg = new Uint8Array(
    await (await toile(largeur, hauteur, "image/jpeg")).arrayBuffer(),
  );
  const temoin = new TextEncoder().encode("GPS-JARDIN");
  const tiff = [
    0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, 0x00, 0x01, 0x01, 0x12,
    0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, 0x06, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00,
  ];
  const charge = [...new TextEncoder().encode("Exif\0\0"), ...tiff, ...temoin];
  const longueur = charge.length + 2;
  const segment = [0xff, 0xe1, longueur >> 8, longueur & 0xff, ...charge];
  return new Blob([jpeg.slice(0, 2), new Uint8Array(segment), jpeg.slice(2)], {
    type: "image/jpeg",
  });
}

async function dimensions(photo: Blob) {
  const bitmap = await createImageBitmap(photo);
  return { largeur: bitmap.width, hauteur: bitmap.height };
}

describe("la réduction d'une photo avant l'envoi", () => {
  // RG-photo-reduite-avant-l-envoi : 2 560 pixels au plus sur le grand côté, en JPEG.
  it("réduit une grande photo à 2 560 pixels sur son grand côté, en JPEG", async () => {
    const reduite = await reduirePhoto(await toile(3200, 1600, "image/png"));
    expect(reduite.type).toBe("image/jpeg");
    expect(await dimensions(reduite)).toEqual({ largeur: 2560, hauteur: 1280 });
  });

  it("n'agrandit pas une petite photo", async () => {
    const reduite = await reduirePhoto(await toile(400, 300, "image/png"));
    expect(await dimensions(reduite)).toEqual({ largeur: 400, hauteur: 300 });
  });

  // Rien de ce qui situe la maison ne quitte le téléphone : le réencodage ne garde aucune des métadonnées de la photo. WebKit écrit de lui-même un court segment EXIF, l'espace colorimétrique et les dimensions, qui ne dit rien de la prise de vue.
  it("retire les métadonnées, en gardant le sens où la photo a été prise", async () => {
    const originale = await jpegAvecExif(400, 200);
    const texte = async (photo: Blob) =>
      new TextDecoder("latin1").decode(await photo.arrayBuffer());
    expect(await texte(originale)).toContain("GPS-JARDIN");

    const reduite = await reduirePhoto(originale);
    expect(await texte(reduite)).not.toContain("GPS-JARDIN");
    // L'étiquette 0x8825 désigne les coordonnées GPS ; 0x0112, l'orientation, déjà appliquée.
    const octets = await texte(reduite);
    expect(octets).not.toContain("\u0088\u0025");
    expect(octets).not.toContain("\u0001\u0012");
    expect(await dimensions(reduite)).toEqual({ largeur: 200, hauteur: 400 });
  });

  it("refuse ce que le navigateur ne sait pas décoder", async () => {
    await expect(
      reduirePhoto(new Blob(["pas une image"], { type: "image/heic" })),
    ).rejects.toBeInstanceOf(PhotoIllisible);
  });
});
