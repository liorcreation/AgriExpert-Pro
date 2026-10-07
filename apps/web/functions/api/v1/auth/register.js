import { body, createSession, invalid, json, options, hashPassword, userPayload } from '../../../_shared/auth.js';

const roles = new Set(['producer', 'expert', 'institution']);

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return options(request, env);
  if (request.method !== 'POST') return json(request, env, invalid('Méthode non autorisée.'), 405);
  const input = await body(request);
  const name = String(input.name ?? '').trim();
  const email = String(input.email ?? '').trim().toLowerCase();
  const password = String(input.password ?? '');
  const role = String(input.role ?? '');
  const profile = input.profile ? String(input.profile).trim() : null;
  // A browser-selected plan is not proof of payment. New public accounts always
  // start on the free tier; institutional access is a role, not a paid plan.
  const plan = role === 'institution' ? 'institution' : 'free';

  if (name.length < 2 || name.length > 120) return json(request, env, invalid('Le nom doit contenir entre 2 et 120 caractères.'), 422);
  if (!/^\S+@\S+\.\S+$/.test(email)) return json(request, env, invalid('Une adresse email valide est requise.'), 422);
  if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) return json(request, env, invalid('Le mot de passe doit contenir 8 caractères, une majuscule, une minuscule et un chiffre.'), 422);
  if (!roles.has(role)) return json(request, env, invalid('Profil utilisateur invalide.'), 422);

  try {
    const passwordHash = await hashPassword(password);
    const result = await env.DB.prepare('INSERT INTO users (name, email, password_hash, role, profile, plan) VALUES (?, ?, ?, ?, ?, ?) RETURNING id, name, email, phone, role, profile, plan')
      .bind(name, email, passwordHash, role, profile, plan).first();
    const cookie = await createSession(env.DB, result.id, request);
    return json(request, env, { data: { user: userPayload(result) } }, 201, { 'Set-Cookie': cookie });
  } catch (error) {
    console.error('auth.register failed', error);
    if (String(error).toLowerCase().includes('unique')) return json(request, env, invalid('Cette adresse email est déjà utilisée.'), 409);
    return json(request, env, invalid('Création du compte impossible.'), 500);
  }
}
