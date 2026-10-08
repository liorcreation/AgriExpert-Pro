import { body, createSession, invalid, json, options, rateLimitResponse, userPayload, verifyGoogleCredential } from '../../../_shared/auth.js';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return options(request, env);
  if (request.method !== 'POST') return json(request, env, invalid('Méthode non autorisée.'), 405);
  const limited = await rateLimitResponse(env.DB, request, env, 'google-auth', 10, 900);
  if (limited) return limited;
  if (!env.GOOGLE_CLIENT_ID) return json(request, env, invalid('La connexion Google n’est pas encore activée.'), 503);
  const input = await body(request);
  try {
    const claims = await verifyGoogleCredential(input.credential, env.GOOGLE_CLIENT_ID);
    const email = String(claims.email).toLowerCase();
    let user = await env.DB.prepare('SELECT id, name, email, phone, role, profile, plan FROM users WHERE email = ?').bind(email).first();
    if (!user) {
      const role = ['producer', 'expert', 'institution'].includes(input.role) ? input.role : 'producer';
      // Never grant paid entitlements from client-supplied OAuth profile data.
      const plan = role === 'institution' ? 'institution' : 'free';
      const profile = typeof input.profile === 'string' ? input.profile.slice(0, 80) : role === 'producer' ? 'farmer' : role === 'expert' ? 'agronomist' : null;
      user = await env.DB.prepare(`INSERT INTO users (name, email, password_hash, role, profile, plan)
        VALUES (?, ?, ?, ?, ?, ?)
        RETURNING id, name, email, phone, role, profile, plan`).bind(String(claims.name ?? email.split('@')[0]).slice(0, 120), email, `google$${claims.sub}`, role, profile, plan).first();
    }
    const cookie = await createSession(env.DB, user.id, request);
    return json(request, env, { data: { user: userPayload(user) } }, 200, { 'Set-Cookie': cookie });
  } catch (error) {
    console.error('auth.google failed', error);
    return json(request, env, invalid(error instanceof Error ? error.message : 'Connexion Google impossible.'), 401);
  }
}
