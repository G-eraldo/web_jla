/**
 * Contrôle de démarrage de l'URL publique du site.
 *
 * `enforceSameOrigin` refuse déjà toute requête d'état sans URL de site, et le
 * repli `http://localhost:3000` de `nuxt.config.js` fait rejeter en 403 les
 * POST de production (commande, contact, rétractation) sans que rien ne
 * signale l'erreur de configuration. On refuse donc de démarrer plutôt que de
 * servir une boutique dont les formulaires sont muets : l'incident apparaît au
 * déploiement au lieu de se manifester par des 403 en production.
 *
 * Une URL locale déclarée explicitement reste acceptée : c'est le cas d'un
 * `npm run preview`, où l'erreur est visible dans la configuration. Seul le
 * repli silencieux sur une URL locale est traité comme une panne.
 */
export default defineNitroPlugin(() => {
  // Le prérendu exécute aussi ce module, et l'URL publique peut n'être
  // injectée qu'à l'exécution : on ne bloque pas la génération du site.
  if (import.meta.prerender) return;
  if (process.env.NODE_ENV !== "production") return;

  const siteUrl = String(useRuntimeConfig().public.siteUrl || "").trim();
  const declared = String(process.env.NUXT_PUBLIC_SITE_URL || "").trim();
  const local = /localhost|127\.0\.0\.1/i.test(siteUrl);

  if (!/^https?:\/\//i.test(siteUrl) || (local && !declared)) {
    throw new Error(
      `NUXT_PUBLIC_SITE_URL est absente : l'URL publique du site retombe sur « ${siteUrl || "vide"} » et les POST (commande, contact, rétractation) seraient refusés en 403. Renseignez le domaine HTTPS de production, par exemple https://maisonjla.fr.`,
    );
  }
  if (local) {
    console.warn(
      `[site-url] URL publique locale (${siteUrl}) : usage local uniquement, à ne jamais déployer tel quel.`,
    );
  }
});
