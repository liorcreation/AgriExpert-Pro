import { currentUser, invalid, json, options } from '../../_shared/auth.js';
import { assignNextExpert, availableExperts, expireAndEscalate, publicExpert } from '../../_shared/emergencies.js';

const kinds = new Set(['veterinary', 'phytosanitary', 'livestock_epidemic', 'pest_attack', 'water_quality']);
const priorities = new Set(['medium', 'high', 'critical']);

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return options(request, env);
  const user = await currentUser(env.DB, request);
  if (!user) return json(request, env, invalid('Connectez-vous pour transmettre un signalement.'), 401);
  if (request.method === 'GET') {
    const url = new URL(request.url);
    const limit = Math.max(1, Math.min(50, Number(url.searchParams.get('limit') ?? 10)));
    const ownerClause = user.role === 'expert' ? 'e.assigned_expert_user_id = ? AND e.status IN (\'assigned\', \'open\')' : 'e.author_user_id = ?';
    const rows = await env.DB.prepare(`SELECT e.id, e.reference, e.author_user_id, e.kind, e.title, e.description, e.priority, e.latitude, e.longitude, e.status, e.assigned_expert_user_id, e.assigned_at, e.acknowledged_at, e.sla_due_at, e.escalation_count, e.created_at,
        author.name AS author_name, u.name AS assigned_expert_name, u.profile AS assigned_expert_profile,
        ea.status AS assignment_status, ea.distance_km AS assignment_distance_km, ea.expires_at AS assignment_expires_at
      FROM emergencies e JOIN users author ON author.id = e.author_user_id LEFT JOIN users u ON u.id = e.assigned_expert_user_id
      LEFT JOIN emergency_assignments ea ON ea.id = (SELECT current.id FROM emergency_assignments current WHERE current.emergency_id = e.id ORDER BY current.id DESC LIMIT 1)
      WHERE ${ownerClause} ORDER BY e.id DESC LIMIT ?`).bind(user.id, limit).all();
    for (const emergency of rows.results) await expireAndEscalate(env.DB, emergency);
    const refreshed = await env.DB.prepare(`SELECT e.id, e.reference, e.author_user_id, e.kind, e.title, e.description, e.priority, e.latitude, e.longitude, e.status, e.assigned_expert_user_id, e.assigned_at, e.acknowledged_at, e.sla_due_at, e.escalation_count, e.created_at,
        author.name AS author_name, u.name AS assigned_expert_name, u.profile AS assigned_expert_profile,
        ea.status AS assignment_status, ea.distance_km AS assignment_distance_km, ea.expires_at AS assignment_expires_at
      FROM emergencies e JOIN users author ON author.id = e.author_user_id LEFT JOIN users u ON u.id = e.assigned_expert_user_id
      LEFT JOIN emergency_assignments ea ON ea.id = (SELECT current.id FROM emergency_assignments current WHERE current.emergency_id = e.id ORDER BY current.id DESC LIMIT 1)
      WHERE ${ownerClause} ORDER BY e.id DESC LIMIT ?`).bind(user.id, limit).all();
    return json(request, env, { data: refreshed.results.map((item) => ({ ...item, assignment_distance_km: item.assignment_distance_km == null ? null : Number(item.assignment_distance_km) })) });
  }
  if (request.method !== 'POST') return json(request, env, invalid('Méthode non autorisée.'), 405);
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
  await env.DB.prepare(`INSERT INTO emergency_events (emergency_id, actor_user_id, status, note) VALUES (?, ?, 'open', ?)`)
    .bind(result.id, user.id, 'Signalement créé par le producteur.').run();
  const attachmentIds = Array.isArray(input.attachmentIds) ? input.attachmentIds.map(Number).filter(Number.isInteger).slice(0, 4) : [];
  if (attachmentIds.length) {
    await env.DB.prepare(`UPDATE media_assets SET emergency_id = ? WHERE owner_user_id = ? AND id IN (${attachmentIds.map(() => '?').join(',')})`)
      .bind(result.id, user.id, ...attachmentIds).run();
  }
  const assignment = await assignNextExpert(env.DB, result);
  if (!assignment && env.EMERGENCY_FALLBACK_WEBHOOK_URL) {
    const fallbackPayload = JSON.stringify({ type: 'emergency_unassigned', emergency: result, reason: 'Aucun expert disponible dans le rayon configuré.' });
    context.waitUntil(fetch(env.EMERGENCY_FALLBACK_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: fallbackPayload }).catch(() => undefined));
  }
  return json(request, env, { data: { ...result, assignment, assignment_status: assignment ? assignment.status : 'unassigned', fallback_available: Boolean(env.EMERGENCY_FALLBACK_WEBHOOK_URL || env.EMERGENCY_FALLBACK_PHONE) } }, 201);
}
