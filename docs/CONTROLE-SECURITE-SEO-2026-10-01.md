# Contrôle sécurité et SEO — 1 octobre 2026

## Verdict

Avis favorable après déploiement des correctifs Web, avec réserves sur les dépendances Strapi. Aucun blocage applicatif démontré dans le périmètre contrôlé. Ce contrôle ciblé ne constitue pas une certification de sécurité de l'infrastructure.

Inspection indépendante des anciens rapports : code actuel des deux dépôts, réponses HTTPS publiques et tests locaux. Clé live Mollie et redirection www exclues à la demande de l'utilisateur. Paiements, remboursements et annulations considérés comme validés par l'utilisateur, sans nouvelle opération réelle.

## Corrections locales

- `server/utils/request-security.js` : limitation du corps pendant la lecture du flux Node, avant accumulation en mémoire. Une requête chunked dépassant la limite est interrompue avec HTTP 413 et fermeture de connexion. Les contrôles JSON existants restent actifs.
- `server/api/mollie/webhook.post.js` : utilisation du même lecteur borné ; aucune modification des transitions de paiement.
- `package-lock.json` : serialize-javascript 7.1.1 → 7.1.2, correction de GHSA-gfhx-hw2g-v5hg. Audit npm Web final : zéro alerte.
- `app/pages/produits/[slug].vue` : désactivation de la date `priceValidUntil` ajoutée automatiquement par Schema.org sans fondement commercial. Vérification du résolveur réel : le champ est absent du JSON-LD final.
- `test/request-security.test.js` : tests des requêtes fragmentées, du dépassement et de la mesure en octets.

## Vérifications réussies

- 44 tests Web et 31 tests CMS, sans opération réelle de paiement ou d'envoi.
- Build Nuxt après corrections ; vérification des différences Git.
- Test HTTP local avec H3 : requête chunked surdimensionnée → 413 et `Connection: close`.
- Production : accueil, collection, produit et checkout répondent 200 ; produit inexistant et page de collection 999 répondent 404.
- Contenu catalogue présent en SSR : 12 liens produits sur la première page de collection.
- Titres, descriptions et canoniques cohérents sur l'échantillon ; canonical de page 2 conservant `?page=2` ; filtres et checkout en noindex.
- robots.txt autorise l'exploration et annonce le sitemap HTTPS ; sitemap contenant les collections et produits.
- Product/Offer correspondant au produit contrôlé : prix 10 EUR et disponibilité présents. La correction de la date inventée est locale, pas encore déployée.
- Production : CSP avec nonce, HSTS, nosniff, protections iframe et politique de référent présentes.
- Routes privées GET de recherche de commande (référence fictive) et utilisateurs refusées sans authentification, HTTP 403 ; aucune donnée client consultée.
- Code : CRUD génériques commandes et rétractations désactivés ; secrets API côté serveur ; champs fournisseur marqués privés ; origine et validation des formulaires côté serveur ; relecture Mollie côté serveur.
- Aucun fichier .env suivi hors exemples ; aucun motif de clé Mollie/Resend ou clé privée détecté dans les fichiers source suivis contrôlés. Ce contrôle de motifs n'est pas une analyse exhaustive de l'historique Git.

## Réserves

**Mise à jour après correction des dépendances CMS :** Axios, DOMPurify et markdown-it sont corrigés par overrides ciblés. L'audit passe à 21 paquets signalés, dont 4 élevés et 17 modérés. Tests, compilation et démarrage isolé réussis. Le détail ci-dessous décrit l'état avant cette intervention ; voir `cms/docs/DEPENDANCES-SECURITE.md` pour l'état final et les limites de validation.

L'audit npm CMS actuel signale 25 paquets : 8 élevés, 16 modérés, 1 faible. Ces nombres incluent la propagation des avis dans les dépendances, pas 25 vulnérabilités indépendantes démontrées du site.

- Vite, esbuild et webpack-dev-middleware : avis visant des serveurs/outils de développement ; ils ne doivent pas être exposés en production. Le mode interne du processus déployé n'a pas été inspecté.
- Nodemailer : dépendance du fournisseur email standard ; le fournisseur configuré dans ce projet est Resend.
- Axios 1.19.0 : épinglé par Strapi 5.56.0, notamment administration et CLI ; la mise à jour compatible ne change pas cette version. Aucun chemin d'exploitation public établi dans le code applicatif inspecté ; cela ne prouve pas l'absence de risque dans Strapi.
- Autres avis : DOMPurify, markdown-it, react-router et stream-json. Surveillance et mises à jour amont nécessaires. Aucune migration majeure ou rétrogradation vers Strapi 4 imposée pour faire disparaître le compteur.

Les limites de débit sont en mémoire par processus et utilisent des en-têtes IP transmis par le proxy. Leur persistance et l'écrasement de ces en-têtes par le proxy ne sont pas vérifiés. Configuration VPS, sauvegardes/restauration, permissions complètes des jetons, historique des secrets et indexation effective Search Console non vérifiés.

`X-Powered-By: Nuxt` reste visible en production : information technique mineure, pas un blocage.

## Références consultées

- [OWASP — REST Security](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)
- [Google — Robots meta tags](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)
- [Google — Product structured data](https://developers.google.com/search/docs/appearance/structured-data/product-snippet)
- [Avis serialize-javascript et version corrigée](https://github.com/advisories/GHSA-gfhx-hw2g-v5hg)

Aucun commit, push, déploiement, modification de fichier d'environnement ni écriture de données métier.
