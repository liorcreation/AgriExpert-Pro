import { currentUser, invalid, json, options, userPayload } from '../../../_shared/auth.js';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return options(request, env);
  if (request.method !== 'GET') return json(request, env, invalid('Méthode non autorisée.'), 405);
  const user = await currentUser(env.DB, request);
  if (!user) return json(request, env, invalid('Session absente ou expirée.'), 401);
  return json(request, env, { data: { user: userPayload(user) } });
}
