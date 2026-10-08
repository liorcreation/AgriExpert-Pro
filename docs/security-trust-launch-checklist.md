# AgriExpert — sécurité et confiance avant ouverture publique

État établi le 8 octobre 2026. Ce document distingue les contrôles présents dans le dépôt des opérations qui nécessitent un déploiement, un compte d’exploitation ou un avis professionnel. Il ne constitue ni un audit de sécurité indépendant ni une certification de conformité.

## Contrôles ajoutés dans cette tranche

- En-têtes HTTP pour les pages Pages : CSP initiale, anti-framing, nosniff, referrer policy, HSTS et permissions limitées. Valider les domaines CSP sur le domaine final et les flux réels avant activation en production.
- Limitation D1 à fenêtre glissante pour authentification, publication, réponses, médias, diagnostic, SOS, facturation, transcription et demandes de confidentialité. Les migrations `0011` et `0012` doivent être appliquées avant le déploiement du code qui les utilise.
- Contrôle des octets de signature et allowlist raster/audio à l’upload, taille maximale et noms de fichiers neutralisés. Ce contrôle ne constitue pas une analyse antivirus ; aucun moteur antimalware n’est intégré.
- Consentements explicites pour le GPS du SOS, les pièces jointes et l’analyse photo par fournisseur externe, journalisés avec version de travail.
- Export JSON de compte (texte et métadonnées médias ; les octets photo/audio ne sont pas empaquetés) et dépôt d’une demande de suppression en statut `pending_review`. Cette demande n’efface pas les données et aucun écran d’administration de traitement n’est encore fourni.
- Retrait du stockage d’une pièce jointe encore non liée à une question ou à un dossier SOS.
- Projets de politique de confidentialité et de conditions, volontairement marqués comme brouillons non validés.

## Bloqueurs avant ouverture publique

1. Faire valider au Burkina Faso le responsable de traitement, bases juridiques/consentements, droits, conservation, SOS, données vétérinaires, GPS, sous-traitants et transferts internationaux. Compléter coordonnées légales et support réels.
2. Ajouter une procédure opérationnelle de traitement des demandes d’accès/rectification/suppression, avec contrôle d’identité, échéance, notifications, arbitrage des reçus et effacement des objets Supabase. Décider le sort des événements d’audit légalement conservés.
3. Configurer l’antivirus/quarantaine ou formaliser une analyse de risque acceptée pour les pièces jointes ; limiter aussi les types par usage et tester des fichiers hostiles.
4. Configurer les sauvegardes chiffrées de D1 et Supabase, les responsables, fréquence, rétention, stockage séparé, clés et tests réguliers de restauration. Rien dans ce dépôt ne prouve qu’elles sont actives.
5. Choisir le service de monitoring, alertes, niveaux d’accès, durée de journaux, propriétaire de l’astreinte et procédure de réponse à incident. Aucun destinataire de support/alerte n’est configuré ici.
6. Revue CSP sur le domaine définitif (OAuth Google, cartes, médias, API), test navigateur et contrôle des en-têtes après déploiement.
7. Appliquer les migrations D1 en préproduction, tester rate limits, export, demandes de suppression, upload, refus de consentement, suppression d’objet non lié, restauration et erreurs; puis exécuter le déploiement via la procédure release.

## Procédure minimale à documenter par l’exploitant

- Incident : détecter → limiter l’exposition → préserver les preuves utiles → évaluer les personnes/données concernées → notifier les responsables/autorités/personnes selon le délai validé juridiquement → corriger → compte-rendu post-incident.
- Restauration : déclarer l’incident → choisir un point de restauration vérifié → restaurer D1 et objets dans un environnement isolé → vérifier cohérence DB/objets et accès → approuver la remise en service → journaliser le résultat.
- Revue périodique : comptes privilégiés, secrets, règles RLS/Storage, limites anti-abus, accès institutionnels, dépendances, sauvegardes et tests de restauration.
