const { sendSuccess, sendError } = require('../utils/response');

const GROQ_TRANSCRIPTION_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

// Whisper accepts a short "prompt" that biases its decoding toward specific vocabulary —
// without this it has no idea "gym"/"pool"/"complaint" etc. are likely words, and tends
// to mishear them as something more common. This is the single biggest accuracy lever
// for a short, domain-specific command like ours.
const DOMAIN_PROMPT = 'Panchayat community app commands: book the gym, swimming pool, clubhouse, '
  + 'tennis court, playground, party hall, conference room. Raise a personal or community '
  + 'maintenance complaint: plumbing, electrical, cleaning, security, elevator, parking, noise. '
  + 'Show my payments, visitors, bookings, notices, vehicles, dues, profile, dashboard, forum.';

// GROQ_API_KEY may hold a single key or a comma-separated list (handy since Groq's
// free tier rate-limits per key) — we try each in turn and fall back on the next
// when one is invalid or rate-limited.
const getApiKeys = () => (process.env.GROQ_API_KEY || '')
  .split(',')
  .map((key) => key.trim())
  .filter(Boolean);

// Transcribes a short voice clip via Groq's Whisper endpoint. The API key(s) stay
// server-side so they're never exposed to the browser.
const transcribe = async (req, res) => {
  if (!req.file) return sendError(res, 'Audio file is required', null, 400);

  const apiKeys = getApiKeys();
  if (!apiKeys.length) return sendError(res, 'Voice transcription is not configured. Set GROQ_API_KEY on the server.', null, 503);

  let lastStatus = 502;
  let lastDetail = '';

  for (const apiKey of apiKeys) {
    const form = new FormData();
    form.append('file', new Blob([req.file.buffer], { type: req.file.mimetype || 'audio/webm' }), req.file.originalname || 'clip.webm');
    // whisper-large-v3 (not the -turbo distilled variant) trades a little latency for
    // meaningfully better accuracy, which matters more than speed for a short command.
    form.append('model', process.env.GROQ_WHISPER_MODEL || 'whisper-large-v3');
    form.append('response_format', 'json');
    // Omit `language` for auto-detection (Telugu, Hindi, English, ...). Only pin it
    // when the client explicitly asks for a specific one.
    const requestedLanguage = (req.body.language || '').trim().toLowerCase();
    if (requestedLanguage && requestedLanguage !== 'auto') form.append('language', requestedLanguage);
    form.append('temperature', '0');
    form.append('prompt', DOMAIN_PROMPT);

    const groqResponse = await fetch(GROQ_TRANSCRIPTION_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (groqResponse.ok) {
      const data = await groqResponse.json();
      return sendSuccess(res, 'Transcribed', { text: (data.text || '').trim() });
    }

    lastDetail = await groqResponse.text().catch(() => '');
    lastStatus = groqResponse.status;
    // 401 (bad key) or 429 (rate-limited) — worth trying the next key. Anything
    // else (e.g. a malformed request) will fail identically for every key.
    if (![401, 403, 429].includes(groqResponse.status)) break;
  }

  return sendError(res, 'Transcription failed', lastDetail, lastStatus === 401 ? 502 : lastStatus);
};

module.exports = { transcribe };
