import { json, options } from '../../_shared/auth.js';

export async function onRequest(context) {
  if (context.request.method === 'OPTIONS') return options(context.request, context.env);
  return json(context.request, context.env, { status: 'ok', service: 'agriexpert-cloudflare-api', version: 'v1' });
}
