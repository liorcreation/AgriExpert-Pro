import { currentUser, invalid, json, options } from '../../../_shared/auth.js';
import { reconcileEmergencies } from '../../../_shared/emergencies.js';

function authorized(request, env) {
  const secret = String(env.EMERGENCY_RECONCILE_SECRET ?? '').trim();
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '').trim();
  return Boolean(secret && token && token === secret);
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return options(request, env);
  if (request.method !== 'POST') return json(request, env, invalid('Méthode non autorisée.'), 405);
  if (!authorized(request, env)) return json(request, env, invalid('Jeton de réconciliation invalide.'), 401);
  try {
    const result = await reconcileEmergencies(env.DB, env);
    return json(request, env, { data: result });
  } catch (error) {
    console.error('emergency.reconcile failed', error);
    return json(request, env, invalid('Réconciliation SOS impossible.'), 500);
  }
}
