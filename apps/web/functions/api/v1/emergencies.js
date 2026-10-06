import { currentUser, invalid, json, options } from '../../_shared/auth.js';

const kinds = new Set(['veterinary', 'phytosanitary', 'livestock_epidemic', 'pest_attack', 'water_quality']);
const priorities = new Set(['medium', 'high', 'critical']);

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return options(request, env);
  if (request.method !== 'POST') return json(request, env, invalid('Méthode non autorisée.'), 405);
  const user = await currentUser(env.DB, request);
  if (!user) return json(request, env, invalid('Connectez-vous pour transmettre un signalement.'), 401);
  let input = {};
  try { input = await request.json(); } catch { return json(request, env, invalid('Corps JSON invalide.'), 400); }
  const kind = String(input.kind ?? '');
  const title = String(input.title ?? '').trim();
  const description = String(input.description ?? '').trim();
  const priority = String(input.priority ?? 'high');
  const latitude = Number(input.latitude);
  const longitude = Number(input.longitude);
  if (!kinds.has(kind) || !priorities.has(priority)) return json(request, env, invalid('Type ou priorité de signalement invalide.'), 422);
  if (title.length < 4 || title.length > 200 || description.length > 10000) return json(request, env, invalid('Le titre ou la description ne respecte pas les limites autorisées.'), 422);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return json(request, env, invalid('Une position GPS valide est nécessaire.'), 422);
  const reference = `SOS-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const result = await env.DB.prepare(`INSERT INTO emergencies (reference, author_user_id, kind, title, description, priority, latitude, longitude)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id, reference, kind, title, description, priority, latitude, longitude, status, created_at`)
    .bind(reference, user.id, kind, title, description, priority, latitude, longitude).first();
  return json(request, env, { data: result }, 201);
}
