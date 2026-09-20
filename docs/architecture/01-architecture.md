# AgriExpert Pro — Architecture cible

## 1. Décisions structurantes

AgriExpert Pro est organisé comme un monorepo avec trois clients métier et un backend partagé :

- **Web institutionnel** : React 19 + Vite + TypeScript, Tailwind CSS, Framer Motion, Lucide React et TanStack Query.
- **API métier** : Laravel 11 + PHP 8.3, API REST versionnée (`/api/v1`), jobs asynchrones et événements temps réel.
- **Base de données** : PostgreSQL 16 + PostGIS, avec UUID, contraintes métier et index spatiaux GiST.
- **Mobile terrain** : Flutter/Dart, architecture feature-first avec BLoC, cache local SQLite/Drift et file de synchronisation offline-first.
- **Médias** : stockage objet compatible S3 (Cloudflare R2 ou Supabase Storage) ; PostgreSQL ne conserve que les métadonnées et les URLs signées.
- **Temps réel** : Laravel Reverb/WebSockets ou Supabase Realtime selon l’environnement de déploiement.
- **Vocal** : Web Speech API côté navigateur pour les usages simples ; pipeline Whisper côté serveur pour les notes vocales persistées, puis synthèse vocale selon la langue sélectionnée.

Le choix Laravel + PostgreSQL permet de garder une API maîtrisée, testable et déployable indépendamment du web et du mobile. Les contrats de réponse seront documentés en OpenAPI et partagés avec les clients.

## 2. Arborescence proposée

```text
agri-expert-pro/
├── apps/
│   ├── web/                         # React 19 + Vite + TypeScript
│   │   ├── src/
│   │   │   ├── app/                 # router, providers, query client, i18n
│   │   │   ├── components/          # primitives UI et composants partagés
│   │   │   ├── features/
│   │   │   │   ├── auth/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── directory/
│   │   │   │   ├── emergencies/
│   │   │   │   ├── knowledge/
│   │   │   │   └── institutional/
│   │   │   ├── layouts/             # shell producteur, expert, institution
│   │   │   ├── lib/                 # API client, permissions, formatters
│   │   │   ├── routes/
│   │   │   ├── styles/
│   │   │   └── types/               # types générés depuis OpenAPI
│   │   └── public/
│   └── mobile/                      # Flutter, ajouté en phase mobile
│       ├── lib/
│       │   ├── core/                # réseau, stockage, localisation, vocal
│       │   ├── features/             # auth, feed, sos, guides, directory
│       │   ├── l10n/
│       │   └── main.dart
│       └── test/
├── backend/                         # Laravel 11 API
│   ├── app/
│   │   ├── Actions/                 # cas d’usage transactionnels
│   │   ├── Domain/                  # règles métier par bounded context
│   │   ├── Http/Controllers/Api/V1/
│   │   ├── Http/Requests/
│   │   ├── Http/Resources/
│   │   ├── Jobs/                     # transcription, notifications, agrégation
│   │   ├── Models/
│   │   ├── Notifications/
│   │   ├── Policies/
│   │   └── Services/
│   ├── database/
│   │   ├── migrations/
│   │   ├── seeders/
│   │   └── schema.sql               # contrat SQL de référence de l'Étape 1
│   ├── routes/api.php
│   ├── tests/Feature/
│   └── tests/Unit/
├── packages/
│   ├── api-contract/                 # OpenAPI + types générés
│   ├── eslint-config/
│   └── tsconfig/
├── infra/
│   ├── docker/
│   ├── nginx/
│   └── terraform/                    # R2, DB, secrets, observabilité
├── docs/
│   ├── architecture/
│   └── api/
├── .env.example
├── docker-compose.yml
├── package.json
└── pnpm-workspace.yaml
```

## 3. Bounded contexts et flux principaux

| Contexte | Responsabilité | Tables principales |
| --- | --- | --- |
| Identité | comptes, rôles, langues, consentements | `users`, `user_roles`, `device_tokens` |
| Exploitations | fermes, troupeaux, localisation | `farms`, `herds`, `farm_members` |
| Conseil | questions, réponses certifiées, médias | `questions`, `answers`, `media_assets` |
| Urgence | SOS, géolocalisation, affectation prioritaire | `emergency_reports`, `emergency_assignments` |
| Connaissance | guides, itinéraires, protocoles de traitement | `technical_guides`, `itinerary_plans`, `treatment_protocols` |
| Annuaire | experts, compétences, disponibilité, avis | `expert_profiles`, `expert_specialties`, `expert_ratings` |
| Institutionnel | alertes, indicateurs agrégés, audit | `institutional_alerts`, `audit_logs`, vues SQL |

Flux critique SOS :

```text
Producteur → POST /emergency-reports
          → validation + capture PostGIS + transaction
          → recherche des experts actifs dans le rayon
          → affectations prioritaires + notification temps réel
          → prise en charge / résolution
          → agrégation institutionnelle et audit
```

## 4. Convention API et sécurité

- Toutes les routes métier sont sous `/api/v1` et utilisent JSON.
- Les réponses paginées suivent `{ data, meta, links }`.
- Authentification par Laravel Sanctum avec rotation des tokens mobiles.
- Autorisation par Policies Laravel : un producteur ne voit que ses exploitations et ses dossiers ; un expert ne modifie que ses réponses/affectations ; l’institution accède aux agrégats autorisés.
- Les médias privés sont servis par URL signée et temporaire ; aucune clé objet n’est exposée au client.
- Les coordonnées exactes d’une exploitation ne sont jamais exposées dans le fil public. Les vues institutionnelles utilisent une agrégation géographique.
- Les actions sensibles (assignation SOS, changement de statut, validation d’expert) sont inscrites dans `audit_logs`.
- Les textes libres et les transcriptions sont traités comme données potentiellement sensibles ; une politique de rétention configurable sera appliquée aux médias vocaux.

## 5. Indexation et exploitation des données

- `geography(Point, 4326)` pour les positions utilisées dans les distances et les recherches de proximité.
- `geometry(MultiPolygon, 4326)` pour les limites d’exploitation quand elles sont disponibles.
- Index GiST sur chaque colonne spatiale.
- Index composites sur les files opérationnelles : urgence ouverte par statut/priorité, questions par domaine/statut/date, experts par disponibilité/domaine.
- Les indicateurs ministériels sont exposés via des vues SQL agrégées ; une matérialisation ou une table de snapshots pourra être ajoutée quand le volume le justifiera.

## 6. Déploiement cible

```text
CDN/WAF → Web React statique
        ↘ API Laravel (workers + scheduler + WebSocket)
          ↘ PostgreSQL/PostGIS
          ↘ Object Storage (R2)
          ↘ service vocal/transcription
          ↘ service SMS/push (selon disponibilité locale)
```

Le fichier `backend/database/schema.sql` décrit le modèle relationnel de référence. En implémentation Laravel, chaque groupe fonctionnel sera ensuite découpé en migrations idempotentes et accompagné de factories, seeders et tests de contraintes.
