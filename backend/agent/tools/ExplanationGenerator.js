const { callLLM } = require('../../services/llmService');

async function run(params) {
  const { changes, jobData, scoreData } = params;

  const systemPrompt = `You are a resume reviewer explaining changes made to a candidate's resume.
Return a JSON object: { "overallSummary": "string", "changeExplanations": [{ "change": "string", "explanation": "string", "linkedRequirement": "string" }], "suggestions": ["string"] }
The suggestions should be career-level insights based on the changes and score data.`;

  const prompt = `Changes Made: ${JSON.stringify(changes)}
Job Data: ${JSON.stringify(jobData)}
Score Data: ${JSON.stringify(scoreData)}

Generate the explanations and suggestions.`;

  const result = await callLLM(prompt, systemPrompt, { responseFormat: 'json_object', temperature: 0.5 });

  try {
    let contentStr = (result.content || '').trim();
    if (contentStr.startsWith('```')) {
      contentStr = contentStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    }
    const parsed = JSON.parse(contentStr);
    const safeStr = (v) => {
      if (!v) return '';
      if (typeof v === 'string') return v;
      if (typeof v === 'object') return v.description || v.summary || v.text || JSON.stringify(v);
      return String(v);
    };

    return {
      overallSummary: safeStr(parsed.overallSummary),
      changeExplanations: Array.isArray(parsed.changeExplanations) ? parsed.changeExplanations.map(ce => ({
        change: safeStr(ce.change),
        explanation: safeStr(ce.explanation),
        linkedRequirement: safeStr(ce.linkedRequirement)
      })) : [],
      suggestions: Array.isArray(parsed.suggestions)
        ? parsed.suggestions.map(s => safeStr(s)).filter(Boolean)
        : []
    };
  } catch (e) {
    console.error("Failed to parse LLM JSON in ExplanationGenerator", e);
    return { overallSummary: '', changeExplanations: [], suggestions: [] };
  }
}

module.exports = {
  name: 'ExplanationGenerator',
  run
};
