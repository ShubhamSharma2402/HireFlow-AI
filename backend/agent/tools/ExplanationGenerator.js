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
    return JSON.parse(result.content);
  } catch (e) {
    console.error("Failed to parse LLM JSON in ExplanationGenerator", e);
    return { overallSummary: '', changeExplanations: [], suggestions: [] };
  }
}

module.exports = {
  name: 'ExplanationGenerator',
  run
};
