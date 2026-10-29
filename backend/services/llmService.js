const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const fetch = globalThis.fetch;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Per-key / per-provider cooldown trackers (circuit breakers)
const keyCooldowns = new Map();
let groqCooldownUntil = 0;
let openaiCooldownUntil = 0;

function isKeyCoolingDown(key) {
  if (!key) return true;
  const until = keyCooldowns.get(key);
  return until && Date.now() < until;
}

function setKeyCooldown(key, ms = 5 * 60 * 1000) {
  if (key) {
    keyCooldowns.set(key, Date.now() + ms);
  }
}

/**
 * Returns configured Gemini keys in order of priority:
 * 1. GEMINI_API_KEY1 (Primary Gemini key)
 * 2. GEMINI_API_KEY2 (Secondary Gemini key)
 * 3. GEMINI_API_KEY  (Fallback/Alternative if present)
 */
function getGeminiKeys() {
  const list = [];
  const candidates = [
    { id: 'GEMINI_API_KEY1', envVal: process.env.GEMINI_API_KEY1 },
    { id: 'GEMINI_API_KEY2', envVal: process.env.GEMINI_API_KEY2 },
    { id: 'GEMINI_API_KEY',  envVal: process.env.GEMINI_API_KEY },
  ];

  for (const c of candidates) {
    if (c.envVal && c.envVal.trim()) {
      const trimmed = c.envVal.trim();
      if (!list.some(item => item.key === trimmed)) {
        list.push({ id: c.id, key: trimmed });
      }
    }
  }
  return list;
}

async function fetchGemini(apiKey, keyLabel, prompt, systemPrompt, options = {}) {
  if (!apiKey) throw new Error(`Missing API key for ${keyLabel}`);

  const models = ['gemini-2.5-flash', 'gemini-flash-latest'];
  let lastErr = null;

  for (const model of models) {
    try {
      const bodyPayload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options.temperature !== undefined ? options.temperature : 0.3,
          maxOutputTokens: options.maxTokens || 8192,
        }
      };

      if (systemPrompt) {
        bodyPayload.system_instruction = { parts: [{ text: systemPrompt }] };
      }

      if (options.responseFormat === 'json_object') {
        bodyPayload.generationConfig.responseMimeType = 'application/json';
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        const isFatal = response.status === 429 ||
          response.status === 401 ||
          response.status === 403 ||
          errorText.includes('RESOURCE_EXHAUSTED') ||
          errorText.includes('quota') ||
          errorText.includes('RATE_LIMIT_EXCEEDED') ||
          errorText.includes('API_KEY_INVALID');
        const err = new Error(`Gemini [${keyLabel}] ${model} HTTP error ${response.status}: ${errorText}`);
        err.isFatalNoRetry = isFatal;
        err.isQuotaExhausted = isFatal;
        throw err;
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error(`Gemini [${keyLabel}] ${model} returned empty content`);

      return {
        content: text,
        provider: `Gemini (${keyLabel}/${model})`,
        tokensUsed: data.usageMetadata?.totalTokenCount || 0
      };
    } catch (err) {
      lastErr = err;
      console.warn(`[LLM] Gemini [${keyLabel}] ${model} failed: ${err.message}.`);
      if (err.isQuotaExhausted) {
        // Quota is account/key wide; mark this key as cooling down and break out immediately
        setKeyCooldown(apiKey, 5 * 60 * 1000);
        break;
      }
    }
  }

  if (lastErr) throw lastErr;
  throw new Error(`All Gemini models failed for ${keyLabel}`);
}

async function fetchGroq(prompt, systemPrompt, options = {}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('Missing GROQ_API_KEY');

  const models = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];
  let lastErr = null;

  for (const model of models) {
    try {
      const messages = [];
      let sys = systemPrompt;
      if (options.responseFormat === 'json_object') {
        const fullText = `${systemPrompt || ''} ${prompt}`.toLowerCase();
        if (!fullText.includes('json')) {
          sys = sys ? `${sys}\nRespond with a valid JSON object.` : 'Respond with a valid JSON object.';
        }
      }
      if (sys) messages.push({ role: 'system', content: sys });
      messages.push({ role: 'user', content: prompt });

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options.temperature !== undefined ? options.temperature : 0.3,
          max_tokens: options.maxTokens || 4096,
          response_format: options.responseFormat ? { type: options.responseFormat } : undefined
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        const isQuotaExhausted = response.status === 429 ||
          errorText.includes('rate_limit_exceeded') ||
          errorText.includes('insufficient_quota');
        const err = new Error(`Groq ${model} HTTP error ${response.status}: ${errorText}`);
        err.isFatalNoRetry = isQuotaExhausted;
        err.isQuotaExhausted = isQuotaExhausted;
        throw err;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error(`Groq ${model} returned empty response`);

      return {
        content,
        provider: `Groq (${model})`,
        tokensUsed: data.usage?.total_tokens || 0
      };
    } catch (err) {
      lastErr = err;
      console.warn(`[LLM] Groq ${model} failed: ${err.message}.`);
      if (err.isQuotaExhausted) {
        groqCooldownUntil = Date.now() + 5 * 60 * 1000;
        break;
      }
    }
  }

  if (lastErr) throw lastErr;
  throw new Error('All Groq models failed');
}

async function fetchOpenAI(prompt, systemPrompt, options = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');

  const messages = [];
  let sys = systemPrompt;
  if (options.responseFormat === 'json_object') {
    const fullText = `${systemPrompt || ''} ${prompt}`.toLowerCase();
    if (!fullText.includes('json')) {
      sys = sys ? `${sys}\nRespond with a valid JSON object.` : 'Respond with a valid JSON object.';
    }
  }
  if (sys) messages.push({ role: 'system', content: sys });
  messages.push({ role: 'user', content: prompt });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: options.temperature !== undefined ? options.temperature : 0.4,
      max_tokens: options.maxTokens || undefined,
      response_format: options.responseFormat ? { type: options.responseFormat } : undefined
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    // Do not retry if quota is exhausted
    const isQuotaExhausted = response.status === 429 || errorText.includes('insufficient_quota') || errorText.includes('credit_balance_exhausted');
    const err = new Error(`OpenAI HTTP error ${response.status}: ${errorText}`);
    err.isFatalNoRetry = isQuotaExhausted;
    err.isQuotaExhausted = isQuotaExhausted;
    if (isQuotaExhausted) {
      openaiCooldownUntil = Date.now() + 10 * 60 * 1000;
    }
    throw err;
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    provider: 'OpenAI (gpt-4o-mini)',
    tokensUsed: data.usage?.total_tokens || 0
  };
}

async function withRetries(fn, providerName, retries = 1) {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      return await fn();
    } catch (error) {
      if (error.isFatalNoRetry) {
        throw error;
      }
      attempt++;
      console.warn(`[LLM] ${providerName} attempt ${attempt} failed: ${error.message}`);
      if (attempt > retries) {
        throw error;
      }
      const backoff = Math.pow(2, attempt) * 600;
      await sleep(backoff);
    }
  }
}

/**
 * Robust multi-provider LLM caller.
 * Order:
 * 1. GEMINI_API_KEY
 * 2. GEMINI_API_KEY1 (if first key runs out of quota or fails)
 * 3. GEMINI_API_KEY2 (if present)
 * 4. Groq (if all Gemini keys fail/exhaust quota)
 * 5. OpenAI (last resort if configured)
 *
 * Instant failover when quota is exhausted (no retry delay).
 */
async function callLLM(prompt, systemPrompt, options = {}) {
  // Provider 1: Gemini Keys in priority sequence
  const geminiKeys = getGeminiKeys();
  for (let i = 0; i < geminiKeys.length; i++) {
    const { id, key } = geminiKeys[i];
    if (isKeyCoolingDown(key)) {
      continue; // Skip already exhausted key with 0 ms overhead
    }

    try {
      return await withRetries(
        () => fetchGemini(key, id, prompt, systemPrompt, options),
        `Gemini [${id}]`
      );
    } catch (geminiErr) {
      if (geminiErr.isQuotaExhausted) {
        setKeyCooldown(key, 5 * 60 * 1000);
      }
      const nextTarget = (i < geminiKeys.length - 1) ? geminiKeys[i + 1].id : (process.env.GROQ_API_KEY ? 'Groq' : 'OpenAI');
      console.warn(`[LLM] ${id} failed. Falling back immediately to ${nextTarget}. (${geminiErr.message})`);
    }
  }

  // Provider 2: Groq (Blazing fast inference)
  const isGroqCoolingDown = Date.now() < groqCooldownUntil;
  if (process.env.GROQ_API_KEY && !isGroqCoolingDown) {
    try {
      return await withRetries(() => fetchGroq(prompt, systemPrompt, options), 'Groq');
    } catch (groqErr) {
      if (groqErr.isQuotaExhausted) {
        groqCooldownUntil = Date.now() + 5 * 60 * 1000;
      }
      console.warn(`[LLM] Groq failed. Falling back to OpenAI if available. (${groqErr.message})`);
    }
  }

  // Provider 3: OpenAI (if configured and not cooling down)
  const isOpenaiCoolingDown = Date.now() < openaiCooldownUntil;
  if (process.env.OPENAI_API_KEY && !isOpenaiCoolingDown) {
    try {
      return await withRetries(() => fetchOpenAI(prompt, systemPrompt, options), 'OpenAI');
    } catch (openaiErr) {
      console.warn(`[LLM] OpenAI failed: ${openaiErr.message}`);
    }
  }

  throw new Error('All configured LLM providers failed.');
}

module.exports = { callLLM };
