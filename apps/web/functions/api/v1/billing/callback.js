import { json, invalid, options } from '../../../_shared/auth.js';
import { parsePaydunyaCallback, settlePaydunyaPayment, verifyPaydunyaHash } from '../../../_shared/billing.js';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return options(request, env);
  if (request.method !== 'POST') return json(request, env, invalid('Méthode non autorisée.'), 405);
  const data = await parsePaydunyaCallback(request);
  if (!data || !(await verifyPaydunyaHash(data, env.PAYDUNYA_MASTER_KEY))) return json(request, env, invalid('Signature de paiement invalide.'), 401);
  try {
    const result = await settlePaydunyaPayment(env.DB, data);
    if (!result.ok && result.reason === 'payment_not_found') return json(request, env, invalid('Paiement inconnu.'), 404);
    if (!result.ok) return json(request, env, invalid('Paiement rejeté.'), 422);
    return json(request, env, { data: result });
  } catch (error) {
    console.error('billing.callback failed', error);
    return json(request, env, invalid('Confirmation du paiement impossible.'), 500);
  }
}
