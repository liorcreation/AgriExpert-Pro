import { deleteCurrentSession, json, options } from '../../../_shared/auth.js';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return options(request, env);
  await deleteCurrentSession(env.DB, request);
  return json(request, env, { message: 'Session fermée.' }, 200, { 'Set-Cookie': 'agriexpert_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0' });
}
