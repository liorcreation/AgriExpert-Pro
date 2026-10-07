import { currentUser, invalid, json, options } from '../../../_shared/auth.js';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return options(request, env);
  const user = await currentUser(env.DB, request);
  if (!user) return json(request, env, invalid('Connectez-vous pour ouvrir votre espace expert.'), 401);
  if (user.role !== 'expert') return json(request, env, invalid('Cet espace est réservé aux experts.'), 403);
  if (request.method !== 'GET') return json(request, env, invalid('Méthode non autorisée.'), 405);
  try {
    const queue = await env.DB.prepare(`SELECT q.id, q.category, q.title, q.body, q.language, q.has_voice, q.has_photo, q.photo_name, q.status, q.created_at,
        producer.name AS producer_name, producer.profile AS producer_profile,
        ec.expert_user_id AS assigned_expert_user_id, ec.status AS case_status, ec.updated_at AS case_updated_at,
        (SELECT m.id FROM media_assets m WHERE m.question_id = q.id AND m.kind = 'photo' ORDER BY m.id ASC LIMIT 1) AS photo_asset_id,
        (SELECT m.id FROM media_assets m WHERE m.question_id = q.id AND m.kind = 'voice' ORDER BY m.id ASC LIMIT 1) AS voice_asset_id,
        (SELECT COUNT(*) FROM question_answers a WHERE a.question_id = q.id) AS answer_count
      FROM questions q JOIN users producer ON producer.id = q.author_user_id
      LEFT JOIN expert_cases ec ON ec.question_id = q.id
      WHERE (q.status = 'open' AND (ec.status IS NULL OR ec.status IN ('queued', 'waiting_producer'))) OR ec.expert_user_id = ?
      ORDER BY CASE WHEN ec.expert_user_id = ? THEN 0 WHEN q.status = 'open' THEN 1 ELSE 2 END, q.created_at DESC LIMIT 100`).bind(user.id, user.id).all();
    const [stats, availability, earnings] = await Promise.all([
      env.DB.prepare(`SELECT
        SUM(CASE WHEN q.status = 'open' AND (ec.status IS NULL OR ec.status IN ('queued', 'waiting_producer')) THEN 1 ELSE 0 END) AS queued,
        SUM(CASE WHEN ec.expert_user_id = ? AND ec.status IN ('in_progress', 'waiting_producer') THEN 1 ELSE 0 END) AS assigned,
        (SELECT COUNT(*) FROM question_answers a WHERE a.author_user_id = ? AND a.created_at >= datetime('now', '-7 days')) AS responses_week,
        (SELECT AVG((julianday(a.created_at) - julianday(q2.created_at)) * 1440) FROM question_answers a JOIN questions q2 ON q2.id = a.question_id WHERE a.author_user_id = ? AND a.created_at >= datetime('now', '-30 days')) AS average_response
        FROM questions q LEFT JOIN expert_cases ec ON ec.question_id = q.id`).bind(user.id, user.id, user.id).first(),
      env.DB.prepare(`SELECT user_id, is_available, latitude, longitude, radius_km, last_seen_at, updated_at FROM expert_availability WHERE user_id = ?`).bind(user.id).first(),
      env.DB.prepare(`SELECT COALESCE(SUM(CASE WHEN status IN ('pending', 'approved') THEN amount_xof ELSE 0 END), 0) AS pending_xof,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_xof ELSE 0 END), 0) AS paid_xof,
        COUNT(*) AS entries FROM expert_earnings WHERE expert_user_id = ?`).bind(user.id).first(),
    ]);
    return json(request, env, { data: {
      queue: queue.results,
      stats: { queued: Number(stats?.queued ?? 0), assigned: Number(stats?.assigned ?? 0), responsesWeek: Number(stats?.responses_week ?? 0), averageResponseMinutes: Number.isFinite(Number(stats?.average_response)) ? Math.round(Number(stats.average_response)) : null },
      availability: availability ?? { user_id: user.id, is_available: 0, latitude: null, longitude: null, radius_km: 50, last_seen_at: null },
      earnings: { pendingXof: Number(earnings?.pending_xof ?? 0), paidXof: Number(earnings?.paid_xof ?? 0), entries: Number(earnings?.entries ?? 0), configured: false },
    } });
  } catch (error) {
    console.error('expert workspace unavailable', error);
    return json(request, env, invalid('L’espace expert est momentanément indisponible.'), 503);
  }
}
