const fetch = globalThis.fetch;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchGemini(prompt, systemPrompt, options = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

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
        throw new Error(`Gemini ${model} HTTP error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error(`Gemini ${model} returned empty content`);

      return {
        content: text,
        provider: `Gemini (${model})`,
        tokensUsed: data.usageMetadata?.totalTokenCount || 0
      };
    } catch (err) {
      lastErr = err;
      console.warn(`[LLM] Gemini ${model} failed: ${err.message}. Trying next model...`);
    }
  }

  throw lastErr || new Error('All Gemini models failed');
}

async function fetchGroq(prompt, systemPrompt, options = {}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('Missing GROQ_API_KEY');

  const models = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];
  let lastErr = null;

  for (const model of models) {
    try {
      const messages = [];
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
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
        throw new Error(`Groq ${model} HTTP error ${response.status}: ${errorText}`);
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
      console.warn(`[LLM] Groq ${model} failed: ${err.message}. Trying next Groq model...`);
    }
  }

  throw lastErr || new Error('All Groq models failed');
}

async function fetchOpenAI(prompt, systemPrompt, options = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');

  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
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
 * Order: Gemini -> Groq -> OpenAI
 * Immediately cascades to working providers if any fail.
 */
async function callLLM(prompt, systemPrompt, options = {}) {
  // Provider 1: Gemini (Ultra-low latency, full JSON support)
  if (process.env.GEMINI_API_KEY) {
    try {
      return await withRetries(() => fetchGemini(prompt, systemPrompt, options), 'Gemini');
    } catch (geminiErr) {
      console.warn(`[LLM] Gemini failed. Falling back to Groq. (${geminiErr.message})`);
    }
  }

  // Provider 2: Groq (Blazing fast inference)
  if (process.env.GROQ_API_KEY) {
    try {
      return await withRetries(() => fetchGroq(prompt, systemPrompt, options), 'Groq');
    } catch (groqErr) {
      console.warn(`[LLM] Groq failed. Falling back to OpenAI. (${groqErr.message})`);
    }
  }

  // Provider 3: OpenAI (gpt-4o-mini)
  if (process.env.OPENAI_API_KEY) {
    try {
      return await withRetries(() => fetchOpenAI(prompt, systemPrompt, options), 'OpenAI');
    } catch (openaiErr) {
      console.warn(`[LLM] OpenAI failed: ${openaiErr.message}`);
    }
  }

  throw new Error('All configured LLM providers failed.');
}

module.exports = { callLLM };
