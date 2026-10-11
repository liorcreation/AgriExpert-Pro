import { currentUser, invalid, json, options } from '../../_shared/auth.js';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return options(request, env);
  if (request.method !== 'GET') return json(request, env, invalid('Méthode non autorisée.'), 405);
  const user = await currentUser(env.DB, request);
  if (!user) return json(request, env, invalid('Connectez-vous pour consulter votre activité.'), 401);
  if (user.role !== 'producer') return json(request, env, invalid('Cette vue est réservée aux comptes producteurs.'), 403);

  const url = new URL(request.url);
  const period = url.searchParams.get('period') === '30d' ? '30d' : '7d';
  const days = period === '30d' ? 30 : 7;
  const since = `-${days - 1} days`;
  const [totals, trend, latest, emergencies] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) AS total,
        SUM(CASE WHEN q.status IN ('answered', 'closed') THEN 1 ELSE 0 END) AS answered,
        SUM(CASE WHEN q.status = 'open' THEN 1 ELSE 0 END) AS open,
        SUM(CASE WHEN q.has_photo = 1 OR q.has_voice = 1 THEN 1 ELSE 0 END) AS with_media,
        (SELECT COUNT(*) FROM question_answers a JOIN questions answered_q ON answered_q.id = a.question_id
          WHERE answered_q.author_user_id = ? AND a.created_at >= datetime('now', ?)) AS answers_received
      FROM questions q WHERE q.author_user_id = ? AND q.created_at >= datetime('now', ?)`)
      .bind(user.id, since, user.id, since).first(),
    env.DB.prepare(`SELECT date(created_at) AS day, COUNT(*) AS requests,
        SUM(CASE WHEN status IN ('answered', 'closed') THEN 1 ELSE 0 END) AS answered
      FROM questions WHERE author_user_id = ? AND created_at >= datetime('now', ?)
      GROUP BY date(created_at) ORDER BY day ASC`).bind(user.id, since).all(),
    env.DB.prepare(`SELECT q.id, q.title, q.category, q.status, q.created_at, q.has_photo, q.has_voice,
        (SELECT COUNT(*) FROM question_answers a WHERE a.question_id = q.id) AS answer_count
      FROM questions q WHERE q.author_user_id = ? ORDER BY q.created_at DESC LIMIT 4`).bind(user.id).all(),
    env.DB.prepare(`SELECT COUNT(*) AS active FROM emergencies WHERE author_user_id = ? AND status IN ('open', 'assigned')`)
      .bind(user.id).first(),
  ]);

  return json(request, env, { data: {
    period,
    kpis: {
      totalQuestions: Number(totals?.total ?? 0),
      answeredQuestions: Number(totals?.answered ?? 0),
      openQuestions: Number(totals?.open ?? 0),
      withMedia: Number(totals?.with_media ?? 0),
      answersReceived: Number(totals?.answers_received ?? 0),
      activeEmergencies: Number(emergencies?.active ?? 0),
    },
    trend: trend.results.map((row) => ({ day: row.day, requests: Number(row.requests ?? 0), answered: Number(row.answered ?? 0) })),
    latestQuestions: latest.results.map((row) => ({ ...row, answer_count: Number(row.answer_count ?? 0) })),
    lastUpdated: new Date().toISOString(),
  } });
}
