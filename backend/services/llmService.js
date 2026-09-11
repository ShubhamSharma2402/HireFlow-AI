const fetch = globalThis.fetch;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Groq Provider (Ultra-fast, high quality)
 */
async function fetchGroq(prompt, systemPrompt, options) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('Missing GROQ_API_KEY');

  const models = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b'];
  let lastErr = null;

  for (const model of models) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: options.temperature !== undefined ? options.temperature : 0.6,
          max_tokens: options.maxTokens || 4096,
          response_format: options.responseFormat === 'json_object' ? { type: 'json_object' } : undefined
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Groq HTTP ${response.status} (${model}): ${errText}`);
      }

      const data = await response.json();
      return {
        content: data.choices[0].message.content,
        provider: `Groq (${model})`,
        tokensUsed: data.usage?.total_tokens || 0
      };
    } catch (err) {
      lastErr = err;
      console.warn(`[LLM] Groq model ${model} failed: ${err.message}`);
    }
  }

  throw lastErr || new Error('All Groq models failed');
}

/**
 * Gemini Provider (Google Generative AI)
 */
async function fetchGemini(prompt, systemPrompt, options) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

  const models = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.5-pro'];
  let lastErr = null;

  for (const model of models) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: options.temperature !== undefined ? options.temperature : 0.6,
            maxOutputTokens: options.maxTokens || 4096,
            responseMimeType: options.responseFormat === 'json_object' ? 'application/json' : 'text/plain'
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini HTTP ${response.status} (${model}): ${errText}`);
      }

      const data = await response.json();
      return {
        content: data.candidates[0].content.parts[0].text,
        provider: `Gemini (${model})`,
        tokensUsed: data.usageMetadata?.totalTokenCount || 0
      };
    } catch (err) {
      lastErr = err;
      console.warn(`[LLM] Gemini model ${model} failed: ${err.message}`);
    }
  }

  throw lastErr || new Error('All Gemini models failed');
}

/**
 * OpenAI Provider
 */
async function fetchOpenAI(prompt, systemPrompt, options) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: options.temperature !== undefined ? options.temperature : 0.7,
      max_tokens: options.maxTokens || 4096,
      response_format: options.responseFormat === 'json_object' ? { type: 'json_object' } : undefined
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI HTTP ${response.status}: ${errText}`);
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
      attempt++;
      console.warn(`[LLM] ${providerName} attempt ${attempt} failed: ${error.message}`);
      if (attempt > retries) {
        throw error;
      }
      const backoff = Math.pow(2, attempt) * 500;
      await sleep(backoff);
    }
  }
}

/**
 * Multi-tier resilient LLM call
 * Priority: Groq -> Gemini -> OpenAI
 */
async function callLLM(prompt, systemPrompt, options = {}) {
  // Tier 1: Groq
  try {
    return await withRetries(() => fetchGroq(prompt, systemPrompt, options), 'Groq');
  } catch (groqErr) {
    console.warn(`[LLM] Groq failed completely. Falling back to Gemini.`);
  }

  // Tier 2: Gemini
  try {
    return await withRetries(() => fetchGemini(prompt, systemPrompt, options), 'Gemini');
  } catch (geminiErr) {
    console.warn(`[LLM] Gemini failed completely. Falling back to OpenAI.`);
  }

  // Tier 3: OpenAI
  try {
    return await withRetries(() => fetchOpenAI(prompt, systemPrompt, options), 'OpenAI');
  } catch (openaiErr) {
    console.error(`[LLM] All LLM providers failed.`);
    throw new Error(`All LLM providers failed. Last error: ${openaiErr.message}`);
  }
}

module.exports = { callLLM };
