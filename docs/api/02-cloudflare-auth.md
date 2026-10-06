# Authentification de production Cloudflare

La première tranche d’authentification publique utilise une Page Function Cloudflare et D1 :

- `apps/web/functions/api/v1/auth/register.js` crée les comptes ;
- `apps/web/functions/api/v1/auth/login.js` ouvre une session ;
- `apps/web/functions/api/v1/auth/me.js` vérifie la session ;
- `apps/web/functions/api/v1/auth/logout.js` révoque la session ;
- `apps/web/functions/api/v1/auth/google.js` vérifie les ID tokens Google et ouvre une session ;
- `apps/web/db/schema.sql` définit les tables `users` et `sessions` ;
- `apps/web/wrangler.json` attache la base D1 `agriexpert-auth-prod`.

Les mots de passe sont dérivés avec PBKDF2-SHA-256 et les sessions utilisent un cookie `HttpOnly`, `Secure` et `SameSite=Lax`. Le token brut n’est jamais stocké en base.

## Développement et publication

```bash
pnpm --filter @agri-expert/web build
cd apps/web
npx wrangler pages deploy dist --project-name=agriexpert-pro --branch=main
```

La variable de production `VITE_API_URL=/api/v1` fait utiliser l’API de la même origine. Aucun secret d’authentification n’est nécessaire dans le frontend.

Cette tranche est adaptée au démarrage et au MVP. D1 reste soumis aux quotas du plan Cloudflare ; PostgreSQL/PostGIS demeure prévu pour les données géospatiales et les modules métier plus lourds.

## Activation Google

Créer un client OAuth de type **Web application** dans Google Cloud Console, puis ajouter `https://agriexpert-pro.pages.dev` aux origines JavaScript autorisées. Le Client ID est une valeur publique : il peut être placé dans `VITE_GOOGLE_CLIENT_ID` côté build frontend et dans le secret/variable `GOOGLE_CLIENT_ID` des Pages Functions. Le serveur vérifie la signature, l’audience, l’émetteur, l’expiration et `email_verified` avant de créer le compte.

Google Identity Services recommande l’initialisation avec `google.accounts.id.initialize` et la vérification serveur des claims du jeton avant d’accepter une session : [référence JavaScript Google](https://developers.google.com/identity/gsi/web/reference/js-reference), [vérification officielle du jeton](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).
