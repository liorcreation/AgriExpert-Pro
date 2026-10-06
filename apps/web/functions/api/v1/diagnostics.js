import { currentUser, invalid, json, options } from '../../_shared/auth.js';

const categories = new Set(['agriculture', 'livestock', 'aquaculture', 'apiculture']);
const model = 'gpt-6-astra';
const bucket = 'agriexpert-media';

function encodeBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  return btoa(binary);
}

function parseResult(text) {
  const cleaned = String(text ?? '').trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  try { return JSON.parse(cleaned); } catch { return { summary: cleaned.slice(0, 4000), confidence: 0, observations: [], hypotheses: [], next_steps: [], red_flags: [], expert_needed: true, disclaimer: 'Analyse automatique à confirmer par un professionnel.' }; }
}

function diagnosisPrompt(category, context) {
  return `Tu es un assistant de pré-diagnostic agropastoral pour le Burkina Faso. Analyse l'image avec prudence. Tu ne dois jamais présenter une hypothèse comme un diagnostic certain, ni prescrire une posologie ou un traitement dangereux. Si l'image est insuffisante, dis-le clairement. Catégorie: ${category}. Contexte fourni par le producteur: ${context || 'Aucun contexte complémentaire.'}

Réponds uniquement avec un JSON valide contenant exactement ces clés :
{"summary":"résumé prudent en français","confidence":0,"observations":["faits visibles"],"hypotheses":[{"label":"hypothèse","confidence":0,"rationale":"raison"}],"next_steps":["action de vérification sans danger"],"red_flags":["signe nécessitant une urgence"],"expert_needed":true,"disclaimer":"rappel de validation par agronome ou vétérinaire"}
Les valeurs confidence sont des nombres de 0 à 100. Pour un animal malade, recommande l'isolement et le contact d'un vétérinaire en cas de signes graves, sans donner de dose. Pour une plante, recommande l'observation, l'isolement de la zone si pertinent et la confirmation par un agronome. Ne déduis pas l'espèce ou la maladie si l'image ne permet pas de le faire.`;
}

async function analyzeImage(env, category, context, asset) {
  const imageResponse = await fetch(`${env.SUPABASE_URL}/storage/v1/object/${env.SUPABASE_BUCKET ?? bucket}/${asset.object_key}`, { headers: { apikey: env.SUPABASE_SECRET_KEY, Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}` } });
  if (!imageResponse.ok) throw new Error('image_unavailable');
  const bytes = new Uint8Array(await imageResponse.arrayBuffer());
  if (bytes.byteLength > 8 * 1024 * 1024) throw new Error('image_too_large');
  const imageUrl = `data:${asset.mime_type};base64,${encodeBase64(bytes)}`;
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: env.OPENAI_VISION_MODEL ?? model, store: false, input: [{ role: 'user', content: [{ type: 'input_text', text: diagnosisPrompt(category, context) }, { type: 'input_image', image_url: imageUrl, detail: 'high' }] }], text: { format: { type: 'json_object' } }, max_output_tokens: 1200 }),
  });
  if (!response.ok) throw new Error('vision_provider_error');
  const payload = await response.json();
  return parseResult(payload.output_text ?? payload.output?.flatMap((item) => item.content ?? []).find((item) => item.type === 'output_text')?.text);
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return options(request, env);
  const user = await currentUser(env.DB, request);
  if (!user) return json(request, env, invalid('Connectez-vous pour lancer un diagnostic.'), 401);
  if (request.method === 'GET') {
    const rows = await env.DB.prepare(`SELECT id, media_asset_id, question_id, category, context, status, result_json, provider, model, created_at FROM diagnoses WHERE author_user_id = ? ORDER BY id DESC LIMIT 20`).bind(user.id).all();
    return json(request, env, { data: rows.results.map((item) => ({ ...item, result: parseResult(item.result_json) })) });
  }
  if (request.method !== 'POST') return json(request, env, invalid('Méthode non autorisée.'), 405);
  if (!env.OPENAI_API_KEY || !env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) return json(request, env, invalid('Le diagnostic assisté n’est pas encore configuré.'), 503);
  let input = {};
  try { input = await request.json(); } catch { return json(request, env, invalid('Corps JSON invalide.'), 400); }
  const category = String(input.category ?? '');
  const contextText = String(input.context ?? '').trim().slice(0, 3000);
  const mediaId = Number(input.mediaId);
  if (!categories.has(category) || !Number.isInteger(mediaId) || mediaId < 1) return json(request, env, invalid('Catégorie ou photo invalide.'), 422);
  const asset = await env.DB.prepare(`SELECT id, object_key, mime_type, kind FROM media_assets WHERE id = ? AND owner_user_id = ?`).bind(mediaId, user.id).first();
  if (!asset || asset.kind !== 'photo' || !String(asset.mime_type).startsWith('image/')) return json(request, env, invalid('Photo de diagnostic introuvable.'), 404);
  try {
    const result = await analyzeImage(env, category, contextText, asset);
    const saved = await env.DB.prepare(`INSERT INTO diagnoses (author_user_id, media_asset_id, category, context, status, result_json, model)
      VALUES (?, ?, ?, ?, 'completed', ?, ?) RETURNING id, media_asset_id, category, context, status, result_json, provider, model, created_at`).bind(user.id, mediaId, category, contextText, JSON.stringify(result), env.OPENAI_VISION_MODEL ?? model).first();
    return json(request, env, { data: { ...saved, result } }, 201);
  } catch (error) {
    const message = error instanceof Error && error.message === 'image_too_large' ? 'Photo trop volumineuse pour le diagnostic.' : 'Le diagnostic n’a pas pu être réalisé. Vérifiez la photo ou réessayez.';
    return json(request, env, invalid(message), 502);
  }
}
