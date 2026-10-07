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

export function publicExpert(expert) {
  return { id: Number(expert.id ?? expert.expert_user_id), name: expert.name ?? expert.expert_name, specialty: expert.specialty ?? expert.expert_profile ?? 'Expert agropastoral', latitude: Number(expert.latitude), longitude: Number(expert.longitude), distance_km: Number(expert.distance_km), status: expert.status ?? 'available', last_seen_at: expert.last_seen_at };
}
