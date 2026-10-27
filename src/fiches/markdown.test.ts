import { describe, expect, it } from "vitest";
import { rendreMarkdown } from "./markdown";

// Ce que le navigateur construirait : un texte échappé est inoffensif, seul compte ce qui devient élément ou attribut.
const dom = (html: string) =>
  new DOMParser().parseFromString(html, "text/html").body;

// RG-contenu-des-fiches-assaini : le site lit des dépôts qu'il ne connaît pas, et garde un jeton.
describe("rendreMarkdown", () => {
  it("rend la mise en forme d'une fiche", () => {
    const html = rendreMarkdown(
      "Un **conseil** et une [source](https://example.org).\n\n- un\n- deux",
    );
    expect(html).toContain("<strong>conseil</strong>");
    expect(html).toContain('<a href="https://example.org"');
    expect(html).toContain("<li>un</li>");
  });

  it("n'exécute aucun script", () => {
    expect(
      dom(rendreMarkdown("<script>alert(1)</script>")).querySelector("script"),
    ).toBeNull();
  });

  it("ne garde aucun gestionnaire d'événement", () => {
    const corps = dom(
      rendreMarkdown(
        '<img src="x" onerror="alert(1)">\n\n[a](https://example.org "t")',
      ),
    );
    const attributs = [...corps.querySelectorAll("*")].flatMap((e) =>
      e.getAttributeNames(),
    );
    expect(attributs.filter((a) => a.startsWith("on"))).toEqual([]);
  });

  it("neutralise les adresses javascript:", () => {
    const liens = dom(
      rendreMarkdown("[clic](javascript:alert(1)) <javascript:alert(1)>"),
    ).querySelectorAll("a");
    expect([...liens].map((a) => a.getAttribute("href"))).not.toContainEqual(
      expect.stringMatching(/^javascript:/i),
    );
  });

  it("ne charge aucune image d'une autre origine", () => {
    expect(
      dom(
        rendreMarkdown("![traceur](https://evil.example/pixel.png)"),
      ).querySelector("img"),
    ).toBeNull();
  });

  it("ouvre les liens externes sans donner la main sur la page", () => {
    expect(rendreMarkdown("[source](https://example.org)")).toContain(
      'rel="noopener noreferrer"',
    );
  });
});
