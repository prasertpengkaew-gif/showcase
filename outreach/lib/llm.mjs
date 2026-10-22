// Asks the AI server on the local network (an OpenAI-compatible chat API) to read a company's website text.
// The model is only a helper: everything it returns is checked, and a quote it claims to have copied from the
// site must really be in the site's text, otherwise it is thrown away.
import { SERVICE_TAGS } from './extract.mjs';

const TAGS = Object.keys(SERVICE_TAGS);
const squash = (s) => s.replace(/\s+/g, ' ').trim();

const PROMPT = (text) => `Below is text copied from a company's website (Thai or English). Answer in JSON only, using ONLY this text. Never invent facts. If the text does not say it, leave it out.

"""
${text}
"""

Return a JSON object with these keys:
- "is_event_company": "yes" if the company organises or produces events for clients (exhibitions, product launches, activations, conferences, concerts, festivals, weddings, corporate events); "maybe" if it does related work (marketing agency, booth builder, stage/sound/LED rental, MC or talent booking); "no" if it is something else (shop, marketplace, directory, news, job board, unrelated business).
- "event_types": an array using only these keys: ${TAGS.join(', ')}. Include only types the text says the company does.
- "summary_th": ONE Thai sentence, at most 160 characters, saying what the company does, based on the text.
- "evidence": ONE exact quote copied character for character from the text, 20 to 140 characters long, that shows what kind of events the company does. Use "" if there is no such sentence.
- "uses_tech": true if the text mentions AR, VR, interactive installations, LED screens, projection mapping or similar technology, otherwise false.`;

/** The first {...} in a model reply (models sometimes wrap JSON in text or code fences). */
export function parseJsonReply(reply) {
  const start = reply.indexOf('{');
  const end = reply.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(reply.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** Keeps only what we can trust from the model's answer. Returns null when the answer is unusable. */
export function validateAnalysis(raw, text) {
  if (!raw || !['yes', 'maybe', 'no'].includes(raw.is_event_company)) return null;
  const evidence = typeof raw.evidence === 'string' ? raw.evidence.trim() : '';
  const grounded = evidence.length >= 20 && evidence.length <= 160 && squash(text).toLowerCase().includes(squash(evidence).toLowerCase());
  return {
    isEventCompany: raw.is_event_company,
    eventTypes: [...new Set((Array.isArray(raw.event_types) ? raw.event_types : []).filter((t) => TAGS.includes(t)))],
    summaryTh: typeof raw.summary_th === 'string' ? raw.summary_th.trim().slice(0, 200) : '',
    evidence: grounded ? squash(evidence) : '',
    usesTech: raw.uses_tech === true,
  };
}

/**
 * Reads one company's text with the model. `fetchImpl` is only there so tests can run without a server.
 * Returns the checked analysis, or { error } when the server is down or the answer cannot be used.
 */
export async function analyzeCompany(text, { baseUrl, model, timeoutMs = 120000, maxChars = 5000, fetchImpl = fetch } = {}) {
  const clip = text.slice(0, maxChars);
  try {
    const res = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: 600,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You extract facts from website text and reply with a single JSON object. You never invent facts.' },
          { role: 'user', content: PROMPT(clip) },
        ],
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return { error: `AI server answered HTTP ${res.status}` };
    const reply = (await res.json()).choices?.[0]?.message?.content ?? '';
    const analysis = validateAnalysis(parseJsonReply(reply), clip);
    return analysis ?? { error: 'AI answer could not be used' };
  } catch (e) {
    return { error: e.name === 'TimeoutError' ? 'AI server timed out' : `AI server unreachable (${e.message})` };
  }
}
