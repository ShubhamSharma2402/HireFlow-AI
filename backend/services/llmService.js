const fetch = globalThis.fetch;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || null,
      response_format: options.responseFormat ? { type: options.responseFormat } : undefined
    })
  });
  if (!response.ok) throw new Error(`OpenAI HTTP error: ${response.status}`);
  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    provider: 'OpenAI (gpt-4o-mini)',
    tokensUsed: data.usage.total_tokens
  };
}

async function fetchGroq(prompt, systemPrompt, options) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('Missing GROQ_API_KEY');
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || null,
      response_format: options.responseFormat ? { type: options.responseFormat } : undefined
    })
  });
  if (!response.ok) throw new Error(`Groq HTTP error: ${response.status}`);
  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    provider: 'Groq (llama-3.1-8b-instant)',
    tokensUsed: data.usage?.total_tokens || 0
  };
}

async function fetchGemini(prompt, systemPrompt, options) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY');
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options.temperature || 0.7,
        maxOutputTokens: options.maxTokens || undefined,
        responseMimeType: options.responseFormat === 'json_object' ? 'application/json' : 'text/plain'
      }
    })
  });
  if (!response.ok) throw new Error(`Gemini HTTP error: ${response.status}`);
  const data = await response.json();
  return {
    content: data.candidates[0].content.parts[0].text,
    provider: 'Gemini (gemini-1.5-flash)',
    tokensUsed: data.usageMetadata?.totalTokenCount || 0
  };
}

async function withRetries(fn, providerName, retries = 2) {
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
      const backoff = Math.pow(2, attempt) * 1000;
      await sleep(backoff);
    }
  }
}

async function callLLM(prompt, systemPrompt, options = {}) {
  try {
    return await withRetries(() => fetchOpenAI(prompt, systemPrompt, options), 'OpenAI');
  } catch (openaiErr) {
    console.error(`[LLM] OpenAI failed completely. Falling back to Groq.`);
    try {
      return await withRetries(() => fetchGroq(prompt, systemPrompt, options), 'Groq');
    } catch (groqErr) {
      console.error(`[LLM] Groq failed completely. Falling back to Gemini.`);
      try {
        return await withRetries(() => fetchGemini(prompt, systemPrompt, options), 'Gemini');
      } catch (geminiErr) {
        console.error(`[LLM] All providers failed.`);
        throw new Error('All LLM providers failed.');
      }
    }
  }
}

module.exports = { callLLM };
