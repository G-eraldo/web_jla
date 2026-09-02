# Checklist avant publication — Maison JLA

## Commandes et paiement

- [ ] Créer dans Strapi un jeton API **restreint** aux permissions `find`, `findOne`, `create` et `update` de `Commande`, puis le placer uniquement dans `web/.env` sous `STRAPI_API_TOKEN`.
- [ ] Configurer une clé Mollie de test, puis une clé live, dans `MOLLIE_API_KEY`.
- [ ] Vérifier que `NUXT_PUBLIC_SITE_URL` correspond exactement au domaine HTTPS de production. C’est l’URL appelée par le webhook Mollie.
- [ ] Effectuer un paiement test et vérifier : commande créée `pending` → paiement `paid` → e-mail de confirmation reçu une seule fois.
- [ ] Renseigner un numéro de suivi dans une commande Strapi test et vérifier l’e-mail d’expédition, son lien de suivi et l’absence de doublon.
- [ ] Définir clairement la politique de frais et délais : domicile, point relais, livraison offerte, zones desservies, transporteur et retours.
- [ ] Définir le transporteur et la méthode de sélection réelle du point relais. Le champ actuel permet une saisie manuelle ; un sélecteur automatique nécessitera l’API du transporteur choisi.

## E-mails

- [ ] Vérifier le domaine d’envoi dans Resend (SPF/DKIM) et configurer `RESEND_FROM` avec l’adresse Maison JLA.
- [ ] Vérifier `RESEND_REPLY_TO` et envoyer des tests vers Gmail, Outlook et iCloud.
- [ ] Ajouter une adresse de contact/SAV visible dans les e-mails et les pages légales.

## Légal et RGPD (France)

- [ ] Publier des **mentions légales** complètes : identité/forme juridique, adresse, SIREN/RCS, capital si applicable, e-mail/téléphone, hébergeur, directeur de publication.
- [ ] Publier des **CGV** : caractéristiques et prix TTC, livraison, paiement, délai, droit de rétractation de 14 jours et formulaire type, retours/remboursements, garanties légales, médiateur de la consommation et règlement des litiges.
- [ ] Publier une **politique de confidentialité** : responsable de traitement, finalités, base légale, destinataires (Strapi, Mollie, Resend, hébergeur), durées de conservation, droits RGPD et contact.
- [ ] Ajouter une bannière cookies avec un refus aussi simple que l’acceptation avant tout cookie de mesure d’audience, publicité ou réseau social. Les cookies strictement nécessaires au panier et au paiement sont exemptés mais doivent rester documentés.
- [ ] Constituer le registre des traitements et limiter l’accès Strapi aux seules personnes habilitées.
- [ ] Faire relire les documents finalisés par un professionnel compétent, car ils dépendent de l’identité et de l’activité exactes de l’entreprise.

## SEO et qualité

- [ ] Configurer l’URL de production, le nom du site et les métadonnées dans Nuxt ; contrôler titres, descriptions et aperçu social de chaque page publique.
- [ ] Ajouter une description SEO et un texte alternatif utile à chaque produit et image dans Strapi.
- [ ] Vérifier `robots.txt`, le sitemap généré, l’indexation Search Console et les redirections du domaine nu/sans `www`.
- [ ] Ajouter les données structurées Product, Offer, Organization et WebSite après validation des informations produit, prix, stock et livraison.
- [ ] Contrôler la version mobile, les contrastes, le clavier, les erreurs 404 et les performances (Lighthouse).

## Sécurité et exploitation

- [ ] Déployer Nuxt et Strapi en HTTPS ; ne jamais mettre les clés Mollie, Resend ni Strapi dans le code ou côté navigateur.
- [ ] Créer des comptes Strapi individuels, avec mot de passe fort et accès minimum ; supprimer les accès inutiles.
- [ ] Vérifier les sauvegardes de la base, une procédure de restauration et les mises à jour de sécurité.
- [ ] Configurer la supervision des erreurs et une alerte si le webhook ou l’envoi d’e-mail échoue.
- [ ] Tester les statuts Mollie `paid`, `failed`, `canceled`, `expired` et un appel webhook répété.
