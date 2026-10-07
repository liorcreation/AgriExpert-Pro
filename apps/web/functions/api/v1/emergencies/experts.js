import { currentUser, invalid, json, options } from '../../../_shared/auth.js';
import { availableExperts, publicExpert } from '../../../_shared/emergencies.js';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return options(request, env);
  const user = await currentUser(env.DB, request);
  if (!user) return json(request, env, invalid('Connectez-vous pour consulter les disponibilités.'), 401);
  if (request.method !== 'GET') return json(request, env, invalid('Méthode non autorisée.'), 405);
  const url = new URL(request.url);
  const latitude = Number(url.searchParams.get('latitude'));
  const longitude = Number(url.searchParams.get('longitude'));
  const kind = String(url.searchParams.get('kind') ?? 'veterinary');
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return json(request, env, invalid('Une position valide est nécessaire.'), 422);
  const experts = await availableExperts(env.DB, latitude, longitude, kind);
  return json(request, env, { data: experts.map(publicExpert), source: 'expert_availability', distance: 'haversine_km' });
}
