const encoder = new TextEncoder();

function hex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha512(value) {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-512', encoder.encode(value))));
}

export function paydunyaEndpoint(env, path) {
  const mode = String(env.PAYDUNYA_MODE ?? 'test').toLowerCase() === 'live' ? 'live' : 'test';
  return `https://app.paydunya.com/${mode === 'live' ? 'api' : 'sandbox-api'}/v1/${path}`;
}

export function paydunyaConfigured(env) {
  return Boolean(env.PAYDUNYA_MASTER_KEY && env.PAYDUNYA_PRIVATE_KEY && env.PAYDUNYA_TOKEN);
}

export async function createPaydunyaCheckout(env, { amount, description, customer, origin, idempotencyKey, paymentId }) {
  if (!paydunyaConfigured(env)) throw new Error('Le compte marchand PayDunya n’est pas configuré.');
  const response = await fetch(paydunyaEndpoint(env, 'checkout-invoice/create'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'PAYDUNYA-MASTER-KEY': env.PAYDUNYA_MASTER_KEY, 'PAYDUNYA-PRIVATE-KEY': env.PAYDUNYA_PRIVATE_KEY, 'PAYDUNYA-TOKEN': env.PAYDUNYA_TOKEN },
    body: JSON.stringify({
      invoice: { total_amount: amount, description, customer: { name: customer.name, email: customer.email, phone: customer.phone ?? '' }, channels: ['card', 'orange-money-burkina', 'moov-burkina-faso'] },
      store: { name: 'AgriExpert', website_url: origin },
      custom_data: { payment_id: paymentId, idempotency_key: idempotencyKey },
      actions: { cancel_url: `${origin}/?billing=cancelled`, return_url: `${origin}/?billing=return`, callback_url: `${origin}/api/v1/billing/callback` },
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.response_code !== '00' || !payload.token || !payload.response_text) throw new Error(String(payload.response_text ?? `PayDunya a refusé la facture (${response.status}).`));
  return { token: String(payload.token), checkoutUrl: String(payload.response_text) };
}

export async function verifyPaydunyaHash(data, masterKey) {
  if (!data?.hash || !masterKey) return false;
  const expected = await sha512(masterKey);
  return String(data.hash).toLowerCase() === expected.toLowerCase();
}

export async function parsePaydunyaCallback(request) {
  const text = await request.text();
  const params = new URLSearchParams(text);
  const raw = params.get('data') ?? text;
  try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return null; }
}

function periodEnd(start, interval) {
  const end = new Date(start);
  if (interval === 'year') end.setUTCFullYear(end.getUTCFullYear() + 1);
  else end.setUTCMonth(end.getUTCMonth() + 1);
  return end.toISOString();
}

export async function settlePaydunyaPayment(db, data) {
  const token = String(data?.invoice?.token ?? data?.token ?? '').trim();
  const status = String(data?.status ?? '').toLowerCase();
  if (!token) return { ok: false, reason: 'token_missing' };
  const payment = await db.prepare(`SELECT p.*, bp.billing_interval, bp.name AS plan_name
    FROM billing_payments p JOIN billing_plans bp ON bp.code = p.plan_code WHERE p.provider_reference = ?`).bind(token).first();
  if (!payment) return { ok: false, reason: 'payment_not_found' };
  const receivedAmount = Number(data?.invoice?.total_amount);
  if (status === 'completed' && (!Number.isSafeInteger(receivedAmount) || receivedAmount !== Number(payment.amount_xof))) {
    await db.prepare("UPDATE billing_payments SET status = 'failed', failure_code = 'amount_mismatch', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status IN ('created', 'pending')").bind(payment.id).run();
    return { ok: false, reason: 'amount_mismatch' };
  }
  if (status !== 'completed') {
    const nextStatus = status === 'cancelled' || status === 'failed' ? 'failed' : 'pending';
    await db.prepare('UPDATE billing_payments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status NOT IN (\'succeeded\', \'refunded\')').bind(nextStatus, payment.id).run();
    return { ok: true, status: nextStatus };
  }
  if (payment.status === 'succeeded') return { ok: true, status: 'succeeded', alreadySettled: true };
  const now = new Date();
  const end = payment.billing_interval === 'contract' ? null : periodEnd(now, payment.billing_interval);
  const subscriptionStatus = payment.plan_code === 'institution' ? 'manual_review' : 'active';
  const subscription = await db.prepare(`INSERT INTO subscriptions (user_id, plan_code, status, provider, provider_customer_ref, provider_subscription_ref, current_period_start, current_period_end)
    VALUES (?, ?, ?, 'paydunya', ?, ?, ?, ?) RETURNING id`).bind(payment.user_id, payment.plan_code, subscriptionStatus, String(data.customer?.email ?? ''), token, now.toISOString(), end).first();
  await db.prepare("UPDATE billing_payments SET status = 'succeeded', subscription_id = ?, paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(subscription.id, payment.id).run();
  if (payment.plan_code !== 'institution') await db.prepare('UPDATE users SET plan = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(payment.plan_code, payment.user_id).run();
  const receiptNumber = `AGR-${now.getUTCFullYear()}-${String(payment.id).padStart(8, '0')}`;
  await db.prepare(`INSERT OR IGNORE INTO billing_receipts (payment_id, receipt_number, snapshot_json) VALUES (?, ?, ?)`)
    .bind(payment.id, receiptNumber, JSON.stringify({ receipt_number: receiptNumber, plan: payment.plan_name, amount_xof: payment.amount_xof, currency: 'XOF', provider: 'paydunya', provider_reference: token, issued_at: now.toISOString() })).run();
  await db.prepare(`INSERT INTO billing_audit_events (subject_user_id, event_type, details_json) VALUES (?, 'payment_succeeded', ?)`)
    .bind(payment.user_id, JSON.stringify({ payment_id: payment.id, plan_code: payment.plan_code, receipt_number: receiptNumber, subscription_status: subscriptionStatus })).run();
  return { ok: true, status: 'succeeded', receiptNumber, subscriptionStatus };
}
