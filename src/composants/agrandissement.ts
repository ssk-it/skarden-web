// RG-galerie-des-photos : l'agrandissement d'une photo en plein écran, par PhotoSwipe (décision 01 du cadrage 2026-006), empaquetée avec le site et jamais chargée d'une autre origine (RG-contenu-des-fiches-assaini).

import PhotoSwipe, { type SlideData } from "photoswipe";
import "photoswipe/style.css";

// PhotoSwipe compose elle-même ses boutons : ses libellés ne peuvent passer que par ses options.
const LIBELLES = {
  closeTitle: "Fermer",
  zoomTitle: "Zoomer",
  arrowPrevTitle: "Photo précédente",
  arrowNextTitle: "Photo suivante",
  errorMsg: "Photo indisponible",
  indexIndicatorSep: " sur ",
};

// PhotoSwipe exige les dimensions d'une image avant de l'ouvrir. On les mesure sur l'image décodée depuis son adresse blob, déjà lue : rien ne se télécharge.
async function mesurer(adresse: string): Promise<SlideData | undefined> {
  const image = new Image();
  image.src = adresse;
  try {
    await image.decode();
  } catch {
    return undefined;
  }
  return {
    src: adresse,
    width: image.naturalWidth,
    height: image.naturalHeight,
  };
}

// APG, Dialog (Modal) : Tab et Maj+Tab tournent entre les boutons de la boîte de dialogue. PhotoSwipe ne retient le focus qu'à son entrée dans la page, et Safari, réglé par défaut, ne passe pas sur les boutons à la tabulation : le focus quitterait la boîte.
function tourner(dialogue: HTMLElement, arriere: boolean) {
  const boutons = [
    ...dialogue.querySelectorAll<HTMLButtonElement>("button:not([disabled])"),
  ].filter((bouton) => bouton.getClientRects().length > 0);
  if (!boutons.length) return;
  const actuel = boutons.indexOf(document.activeElement as HTMLButtonElement);
  const suivant =
    actuel === -1
      ? arriere
        ? boutons.length - 1
        : 0
      : (actuel + (arriere ? -1 : 1) + boutons.length) % boutons.length;
  boutons[suivant]?.focus();
}

// Ouvre la photo `adresses[index]` parmi `adresses`, celles des photos disponibles. Une photo que le navigateur ne sait pas décoder est laissée de côté ; si c'est celle demandée, rien ne s'ouvre.
export async function agrandir(
  adresses: string[],
  index: number,
  titre: string,
  auFermer: () => void,
): Promise<PhotoSwipe | undefined> {
  const mesurees = await Promise.all(adresses.map(mesurer));
  const demandee = mesurees[index];
  if (!demandee) return undefined;
  const photos = mesurees.filter((photo) => photo !== undefined);
  const mouvementReduit = matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const pswp = new PhotoSwipe({
    ...LIBELLES,
    dataSource: photos,
    index: photos.indexOf(demandee),
    showHideAnimationType: mouvementReduit ? "none" : "fade",
    // Safari ne donne pas le focus au bouton qu'on touche : c'est la galerie qui le rend à la vignette, pas PhotoSwipe à l'élément actif.
    returnFocus: false,
  });
  // PhotoSwipe pose le rôle `dialog`, sans le dire modal ni le nommer (APG, Dialog (Modal)).
  pswp.on("afterInit", () => {
    pswp.element?.setAttribute("aria-modal", "true");
    pswp.element?.setAttribute("aria-label", titre);
  });
  pswp.on("keydown", (evenement) => {
    if (evenement.originalEvent.key !== "Tab" || !pswp.element) return;
    evenement.preventDefault();
    evenement.originalEvent.preventDefault();
    tourner(pswp.element, evenement.originalEvent.shiftKey);
  });
  pswp.on("destroy", auFermer);
  pswp.init();
  return pswp;
}
