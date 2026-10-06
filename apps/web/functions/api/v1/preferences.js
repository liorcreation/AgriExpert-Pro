import { currentUser, invalid, json, options } from '../../_shared/auth.js';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return options(request, env);
  const user = await currentUser(env.DB, request);
  if (!user) return json(request, env, invalid('Connectez-vous pour gérer vos préférences.'), 401);
  if (request.method === 'GET') {
    const data = await env.DB.prepare('SELECT language, voice_enabled, dark_mode, updated_at FROM user_preferences WHERE user_id = ?').bind(user.id).first();
    return json(request, env, { data: data ?? { language: 'fr', voice_enabled: 1, dark_mode: 0 } });
  }
  if (request.method !== 'PUT') return json(request, env, invalid('Méthode non autorisée.'), 405);
  let input = {};
  try { input = await request.json(); } catch { return json(request, env, invalid('Corps JSON invalide.'), 400); }
  const language = input.language === 'mo' ? 'mo' : 'fr';
  const voiceEnabled = input.voiceEnabled === false ? 0 : 1;
  const darkMode = input.darkMode === true ? 1 : 0;
  const data = await env.DB.prepare(`INSERT INTO user_preferences (user_id, language, voice_enabled, dark_mode, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET language = excluded.language, voice_enabled = excluded.voice_enabled, dark_mode = excluded.dark_mode, updated_at = CURRENT_TIMESTAMP
    RETURNING language, voice_enabled, dark_mode, updated_at`).bind(user.id, language, voiceEnabled, darkMode).first();
  return json(request, env, { data });
}
