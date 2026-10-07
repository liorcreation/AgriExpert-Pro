import { currentUser, invalid, json, options } from '../../_shared/auth.js';

const PERIODS = new Map([['7d', 7], ['30d', 30], ['90d', 90]]);
const REGION_CODE = /^[a-z0-9][a-z0-9-]{1,48}$/;
const CATEGORY_LABELS = {
  agriculture: 'Agriculture',
  livestock: 'Élevage / vétérinaire',
  aquaculture: 'Pisciculture',
  apiculture: 'Apiculture',
};
const ALERT_LABELS = {
  veterinary: 'Alerte vétérinaire',
  livestock_epidemic: 'Suspicion d’épidémie animale',
  phytosanitary: 'Alerte phytosanitaire',
  pest_attack: 'Attaque de ravageurs',
  water_quality: 'Qualité de l’eau',
};

function isPlatformAdmin(user, env) {
  const allowlist = String(env.BILLING_ADMIN_EMAILS ?? '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean);
  return allowlist.includes(String(user.email ?? '').toLowerCase());
}

function numeric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function numberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function htmlResponse(body) {
  return new Response(body, { status: 200, headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/html; charset=utf-8' } });
}

function scopeFilter(alias, column, selectedRegion, allowedRegions, unrestricted) {
  if (unrestricted || selectedRegion === 'national') {
    if (unrestricted || allowedRegions.includes('national')) return { sql: '1 = 1', values: [] };
    const placeholders = allowedRegions.map(() => '?').join(', ');
    return { sql: `EXISTS (SELECT 1 FROM user_territories scope_territory WHERE scope_territory.user_id = ${alias}.${column} AND scope_territory.region_code IN (${placeholders}))`, values: allowedRegions };
  }
  return { sql: `EXISTS (SELECT 1 FROM user_territories scope_territory WHERE scope_territory.user_id = ${alias}.${column} AND scope_territory.region_code = ?)`, values: [selectedRegion] };
}

function formatDay(value) {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' }).format(date).replace('.', '');
}

function relativeTime(value) {
  const timestamp = new Date(String(value).replace(' ', 'T') + (String(value).endsWith('Z') ? '' : 'Z')).getTime();
  if (!Number.isFinite(timestamp)) return 'Date indisponible';
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (minutes < 60) return `Il y a ${minutes || 1} min`;
  const hours = Math.round(minutes / 60);
  return `Il y a ${hours} h`;
}

async function getInstitutionScope(db, user, env) {
  const unrestricted = isPlatformAdmin(user, env);
  if (!unrestricted && user.role !== 'institution') return null;
  const memberships = unrestricted
    ? { results: [] }
    : await db.prepare(`SELECT institution_key, institution_name, institution_type, access_role, region_code
      FROM institution_memberships WHERE user_id = ? AND active = 1 ORDER BY id ASC`).bind(user.id).all();
  if (!unrestricted && !memberships.results.length) return null;
  const territoryRows = await db.prepare('SELECT DISTINCT region_code, region_name FROM user_territories ORDER BY region_name ASC').all();
  const membershipRegions = memberships.results.map((item) => item.region_code);
  const regions = unrestricted
    ? territoryRows.results
    : territoryRows.results.filter((item) => membershipRegions.includes('national') || membershipRegions.includes(item.region_code));
  const allowedRegions = unrestricted || membershipRegions.includes('national') ? ['national'] : [...new Set(membershipRegions)];
  return {
    unrestricted,
    institutionKey: unrestricted ? `platform:${String(user.email).toLowerCase()}` : memberships.results[0].institution_key,
    institutionName: unrestricted ? 'Plateforme AgriExpert · Administration' : memberships.results[0].institution_name,
    institutionType: unrestricted ? 'platform' : memberships.results[0].institution_type,
    accessRole: unrestricted ? 'admin' : memberships.results[0].access_role,
    allowedRegions,
    regions: [{ region_code: 'national', region_name: 'National' }, ...regions.filter((item) => item.region_code !== 'national')],
  };
}

async function audit(db, scope, user, action, filters) {
  await db.prepare(`INSERT INTO institution_audit_logs (actor_user_id, institution_key, action, filters_json)
    VALUES (?, ?, ?, ?)`).bind(user.id, scope.institutionKey, action, JSON.stringify(filters)).run();
}

async function loadDashboard(db, scope, period, selectedRegion) {
  const days = PERIODS.get(period);
  const since = `-${days} days`;
  const questionScope = scopeFilter('q', 'author_user_id', selectedRegion, scope.allowedRegions, scope.unrestricted);
  const emergencyScope = scopeFilter('e', 'author_user_id', selectedRegion, scope.allowedRegions, scope.unrestricted);
  const expertScope = scopeFilter('u', 'id', selectedRegion, scope.allowedRegions, scope.unrestricted);
  const territoryScope = selectedRegion !== 'national'
    ? { sql: 'ut.region_code = ?', values: [selectedRegion] }
    : scope.unrestricted || scope.allowedRegions.includes('national')
      ? { sql: '1 = 1', values: [] }
      : { sql: `ut.region_code IN (${scope.allowedRegions.map(() => '?').join(', ')})`, values: scope.allowedRegions };
  const firstAnswers = `(SELECT question_id, MIN(created_at) AS first_answer_at FROM question_answers GROUP BY question_id)`;

  const [questionStats, responseStats, emergencyStats, expertStats, trendRows, categories, alertRows, heatRows, sponsorRows, coverageRows] = await Promise.all([
    db.prepare(`SELECT COUNT(*) AS total,
      SUM(CASE WHEN q.status IN ('answered', 'closed') THEN 1 ELSE 0 END) AS resolved
      FROM questions q WHERE q.created_at >= datetime('now', ?) AND ${questionScope.sql}`).bind(since, ...questionScope.values).first(),
    db.prepare(`SELECT AVG((julianday(first_answer.first_answer_at) - julianday(q.created_at)) * 1440) AS average_minutes
      FROM questions q JOIN ${firstAnswers} first_answer ON first_answer.question_id = q.id
      WHERE q.created_at >= datetime('now', ?) AND ${questionScope.sql}`).bind(since, ...questionScope.values).first(),
    db.prepare(`SELECT COUNT(*) AS active,
      SUM(CASE WHEN e.priority = 'critical' THEN 1 ELSE 0 END) AS critical
      FROM emergencies e WHERE e.created_at >= datetime('now', ?) AND e.status IN ('open', 'assigned') AND ${emergencyScope.sql}`).bind(since, ...emergencyScope.values).first(),
    db.prepare(`SELECT COUNT(*) AS total,
      SUM(CASE WHEN ea.is_available = 1 AND (ea.last_seen_at IS NULL OR ea.last_seen_at >= datetime('now', '-24 hours')) THEN 1 ELSE 0 END) AS available
      FROM users u LEFT JOIN expert_availability ea ON ea.user_id = u.id
      WHERE u.role = 'expert' AND ${expertScope.sql}`).bind(...expertScope.values).first(),
    db.prepare(`SELECT strftime('%Y-%m-%d', q.created_at) AS day, COUNT(*) AS demandes,
      SUM(CASE WHEN q.status IN ('answered', 'closed') THEN 1 ELSE 0 END) AS resolues,
      AVG((julianday(first_answer.first_answer_at) - julianday(q.created_at)) * 1440) AS delai
      FROM questions q LEFT JOIN ${firstAnswers} first_answer ON first_answer.question_id = q.id
      WHERE q.created_at >= datetime('now', ?) AND ${questionScope.sql}
      GROUP BY day ORDER BY day ASC`).bind(since, ...questionScope.values).all(),
    db.prepare(`SELECT q.category AS category, COUNT(*) AS value FROM questions q
      WHERE q.created_at >= datetime('now', ?) AND ${questionScope.sql} GROUP BY q.category ORDER BY value DESC`).bind(since, ...questionScope.values).all(),
    db.prepare(`SELECT e.kind, e.priority, COALESCE(ut.region_name, 'Territoire non renseigné') AS region,
      COUNT(*) AS count, MAX(e.created_at) AS latest_at
      FROM emergencies e LEFT JOIN user_territories ut ON ut.user_id = e.author_user_id
      WHERE e.created_at >= datetime('now', ?) AND e.status IN ('open', 'assigned') AND ${emergencyScope.sql}
      GROUP BY e.kind, e.priority, region ORDER BY CASE e.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 ELSE 2 END, count DESC LIMIT 12`).bind(since, ...emergencyScope.values).all(),
    db.prepare(`SELECT ROUND(e.latitude, 2) AS latitude, ROUND(e.longitude, 2) AS longitude, e.priority, e.kind, COUNT(*) AS count
      FROM emergencies e WHERE e.created_at >= datetime('now', ?) AND e.status IN ('open', 'assigned') AND ${emergencyScope.sql}
      GROUP BY ROUND(e.latitude, 2), ROUND(e.longitude, 2), e.priority, e.kind`).bind(since, ...emergencyScope.values).all(),
    db.prepare(`SELECT ut.region_code, ut.region_name, COUNT(DISTINCT q.author_user_id) AS producer_count, COUNT(q.id) AS request_count
      FROM user_territories ut JOIN users producer ON producer.id = ut.user_id AND producer.role = 'producer'
      LEFT JOIN questions q ON q.author_user_id = producer.id AND q.created_at >= datetime('now', ?)
      WHERE ${territoryScope.sql}
      GROUP BY ut.region_code, ut.region_name ORDER BY producer_count DESC`).bind(since, ...territoryScope.values).all(),
    db.prepare(`SELECT COUNT(DISTINCT ut.region_code) AS known_regions,
      COUNT(DISTINCT CASE WHEN ea.is_available = 1 THEN ut.region_code END) AS covered_regions
      FROM user_territories ut JOIN users u ON u.id = ut.user_id AND u.role = 'expert'
      LEFT JOIN expert_availability ea ON ea.user_id = u.id
      WHERE ${territoryScope.sql}`).bind(...territoryScope.values).first(),
  ]);

  const totalRequests = numeric(questionStats?.total);
  const resolvedRequests = numeric(questionStats?.resolved);
  const resolutionRate = totalRequests ? Math.round((resolvedRequests / totalRequests) * 1000) / 10 : 0;
  const availableExperts = numeric(expertStats?.available);
  const totalExperts = numeric(expertStats?.total);
  const knownRegions = numeric(coverageRows?.known_regions);
  const coveredRegions = numeric(coverageRows?.covered_regions);
  const trends = trendRows.results.map((row) => ({ day: formatDay(row.day), demandes: numeric(row.demandes), resolues: numeric(row.resolues), delai: Math.round(numeric(row.delai)) }));
  const activeAlerts = numeric(emergencyStats?.active);
  const alerts = alertRows.results.map((row) => ({
    level: row.priority === 'critical' ? 'critical' : row.priority === 'high' ? 'high' : 'medium',
    title: ALERT_LABELS[row.kind] ?? 'Signalement prioritaire',
    region: row.region,
    count: `${numeric(row.count)} signalement${numeric(row.count) > 1 ? 's' : ''}`,
    time: relativeTime(row.latest_at),
  }));
  const sponsors = sponsorRows.results.map((row) => {
    const producers = numeric(row.producer_count);
    const requestCount = numeric(row.request_count);
    const value = totalRequests ? Math.round((requestCount / totalRequests) * 100) : 0;
    return producers < 5
      ? { label: row.region_name, status: 'suppressed', value: null, count: null, reason: 'Seuil de confidentialité non atteint' }
      : { label: row.region_name, status: 'available', value: Math.min(100, value), count: producers, requestCount };
  });
  const coverage = {
    territoriesCovered: knownRegions ? Math.round((coveredRegions / knownRegions) * 100) : 0,
    responseOperational: resolutionRate,
    expertsMobilisable: totalExperts ? Math.round((availableExperts / totalExperts) * 100) : 0,
    laboratories: null,
  };
  return {
    scope: { institutionName: scope.institutionName, institutionType: scope.institutionType, accessRole: scope.accessRole },
    filters: { period, region: selectedRegion, regions: scope.regions },
    kpis: {
      resolutionRate,
      averageResponseMinutes: Math.round(numeric(responseStats?.average_minutes)),
      activeAlerts,
      criticalAlerts: numeric(emergencyStats?.critical),
      availableExperts,
      totalExperts,
      totalRequests,
      resolvedRequests,
    },
    trend: trends,
    categories: categories.results.map((row) => ({ name: CATEGORY_LABELS[row.category] ?? row.category, value: numeric(row.value) })),
    alerts,
    heatmap: heatRows.results.map((row, index) => ({ id: `alert-${index}`, latitude: numeric(row.latitude), longitude: numeric(row.longitude), intensity: row.priority === 'critical' || row.priority === 'high' ? 'high' : row.priority === 'medium' ? 'medium' : 'low', count: numeric(row.count), name: ALERT_LABELS[row.kind] ?? 'Signalement', region: selectedRegion === 'national' ? 'Territoire agrégé' : selectedRegion })),
    coverage,
    sponsors,
    lastUpdated: new Date().toISOString(),
    source: 'D1 · agrégations institutionnelles',
  };
}

function dashboardCsv(data) {
  const rows = [['AgriExpert · Rapport institutionnel'], ['Périmètre', data.scope.institutionName], ['Période', data.filters.period], ['Région', data.filters.region], ['Dernière mise à jour', data.lastUpdated], [], ['Indicateur', 'Valeur'], ['Taux de résolution', `${data.kpis.resolutionRate}%`], ['Temps moyen de réponse', `${data.kpis.averageResponseMinutes} min`], ['Alertes actives', data.kpis.activeAlerts], ['Experts disponibles', data.kpis.availableExperts], [], ['Jour', 'Demandes', 'Résolues', 'Délai moyen (min)'], ...data.trend.map((row) => [row.day, row.demandes, row.resolues, row.delai]), [], ['Alerte', 'Région', 'Volume', 'Niveau'], ...data.alerts.map((row) => [row.title, row.region, row.count, row.level])];
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}

function reportHtml(data) {
  const alertRows = data.alerts.map((item) => `<tr><td>${escapeHtml(item.title)}</td><td>${escapeHtml(item.region)}</td><td>${escapeHtml(item.count)}</td><td>${escapeHtml(item.level)}</td></tr>`).join('');
  const trendRows = data.trend.map((item) => `<tr><td>${escapeHtml(item.day)}</td><td>${item.demandes}</td><td>${item.resolues}</td><td>${item.delai} min</td></tr>`).join('');
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Rapport AgriExpert</title><style>body{font-family:Arial,sans-serif;color:#102d25;margin:40px;line-height:1.45}header{border-bottom:4px solid #10b981;padding-bottom:20px;margin-bottom:24px}h1{font-size:28px;margin:0 0 8px}h2{font-size:18px;margin-top:28px;color:#0f3d2e}.meta{color:#61756e}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.card{border:1px solid #d8e3dc;border-radius:12px;padding:14px;background:#f7fbf8}.value{font-size:24px;font-weight:700}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{text-align:left;border-bottom:1px solid #d8e3dc;padding:9px;font-size:13px}th{background:#eff7f1}.print{float:right;background:#0f3d2e;color:white;border:0;border-radius:8px;padding:10px 14px;font-weight:700}@media print{.print{display:none}body{margin:18px}}</style></head><body><button class="print" onclick="window.print()">Imprimer / enregistrer en PDF</button><header><div style="letter-spacing:.12em;text-transform:uppercase;color:#0b956c;font-weight:700;font-size:12px">AgriExpert · Rapport institutionnel</div><h1>${escapeHtml(data.scope.institutionName)}</h1><div class="meta">Périmètre : ${escapeHtml(data.filters.region)} · Période : ${escapeHtml(data.filters.period)} · Actualisé le ${escapeHtml(new Date(data.lastUpdated).toLocaleString('fr-FR'))}</div></header><div class="grid"><div class="card"><div>Taux de résolution</div><div class="value">${data.kpis.resolutionRate}%</div></div><div class="card"><div>Réponse moyenne</div><div class="value">${data.kpis.averageResponseMinutes} min</div></div><div class="card"><div>Alertes actives</div><div class="value">${data.kpis.activeAlerts}</div></div><div class="card"><div>Experts disponibles</div><div class="value">${data.kpis.availableExperts}</div></div></div><h2>Activité du réseau</h2><table><thead><tr><th>Jour</th><th>Demandes</th><th>Résolues</th><th>Délai</th></tr></thead><tbody>${trendRows || '<tr><td colspan="4">Aucune donnée sur la période sélectionnée.</td></tr>'}</tbody></table><h2>Alertes à traiter</h2><table><thead><tr><th>Alerte</th><th>Territoire</th><th>Volume</th><th>Niveau</th></tr></thead><tbody>${alertRows || '<tr><td colspan="4">Aucune alerte active.</td></tr>'}</tbody></table><p class="meta" style="margin-top:30px">Ce rapport contient uniquement des agrégats. Les groupes de moins de cinq producteurs sont masqués.</p></body></html>`;
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return options(request, env);
  if (request.method !== 'GET') return json(request, env, invalid('Méthode non autorisée.'), 405);
  const user = await currentUser(env.DB, request);
  if (!user) return json(request, env, invalid('Connectez-vous pour accéder au pilotage institutionnel.'), 401);
  const scope = await getInstitutionScope(env.DB, user, env);
  if (!scope) return json(request, env, invalid(user.role === 'institution' ? 'Votre accès institutionnel n’est pas encore habilité.' : 'Accès institutionnel requis.'), 403);
  const url = new URL(request.url);
  const period = PERIODS.has(url.searchParams.get('period')) ? url.searchParams.get('period') : '7d';
  const requestedRegion = url.searchParams.get('region') || 'national';
  if (requestedRegion !== 'national' && !REGION_CODE.test(requestedRegion)) return json(request, env, invalid('Région invalide.'), 422);
  const availableRegionCodes = scope.regions.map((item) => item.region_code);
  if (!availableRegionCodes.includes(requestedRegion)) return json(request, env, invalid('Cette région ne fait pas partie de votre périmètre institutionnel.'), 403);
  const exportType = url.searchParams.get('export');
  const filters = { period, region: requestedRegion };
  try {
    const data = await loadDashboard(env.DB, scope, period, requestedRegion);
    if (exportType === 'csv') {
      await audit(env.DB, scope, user, 'csv_export', filters);
      return new Response(dashboardCsv(data), { headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="agriexpert-rapport-${period}.csv"` } });
    }
    if (exportType === 'report') {
      await audit(env.DB, scope, user, 'report_view', filters);
      return htmlResponse(reportHtml(data));
    }
    await audit(env.DB, scope, user, 'dashboard_view', filters);
    return json(request, env, { data });
  } catch (error) {
    console.error('institutional dashboard unavailable', error);
    return json(request, env, invalid('Les données institutionnelles sont momentanément indisponibles.'), 503);
  }
}
