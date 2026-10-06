import { currentUser, invalid, json, options } from '../../../../_shared/auth.js';

export async function onRequest(context) {
  const { request, env, params } = context;
  if (request.method === 'OPTIONS') return options(request, env);
  if (request.method !== 'POST' && request.method !== 'DELETE') return json(request, env, invalid('Méthode non autorisée.'), 405);
  const questionId = Number(params.id);
  if (!Number.isInteger(questionId) || questionId < 1) return json(request, env, invalid('Question invalide.'), 422);
  const user = await currentUser(env.DB, request);
  if (!user) return json(request, env, invalid('Connectez-vous pour réagir.'), 401);
  const question = await env.DB.prepare('SELECT id FROM questions WHERE id = ?').bind(questionId).first();
  if (!question) return json(request, env, invalid('Question introuvable.'), 404);
  if (request.method === 'POST') {
    await env.DB.prepare("INSERT OR IGNORE INTO question_reactions (question_id, user_id, reaction) VALUES (?, ?, 'useful')").bind(questionId, user.id).run();
  } else {
    await env.DB.prepare("DELETE FROM question_reactions WHERE question_id = ? AND user_id = ? AND reaction = 'useful'").bind(questionId, user.id).run();
  }
  const count = await env.DB.prepare("SELECT COUNT(*) AS total FROM question_reactions WHERE question_id = ? AND reaction = 'useful'").bind(questionId).first();
  return json(request, env, { data: { question_id: questionId, useful_count: count.total, reacted: request.method === 'POST' } });
}
