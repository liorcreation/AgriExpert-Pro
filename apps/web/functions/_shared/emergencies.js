const EARTH_RADIUS_KM = 6371;

const specialtyByKind = {
  veterinary: ['veterinarian'],
  livestock_epidemic: ['veterinarian'],
  phytosanitary: ['agronomist'],
  pest_attack: ['agronomist'],
  water_quality: ['aquaculture-specialist'],
};

export function distanceKm(fromLat, fromLng, toLat, toLng) {
  const radians = (value) => value * Math.PI / 180;
  const latitudeDelta = radians(toLat - fromLat);
  const longitudeDelta = radians(toLng - fromLng);
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(radians(fromLat)) * Math.cos(radians(toLat)) * Math.sin(longitudeDelta / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function availableExperts(db, latitude, longitude, kind) {
  const rows = await db.prepare(`SELECT u.id, u.name, u.profile, a.latitude, a.longitude, a.radius_km, a.last_seen_at
    FROM users u JOIN expert_availability a ON a.user_id = u.id
    WHERE u.role = 'expert' AND a.is_available = 1 AND a.latitude IS NOT NULL AND a.longitude IS NOT NULL
      AND a.last_seen_at IS NOT NULL AND a.last_seen_at >= datetime('now', '-24 hours')`).all();
  const preferred = specialtyByKind[kind] ?? [];
  return rows.results.map((expert) => ({
    id: Number(expert.id), name: expert.name, specialty: expert.profile ?? 'Expert agropastoral',
    latitude: Number(expert.latitude), longitude: Number(expert.longitude), radiusKm: Number(expert.radius_km ?? 50),
    lastSeenAt: expert.last_seen_at, specialtyMatch: preferred.includes(expert.profile),
    distanceKm: distanceKm(latitude, longitude, Number(expert.latitude), Number(expert.longitude)),
  })).filter((expert) => expert.distanceKm <= expert.radiusKm).sort((left, right) => Number(right.specialtyMatch) - Number(left.specialtyMatch) || left.distanceKm - right.distanceKm);
}

export async function assignNextExpert(db, emergency, excludedExpertIds = []) {
  const existing = await db.prepare(`SELECT ea.id, ea.expert_user_id, ea.status, ea.distance_km, ea.expires_at, u.name AS expert_name, u.profile AS expert_profile
    FROM emergency_assignments ea JOIN users u ON u.id = ea.expert_user_id
    WHERE ea.emergency_id = ? AND ea.status IN ('offered', 'accepted') ORDER BY ea.id DESC LIMIT 1`).bind(emergency.id).first();
  if (existing) return { ...existing, distance_km: Number(existing.distance_km) };
  const excluded = new Set(excludedExpertIds.map(Number));
  const candidates = (await availableExperts(db, Number(emergency.latitude), Number(emergency.longitude), emergency.kind)).filter((expert) => !excluded.has(expert.id));
  const candidate = candidates[0];
  if (!candidate) return null;
  const offeredAt = new Date();
  const expiresAt = new Date(offeredAt.getTime() + 5 * 60 * 1000).toISOString();
  const slaDueAt = new Date(offeredAt.getTime() + (emergency.priority === 'critical' ? 10 : emergency.priority === 'high' ? 20 : 45) * 60 * 1000).toISOString();
  const assignment = await db.prepare(`INSERT INTO emergency_assignments (emergency_id, expert_user_id, status, distance_km, offered_at, expires_at)
    VALUES (?, ?, 'offered', ?, ?, ?) RETURNING id, expert_user_id, status, distance_km, expires_at`)
    .bind(emergency.id, candidate.id, candidate.distanceKm, offeredAt.toISOString(), expiresAt).first();
  await db.prepare(`UPDATE emergencies SET assigned_expert_user_id = ?, assigned_at = ?, sla_due_at = ?, status = 'assigned' WHERE id = ?`)
    .bind(candidate.id, offeredAt.toISOString(), slaDueAt, emergency.id).run();
  await db.prepare(`INSERT INTO emergency_events (emergency_id, actor_user_id, status, note) VALUES (?, NULL, 'assigned', ?)`)
    .bind(emergency.id, `Signalement proposé à ${candidate.name} (${candidate.distanceKm.toFixed(1)} km).`).run();
  return { ...assignment, expert_name: candidate.name, expert_profile: candidate.specialty, distance_km: candidate.distanceKm };
}

export async function expireAndEscalate(db, emergency) {
  const active = await db.prepare(`SELECT id, expert_user_id FROM emergency_assignments WHERE emergency_id = ? AND status = 'offered' AND julianday(expires_at) <= julianday('now') ORDER BY id ASC`).bind(emergency.id).all();
  if (!active.results.length) return assignNextExpert(db, emergency);
  for (const assignment of active.results) {
    await db.prepare(`UPDATE emergency_assignments SET status = 'expired', responded_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(assignment.id).run();
    await db.prepare(`INSERT INTO emergency_events (emergency_id, actor_user_id, status, note) VALUES (?, NULL, 'open', ?)`)
      .bind(emergency.id, 'Le délai de réponse de l’expert proposé est dépassé; escalade automatique.').run();
  }
  await db.prepare(`UPDATE emergencies SET escalation_count = escalation_count + ? WHERE id = ?`).bind(active.results.length, emergency.id).run();
  return assignNextExpert(db, emergency, active.results.map((item) => item.expert_user_id));
}

export async function dispatchEmergencyFallback(db, env, emergency, reason = 'unassigned') {
  const webhook = String(env.EMERGENCY_FALLBACK_WEBHOOK_URL ?? '').trim();
  if (!webhook) return { status: 'not_configured', channel: null };
  const idempotencyKey = `emergency:${emergency.id}:${reason}:${Number(emergency.escalation_count ?? 0)}`;
  const existing = await db.prepare('SELECT id, status FROM emergency_notifications WHERE idempotency_key = ?').bind(idempotencyKey).first();
  if (existing?.status === 'sent') return { status: 'sent', channel: 'webhook' };
  let notification;
  if (existing) {
    notification = existing;
    await db.prepare("UPDATE emergency_notifications SET status = 'queued', attempt_count = attempt_count + 1, error_message = NULL WHERE id = ?").bind(existing.id).run();
  } else {
    notification = await db.prepare(`INSERT INTO emergency_notifications (emergency_id, channel, target, idempotency_key, attempt_count)
      VALUES (?, 'webhook', ?, ?, 1) RETURNING id`).bind(emergency.id, webhook, idempotencyKey).first();
  }
  const payload = { type: 'emergency_fallback', reason, emergency: { id: emergency.id, reference: emergency.reference, kind: emergency.kind, title: emergency.title, priority: emergency.priority, latitude: emergency.latitude, longitude: emergency.longitude, escalation_count: Number(emergency.escalation_count ?? 0) } };
  try {
    const response = await fetch(webhook, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-AgriExpert-Event': 'emergency-fallback', 'X-AgriExpert-Idempotency-Key': idempotencyKey }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error(`Fallback webhook HTTP ${response.status}`);
    await db.prepare("UPDATE emergency_notifications SET status = 'sent', sent_at = CURRENT_TIMESTAMP, error_message = NULL WHERE id = ?").bind(notification.id).run();
    return { status: 'sent', channel: 'webhook' };
  } catch (error) {
    await db.prepare("UPDATE emergency_notifications SET status = 'failed', error_message = ? WHERE id = ?").bind(String(error?.message ?? 'Notification impossible').slice(0, 500), notification.id).run();
    return { status: 'failed', channel: 'webhook' };
  }
}

export async function reconcileEmergencies(db, env) {
  const rows = await db.prepare(`SELECT id, reference, kind, title, priority, latitude, longitude, status, escalation_count
    FROM emergencies WHERE status IN ('open', 'assigned') ORDER BY id ASC LIMIT 100`).all();
  let processed = 0;
  let escalated = 0;
  let notified = 0;
  for (const emergency of rows.results) {
    const before = Number(emergency.escalation_count ?? 0);
    const assignment = await expireAndEscalate(db, emergency);
    const current = await db.prepare('SELECT escalation_count, status FROM emergencies WHERE id = ?').bind(emergency.id).first();
    const after = Number(current?.escalation_count ?? before);
    if (after > before) escalated += after - before;
    if (!assignment && current?.status === 'open') {
      const notification = await dispatchEmergencyFallback(db, env, { ...emergency, escalation_count: after }, after > before ? 'escalated_unassigned' : 'unassigned');
      if (notification.status === 'sent') notified += 1;
    }
    processed += 1;
  }
  return { processed, escalated, notified };
}

export function publicExpert(expert) {
  return { id: Number(expert.id ?? expert.expert_user_id), name: expert.name ?? expert.expert_name, specialty: expert.specialty ?? expert.expert_profile ?? 'Expert agropastoral', latitude: Number(expert.latitude), longitude: Number(expert.longitude), distance_km: Number(expert.distance_km), status: expert.status ?? 'available', last_seen_at: expert.last_seen_at };
}
