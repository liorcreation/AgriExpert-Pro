# AgriExpert — socle API v1 (Laravel 12)

Le backend Laravel fournit maintenant une première tranche persistante et sécurisée :

- `GET /api/v1/health` : disponibilité du service ;
- `POST /api/v1/auth/register` : création d’un compte avec rôle et formule ;
- `POST /api/v1/auth/login` : authentification par email ou téléphone et token Sanctum ;
- `GET /api/v1/auth/me` : session courante ;
- `POST /api/v1/auth/logout` : révocation du token courant ;
- `GET /api/v1/questions` : fil paginé avec recherche et filtre par secteur ;
- `POST /api/v1/questions` : création authentifiée d’une question.

Le contrat utilise les réponses JSON versionnées sous `/api/v1`. Les médias, les réponses expertes, le SOS, les paiements et les agrégats institutionnels seront ajoutés par tranches verticales afin de conserver des migrations et des règles d’autorisation testables.

Le frontend utilise cette API lorsqu’une variable `VITE_API_URL` est définie, par exemple `https://api.exemple.bf/api/v1`. Sans cette variable, le mode démonstration local reste disponible pour les maquettes et les tests visuels.

Le framework est fixé sur Laravel 12.60+ : cette contrainte évite de réintroduire les avis de sécurité corrigés dans les versions antérieures de Laravel 11. `composer audit` doit rester sans avis avant chaque livraison.

## Démarrage local

```bash
docker compose up --build
```

API locale : `http://localhost:8000`  
Healthcheck : `http://localhost:8000/api/v1/health`

Le mot de passe PostgreSQL présent dans `docker-compose.yml` est strictement réservé au développement local. En production, les secrets doivent venir du gestionnaire de secrets de l’hébergeur.
