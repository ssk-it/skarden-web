import { describe, expect, it } from "vitest";
import { cacheDuNavigateur } from "./cache";

// Un Cache Storage réduit à ce que le cache par empreinte en emploie.
function fauxCacheStorage() {
  const caches = new Map<string, Map<string, Response>>();
  const stockage = {
    open: async (nom: string) => {
      const entrees = caches.get(nom) ?? new Map<string, Response>();
      caches.set(nom, entrees);
      return {
        match: async (url: string) => entrees.get(url)?.clone(),
        put: async (url: string, reponse: Response) =>
          void entrees.set(url, reponse),
        keys: async () => [...entrees.keys()].map((url) => new Request(url)),
        delete: async (requete: Request) => entrees.delete(requete.url),
      };
    },
  };
  return { stockage: stockage as unknown as CacheStorage, caches };
}

describe("cacheDuNavigateur", () => {
  it("garde un contenu sous son empreinte", async () => {
    const cache = await cacheDuNavigateur("a/b", fauxCacheStorage().stockage);
    await cache.ecrire("b1", new Blob(["fiche"]));
    expect(await (await cache.lire("b1"))?.text()).toBe("fiche");
    expect(await cache.lire("b2")).toBeUndefined();
  });

  it("n'efface, d'un dépôt, que ce que son commit ne désigne plus, sans toucher aux autres dépôts", async () => {
    const { stockage } = fauxCacheStorage();
    const premier = await cacheDuNavigateur("a/b", stockage);
    const second = await cacheDuNavigateur("c/d", stockage);
    await premier.ecrire("garde", new Blob(["1"]));
    await premier.ecrire("perime", new Blob(["2"]));
    await second.ecrire("perime", new Blob(["3"]));
    await premier.conserverSeulement(new Set(["garde"]));
    expect(await premier.lire("garde")).toBeDefined();
    expect(await premier.lire("perime")).toBeUndefined();
    expect(await second.lire("perime")).toBeDefined();
  });

  it("se replie sur la mémoire sans Cache Storage", async () => {
    const cache = await cacheDuNavigateur("a/b", undefined);
    await cache.ecrire("b1", new Blob(["fiche"]));
    expect(await (await cache.lire("b1"))?.text()).toBe("fiche");
  });
});
