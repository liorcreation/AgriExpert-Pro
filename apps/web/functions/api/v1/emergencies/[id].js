import { currentUser, invalid, json, options } from '../../../_shared/auth.js';
import { assignNextExpert, expireAndEscalate } from '../../../_shared/emergencies.js';

async function readEmergency(db, id, user) {
  return db.prepare(`SELECT e.id, e.reference, e.author_user_id, e.kind, e.title, e.description, e.priority, e.latitude, e.longitude, e.status, e.assigned_expert_user_id, e.assigned_at, e.acknowledged_at, e.sla_due_at, e.escalation_count, e.created_at,
      u.name AS assigned_expert_name, u.profile AS assigned_expert_profile,
      ea.id AS assignment_id, ea.status AS assignment_status, ea.distance_km AS assignment_distance_km, ea.expires_at AS assignment_expires_at
    FROM emergencies e LEFT JOIN users u ON u.id = e.assigned_expert_user_id
    LEFT JOIN emergency_assignments ea ON ea.id = (SELECT current.id FROM emergency_assignments current WHERE current.emergency_id = e.id ORDER BY current.id DESC LIMIT 1)
    WHERE e.id = ? AND (e.author_user_id = ? OR e.assigned_expert_user_id = ? OR ? = 'institution')`).bind(id, user.id, user.id, user.role).first();
}

export async function onRequest(context) {
  const { request, env, params } = context;
  if (request.method === 'OPTIONS') return options(request, env);
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) return json(request, env, invalid('Signalement invalide.'), 422);
  const user = await currentUser(env.DB, request);
  if (!user) return json(request, env, invalid('Connectez-vous pour consulter ce signalement.'), 401);
  const emergency = await readEmergency(env.DB, id, user);
  if (!emergency) return json(request, env, invalid('Signalement introuvable.'), 404);
  if (request.method === 'GET') {
    await expireAndEscalate(env.DB, emergency);
    const refreshed = await readEmergency(env.DB, id, user);
    const events = await env.DB.prepare(`SELECT id, status, note, created_at FROM emergency_events WHERE emergency_id = ? ORDER BY created_at ASC`).bind(id).all();
    return json(request, env, { data: { ...refreshed, assignment_distance_km: refreshed.assignment_distance_km == null ? null : Number(refreshed.assignment_distance_km), events: events.results } });
  }
  if (request.method !== 'PATCH') return json(request, env, invalid('Méthode non autorisée.'), 405);
  let input = {};
  try { input = await request.json(); } catch { return json(request, env, invalid('Corps JSON invalide.'), 400); }
  const action = String(input.action ?? '');
  if (user.role === 'expert' && ['accept', 'decline', 'resolve'].includes(action)) {
    const assignment = await env.DB.prepare(`SELECT id, expert_user_id, status FROM emergency_assignments WHERE emergency_id = ? AND expert_user_id = ? AND status IN ('offered', 'accepted') ORDER BY id DESC LIMIT 1`).bind(id, user.id).first();
    if (!assignment) return json(request, env, invalid('Ce signalement ne vous est plus attribué.'), 409);
    if (action === 'accept') {
      await env.DB.prepare(`UPDATE emergency_assignments SET status = 'accepted', responded_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(assignment.id).run();
      await env.DB.prepare(`UPDATE emergencies SET acknowledged_at = CURRENT_TIMESTAMP, status = 'assigned' WHERE id = ?`).bind(id).run();
      await env.DB.prepare(`INSERT INTO emergency_events (emergency_id, actor_user_id, status, note) VALUES (?, ?, 'assigned', ?)`).bind(id, user.id, 'Expert mobilisé; prise en charge confirmée.').run();
    } else if (action === 'decline') {
      await env.DB.prepare(`UPDATE emergency_assignments SET status = 'declined', responded_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(assignment.id).run();
      await env.DB.prepare(`UPDATE emergencies SET status = 'open', assigned_expert_user_id = NULL WHERE id = ?`).bind(id).run();
      await env.DB.prepare(`INSERT INTO emergency_events (emergency_id, actor_user_id, status, note) VALUES (?, ?, 'open', ?)`).bind(id, user.id, 'Expert indisponible; recherche d’un autre professionnel.').run();
      await assignNextExpert(env.DB, { ...emergency, assigned_expert_user_id: null }, [user.id]);
    } else {
      await env.DB.prepare(`UPDATE emergencies SET status = 'resolved' WHERE id = ?`).bind(id).run();
      await env.DB.prepare(`UPDATE emergency_assignments SET status = 'accepted', responded_at = COALESCE(responded_at, CURRENT_TIMESTAMP) WHERE id = ?`).bind(assignment.id).run();
      await env.DB.prepare(`INSERT INTO emergency_events (emergency_id, actor_user_id, status, note) VALUES (?, ?, 'resolved', ?)`).bind(id, user.id, 'Intervention clôturée comme résolue par l’expert.').run();
    }
  } else if (user.id === emergency.author_user_id && action === 'close') {
    await env.DB.prepare(`UPDATE emergencies SET status = 'closed' WHERE id = ?`).bind(id).run();
    await env.DB.prepare(`INSERT INTO emergency_events (emergency_id, actor_user_id, status, note) VALUES (?, ?, 'closed', ?)`).bind(id, user.id, 'Signalement clôturé par le producteur.').run();
  } else {
    return json(request, env, invalid('Action non autorisée pour ce dossier.'), 403);
  }
  const updated = await readEmergency(env.DB, id, user);
  const events = await env.DB.prepare(`SELECT id, status, note, created_at FROM emergency_events WHERE emergency_id = ? ORDER BY created_at ASC`).bind(id).all();
  return json(request, env, { data: { ...updated, assignment_distance_km: updated.assignment_distance_km == null ? null : Number(updated.assignment_distance_km), events: events.results } });
}
