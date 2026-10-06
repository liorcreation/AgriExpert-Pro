import { currentUser, invalid, json, options } from '../../../_shared/auth.js';

export async function onRequest(context) {
  const { request, env, params } = context;
  if (request.method === 'OPTIONS') return options(request, env);
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) return json(request, env, invalid('Signalement invalide.'), 422);
  const user = await currentUser(env.DB, request);
  if (!user) return json(request, env, invalid('Connectez-vous pour consulter ce signalement.'), 401);
  const emergency = await env.DB.prepare(`SELECT e.id, e.reference, e.kind, e.title, e.description, e.priority, e.latitude, e.longitude, e.status, e.created_at
    FROM emergencies e WHERE e.id = ? AND e.author_user_id = ?`).bind(id, user.id).first();
  if (!emergency) return json(request, env, invalid('Signalement introuvable.'), 404);
  const events = await env.DB.prepare(`SELECT id, status, note, created_at FROM emergency_events WHERE emergency_id = ? ORDER BY created_at ASC`).bind(id).all();
  return json(request, env, { data: { ...emergency, events: events.results } });
}
