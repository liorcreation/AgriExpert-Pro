import { currentUser, invalid, json, options } from '../../../_shared/auth.js';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return options(request, env);
  const user = await currentUser(env.DB, request);
  if (!user) return json(request, env, invalid('Connectez-vous pour gérer votre disponibilité.'), 401);
  if (user.role !== 'expert') return json(request, env, invalid('Cette disponibilité est réservée aux experts.'), 403);
  if (request.method === 'GET') {
    const row = await env.DB.prepare(`SELECT user_id, is_available, latitude, longitude, radius_km, last_seen_at, updated_at FROM expert_availability WHERE user_id = ?`).bind(user.id).first();
    return json(request, env, { data: row ?? { user_id: user.id, is_available: 0, latitude: null, longitude: null, radius_km: 50, last_seen_at: null } });
  }
  if (request.method !== 'PUT') return json(request, env, invalid('Méthode non autorisée.'), 405);
  let input = {};
  try { input = await request.json(); } catch { return json(request, env, invalid('Corps JSON invalide.'), 400); }
  const isAvailable = input.isAvailable === true || Number(input.isAvailable) === 1 ? 1 : 0;
  const latitude = input.latitude == null ? null : Number(input.latitude);
  const longitude = input.longitude == null ? null : Number(input.longitude);
  const radiusKm = Number(input.radiusKm ?? 50);
  if (isAvailable && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180)) return json(request, env, invalid('Une position GPS est nécessaire pour se déclarer disponible.'), 422);
  if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 500) return json(request, env, invalid('Le rayon doit être compris entre 1 et 500 km.'), 422);
  const row = await env.DB.prepare(`INSERT INTO expert_availability (user_id, is_available, latitude, longitude, radius_km, last_seen_at, updated_at)
    VALUES (?, ?, ?, ?, ?, CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE NULL END, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET is_available = excluded.is_available, latitude = excluded.latitude, longitude = excluded.longitude, radius_km = excluded.radius_km, last_seen_at = excluded.last_seen_at, updated_at = CURRENT_TIMESTAMP
    RETURNING user_id, is_available, latitude, longitude, radius_km, last_seen_at, updated_at`).bind(user.id, isAvailable, latitude, longitude, radiusKm, isAvailable).first();
  return json(request, env, { data: row });
}
