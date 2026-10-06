const SESSION_COOKIE = 'agriexpert_session';
const SESSION_DAYS = 30;
const encoder = new TextEncoder();

export function apiHeaders(request, env) {
  const headers = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json' };
  const origin = request.headers.get('Origin');
  if (env.ALLOWED_ORIGIN && origin === env.ALLOWED_ORIGIN) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
    headers.Vary = 'Origin';
  }
  return headers;
}

export function json(request, env, body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...apiHeaders(request, env), ...extraHeaders } });
}

export function options(request, env) {
  return new Response(null, {
    status: 204,
    headers: {
      ...apiHeaders(request, env),
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    },
  });
}

export async function body(request) {
  try {
    const value = await request.json();
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}

function bytesToHex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
  return new Uint8Array(hex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));
}

function randomHex(size) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

async function digestHex(value) {
  return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))));
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const decoded = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

function decodeJwtPart(value) {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(value)));
}

let googleKeysCache;

export async function verifyGoogleCredential(credential, clientId) {
  const parts = String(credential ?? '').split('.');
  if (parts.length !== 3 || !clientId) throw new Error('Google credential invalide.');
  const header = decodeJwtPart(parts[0]);
  const claims = decodeJwtPart(parts[1]);
  if (header.alg !== 'RS256' || !header.kid || !['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss)) throw new Error('Google credential invalide.');
  if (claims.aud !== clientId || !claims.sub || !claims.email || claims.email_verified !== true || Number(claims.exp) <= Math.floor(Date.now() / 1000)) throw new Error('Compte Google non vérifié ou audience invalide.');
  if (!googleKeysCache || googleKeysCache.expiresAt < Date.now()) {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/certs');
    if (!response.ok) throw new Error('Vérification Google momentanément indisponible.');
    const keys = await response.json();
    const maxAge = Number(response.headers.get('cache-control')?.match(/max-age=(\d+)/)?.[1] ?? 3600);
    googleKeysCache = { keys: keys.keys, expiresAt: Date.now() + maxAge * 1000 };
  }
  const jwk = googleKeysCache.keys.find((key) => key.kid === header.kid && key.kty === 'RSA');
  if (!jwk) throw new Error('Clé de signature Google inconnue.');
  const publicKey = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const validSignature = await crypto.subtle.verify({ name: 'RSASSA-PKCS1-v1_5' }, publicKey, decodeBase64Url(parts[2]), encoder.encode(`${parts[0]}.${parts[1]}`));
  if (!validSignature) throw new Error('Signature Google invalide.');
  return claims;
}

export async function hashPassword(password) {
  // Cloudflare Workers caps PBKDF2 at 100,000 iterations.
  const iterations = 100000;
  const salt = randomHex(16);
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: hexToBytes(salt), iterations, hash: 'SHA-256' }, key, 256);
  return `pbkdf2$${iterations}$${salt}$${bytesToHex(new Uint8Array(derived))}`;
}

export async function verifyPassword(password, encoded) {
  const [algorithm, iterationText, salt, expected] = String(encoded).split('$');
  if (algorithm !== 'pbkdf2' || !iterationText || !salt || !expected) return false;
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: hexToBytes(salt), iterations: Number(iterationText), hash: 'SHA-256' }, key, 256);
  const actual = bytesToHex(new Uint8Array(derived));
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) difference |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  return difference === 0;
}

function cookieValue(request) {
  const cookie = request.headers.get('Cookie') ?? '';
  const match = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  return match?.[1];
}

export function sessionCookie(request, token, maxAge = SESSION_DAYS * 86400) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export async function createSession(db, userId, request) {
  const token = randomHex(32);
  const tokenHash = await digestHex(token);
  await db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, datetime(\'now\', ?))').bind(tokenHash, userId, `+${SESSION_DAYS} days`).run();
  return sessionCookie(request, token);
}

export async function currentUser(db, request) {
  const token = cookieValue(request);
  if (!token) return null;
  const tokenHash = await digestHex(token);
  const result = await db.prepare(`SELECT u.id, u.name, u.email, u.phone, u.role, u.profile, u.plan
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > datetime('now')`).bind(tokenHash).first();
  return result ?? null;
}

export async function deleteCurrentSession(db, request) {
  const token = cookieValue(request);
  if (token) await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await digestHex(token)).run();
}

export function userPayload(user) {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone ?? null, role: user.role, profile: user.profile ?? null, plan: user.plan };
}

export async function createPasswordlessSession(db, userId, request) {
  return createSession(db, userId, request);
}

export function invalid(message) {
  return { message };
}
