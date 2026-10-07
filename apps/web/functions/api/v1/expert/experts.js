import { currentUser, invalid, json, options } from '../../../_shared/auth.js';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return options(request, env);
  const user = await currentUser(env.DB, request);
  if (!user) return json(request, env, invalid('Connectez-vous pour transférer un dossier.'), 401);
  if (user.role !== 'expert') return json(request, env, invalid('Cette action est réservée aux experts.'), 403);
  if (request.method !== 'GET') return json(request, env, invalid('Méthode non autorisée.'), 405);
  const rows = await env.DB.prepare(`SELECT u.id, u.name, u.profile, COALESCE(a.is_available, 0) AS is_available, a.last_seen_at
    FROM users u LEFT JOIN expert_availability a ON a.user_id = u.id
    WHERE u.role = 'expert' AND u.id != ? ORDER BY is_available DESC, u.name ASC LIMIT 100`).bind(user.id).all();
  return json(request, env, { data: rows.results });
}
