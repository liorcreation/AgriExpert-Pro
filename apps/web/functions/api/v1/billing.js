import { body, currentUser, invalid, json, options } from '../../_shared/auth.js';
import { createPaydunyaCheckout, paydunyaConfigured } from '../../_shared/billing.js';

const allowedFeatures = new Set(['photo_diagnosis', 'offline_sync', 'expert_priority', 'institution_reports', 'team_seats']);

function isBillingAdmin(user, env) {
  const allowlist = String(env.BILLING_ADMIN_EMAILS ?? '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean);
  return allowlist.includes(String(user.email ?? '').toLowerCase());
}

function parseJson(value, fallback) {
  try { return JSON.parse(value); } catch { return fallback; }
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return options(request, env);
  const user = await currentUser(env.DB, request);
  if (!user) return json(request, env, invalid('Connectez-vous pour consulter votre formule.'), 401);

  if (request.method === 'GET') {
    try {
      const plans = await env.DB.prepare(`SELECT code, name, amount_xof, billing_interval, sales_enabled, features_json, quotas_json
        FROM billing_plans ORDER BY CASE code WHEN 'free' THEN 0 WHEN 'pro' THEN 1 ELSE 2 END`).all();
      const subscription = await env.DB.prepare(`SELECT id, plan_code, status, current_period_start, current_period_end, cancel_at_period_end, cancelled_at
        FROM subscriptions WHERE user_id = ? ORDER BY id DESC LIMIT 1`).bind(user.id).first();
      const payments = await env.DB.prepare(`SELECT id, plan_code, amount_xof, status, provider, paid_at, created_at
        FROM billing_payments WHERE user_id = ? ORDER BY id DESC LIMIT 20`).bind(user.id).all();
      return json(request, env, { data: {
        currentPlan: user.plan, subscription: subscription ?? null, payments: payments.results, isAdmin: isBillingAdmin(user, env),
        plans: plans.results.map((plan) => ({ ...plan, sales_enabled: Boolean(plan.sales_enabled), features: parseJson(plan.features_json, []), quotas: parseJson(plan.quotas_json, {}) })),
        checkoutConfigured: Boolean(env.PAYDUNYA_MASTER_KEY && env.PAYDUNYA_PRIVATE_KEY && env.PAYDUNYA_TOKEN), storageReady: true,
      } });
    } catch (error) {
      // Keep the page readable during rollout if the D1 migration is still pending.
      // Never expose a paid checkout or fabricate a subscription in this state.
      console.error('billing storage unavailable', error);
      return json(request, env, { data: {
        currentPlan: user.plan, subscription: null, payments: [], isAdmin: false, checkoutConfigured: false, storageReady: false,
        plans: [{ code: 'free', name: 'Free', amount_xof: 0, billing_interval: 'none', sales_enabled: true, features: [], quotas: {} }, { code: 'pro', name: 'PRO', amount_xof: null, billing_interval: 'month', sales_enabled: false, features: [], quotas: {} }, { code: 'institution', name: 'Institution', amount_xof: null, billing_interval: 'contract', sales_enabled: false, features: [], quotas: {} }],
      } });
    }
  }

  if (request.method !== 'POST') return json(request, env, invalid('Méthode non autorisée.'), 405);
  const input = await body(request);
  if (input.action === 'create-checkout') {
    const code = String(input.code ?? '');
    const idempotencyKey = String(request.headers.get('Idempotency-Key') ?? input.idempotencyKey ?? crypto.randomUUID()).slice(0, 120);
    if (!['pro', 'institution'].includes(code)) return json(request, env, invalid('Offre payante invalide.'), 422);
    if (!paydunyaConfigured(env)) return json(request, env, invalid('Le paiement n’est pas encore activé par l’administrateur.'), 503);
    const plan = await env.DB.prepare(`SELECT code, name, amount_xof, billing_interval, sales_enabled FROM billing_plans WHERE code = ?`).bind(code).first();
    if (!plan?.sales_enabled || !Number.isSafeInteger(Number(plan.amount_xof)) || Number(plan.amount_xof) < 1) return json(request, env, invalid('Cette offre n’est pas ouverte à la souscription.'), 409);
    const previous = await env.DB.prepare(`SELECT id, status, checkout_url FROM billing_payments WHERE user_id = ? AND idempotency_key = ?`).bind(user.id, idempotencyKey).first();
    if (previous?.checkout_url && ['created', 'pending'].includes(previous.status)) return json(request, env, { data: { paymentId: previous.id, status: previous.status, checkoutUrl: previous.checkout_url } });
    const payment = await env.DB.prepare(`INSERT INTO billing_payments (user_id, plan_code, amount_xof, provider, idempotency_key, status)
      VALUES (?, ?, ?, 'paydunya', ?, 'created') RETURNING id`).bind(user.id, code, Number(plan.amount_xof), idempotencyKey).first();
    try {
      const origin = new URL(request.url).origin;
      const checkout = await createPaydunyaCheckout(env, { amount: Number(plan.amount_xof), description: `AgriExpert ${plan.name} · ${plan.billing_interval}`, customer: user, origin, idempotencyKey, paymentId: payment.id });
      await env.DB.prepare(`UPDATE billing_payments SET status = 'pending', provider_reference = ?, checkout_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(checkout.token, checkout.checkoutUrl, payment.id).run();
      return json(request, env, { data: { paymentId: payment.id, status: 'pending', checkoutUrl: checkout.checkoutUrl } }, 201);
    } catch (error) {
      await env.DB.prepare(`UPDATE billing_payments SET status = 'failed', failure_code = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(String(error?.message ?? 'checkout_failed').slice(0, 200), payment.id).run();
      return json(request, env, invalid(error instanceof Error ? error.message : 'Création du paiement impossible.'), 502);
    }
  }
  if (input.action === 'cancel-subscription') {
    const subscription = await env.DB.prepare(`SELECT id, status, current_period_end FROM subscriptions WHERE user_id = ? AND status IN ('active', 'past_due') ORDER BY id DESC LIMIT 1`).bind(user.id).first();
    if (!subscription) return json(request, env, invalid('Aucun abonnement actif à annuler.'), 404);
    await env.DB.prepare(`UPDATE subscriptions SET cancel_at_period_end = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(subscription.id).run();
    await env.DB.prepare(`INSERT INTO billing_audit_events (actor_user_id, subject_user_id, event_type, details_json) VALUES (?, ?, 'subscription_cancel_requested', ?)`)
      .bind(user.id, user.id, JSON.stringify({ subscription_id: subscription.id, current_period_end: subscription.current_period_end })).run();
    return json(request, env, { data: { cancelledAtPeriodEnd: true, currentPeriodEnd: subscription.current_period_end } });
  }
  if (input.action !== 'configure-plan') return json(request, env, invalid('Action de facturation invalide.'), 422);
  if (!isBillingAdmin(user, env)) return json(request, env, invalid('Accès administrateur requis.'), 403);

  const code = String(input.code ?? '');
  const amount = input.amountXof === '' || input.amountXof == null ? null : Number(input.amountXof);
  const interval = String(input.interval ?? 'month');
  const enabled = input.salesEnabled === true;
  const features = Array.isArray(input.features) ? [...new Set(input.features.map(String))] : [];
  const quotas = input.quotas && typeof input.quotas === 'object' && !Array.isArray(input.quotas) ? input.quotas : {};
  if (!['pro', 'institution'].includes(code)) return json(request, env, invalid('Seules les offres PRO et Institution sont configurables ici.'), 422);
  if (enabled && (!Number.isSafeInteger(amount) || amount < 1 || amount > 100000000 || !['month', 'year', 'contract'].includes(interval))) return json(request, env, invalid('Définissez un tarif XOF positif et une périodicité valide avant d’activer l’offre.'), 422);
  if (features.some((feature) => !allowedFeatures.has(feature))) return json(request, env, invalid('Une fonctionnalité sélectionnée n’est pas reconnue.'), 422);
  if (Object.keys(quotas).some((key) => !allowedFeatures.has(key) || !Number.isSafeInteger(Number(quotas[key])) || Number(quotas[key]) < 0)) return json(request, env, invalid('Les quotas doivent être des nombres entiers positifs ou nuls.'), 422);

  await env.DB.prepare(`UPDATE billing_plans SET amount_xof = ?, billing_interval = ?, sales_enabled = ?, features_json = ?, quotas_json = ?, updated_at = CURRENT_TIMESTAMP, updated_by_user_id = ? WHERE code = ?`)
    .bind(amount, interval, Number(enabled), JSON.stringify(features), JSON.stringify(quotas), user.id, code).run();
  await env.DB.prepare(`INSERT INTO billing_audit_events (actor_user_id, event_type, details_json) VALUES (?, 'plan_configured', ?)`)
    .bind(user.id, JSON.stringify({ code, amount_xof: amount, interval, sales_enabled: enabled, features, quotas })).run();
  return json(request, env, { data: { saved: true } });
}
