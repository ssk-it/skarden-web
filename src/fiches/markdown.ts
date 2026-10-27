// RG-contenu-des-fiches-assaini : le site rend des fiches de dépôts qu'il ne connaît pas, et garde un jeton. markdown-it n'interprète pas le HTML brut (`html: false`) ; DOMPurify assainit tout de même ce qu'il produit, au cas où une extension ou une faille laisserait passer quelque chose.

import DOMPurify from "dompurify";
import MarkdownIt from "markdown-it";

const markdown = new MarkdownIt({ html: false, linkify: true });

const purificateur = DOMPurify();
purificateur.addHook("afterSanitizeAttributes", (noeud) => {
  // Une image du texte viendrait d'une origine quelconque : un traceur, une requête que le visiteur n'a pas voulue. Les photos d'une fiche passent par son champ `photos`.
  if (noeud.tagName === "IMG") noeud.remove();
  if (noeud.tagName === "A" && noeud.getAttribute("href")?.startsWith("http")) {
    noeud.setAttribute("target", "_blank");
    noeud.setAttribute("rel", "noopener noreferrer");
  }
});

export function rendreMarkdown(texte: string): string {
  return purificateur.sanitize(markdown.render(texte), {
    ADD_ATTR: ["target"],
  });
}
