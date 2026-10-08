import { body, createSession, invalid, json, options, rateLimitResponse, userPayload, verifyPassword } from '../../../_shared/auth.js';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return options(request, env);
  if (request.method !== 'POST') return json(request, env, invalid('Méthode non autorisée.'), 405);
  const limited = await rateLimitResponse(env.DB, request, env, 'login', 10, 900);
  if (limited) return limited;
  const input = await body(request);
  const identifier = String(input.identifier ?? '').trim().toLowerCase();
  const method = input.method === 'phone' ? 'phone' : 'email';
  const password = String(input.password ?? '');
  if (!identifier || !password) return json(request, env, invalid('Identifiants incomplets.'), 422);
  const user = await env.DB.prepare(`SELECT id, name, email, phone, role, profile, plan, password_hash
    FROM users WHERE ${method === 'phone' ? 'phone' : 'email'} = ?`).bind(identifier).first();
  if (!user || !(await verifyPassword(password, user.password_hash))) return json(request, env, invalid('Identifiants invalides.'), 422);
  const cookie = await createSession(env.DB, user.id, request);
  return json(request, env, { data: { user: userPayload(user) } }, 200, { 'Set-Cookie': cookie });
}
