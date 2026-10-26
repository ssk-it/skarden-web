// RG-fiche-relue-seulement-si-changee : le navigateur garde chaque contenu sous son empreinte, et ne télécharge que celles qu'il n'a pas. Une empreinte ne ment jamais sur son contenu : rien n'est à invalider, seulement à effacer quand plus aucun commit lu ne la désigne.

export interface CacheParEmpreinte {
  lire(cle: string): Promise<Blob | undefined>;
  ecrire(cle: string, contenu: Blob): Promise<void>;
  conserverSeulement(cles: ReadonlySet<string>): Promise<void>;
}

export function cacheEnMemoire(): CacheParEmpreinte {
  const contenus = new Map<string, Blob>();
  return {
    lire: async (cle) => contenus.get(cle),
    ecrire: async (cle, contenu) => {
      contenus.set(cle, contenu);
    },
    conserverSeulement: async (cles) => {
      for (const cle of contenus.keys())
        if (!cles.has(cle)) contenus.delete(cle);
    },
  };
}

// Les clés deviennent des URL fictives : Cache Storage n'indexe que des requêtes.
const PREFIXE = "https://cache.skarden.invalid/";

// Un cache par dépôt : effacer ce qu'un commit ne désigne plus ne doit pas vider celui d'un autre dépôt. Sans Cache Storage (contexte non sécurisé, navigation privée), le cache ne dure que le temps de la page.
export async function cacheDuNavigateur(
  nom: string,
  stockage: CacheStorage | undefined = globalThis.caches,
): Promise<CacheParEmpreinte> {
  if (!stockage) return cacheEnMemoire();
  let cache: Cache;
  try {
    cache = await stockage.open(`skarden:${nom}`);
  } catch {
    return cacheEnMemoire();
  }
  return {
    lire: async (cle) => {
      const reponse = await cache.match(PREFIXE + cle);
      return reponse ? reponse.blob() : undefined;
    },
    ecrire: async (cle, contenu) => {
      // Par octets : un Blob venu d'un autre environnement (jsdom dans les tests) ne serait pas reconnu par Response.
      await cache.put(PREFIXE + cle, new Response(await contenu.arrayBuffer()));
    },
    conserverSeulement: async (cles) => {
      for (const requete of await cache.keys()) {
        if (!cles.has(requete.url.slice(PREFIXE.length)))
          await cache.delete(requete);
      }
    },
  };
}
