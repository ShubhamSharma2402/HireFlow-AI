const { callLLM } = require('../../services/llmService');

async function run(params) {
  const { resumeData, jobData, scoreData, weakAreas } = params;

  const systemPrompt = `You are an expert ATS resume writer. You will be provided with a candidate's resume data, job description data, and identified weak areas. 
Your task is to partially rewrite ONLY the weak sections/bullet points to better align with the job requirements.
Integrate keywords naturally (no stuffing).

IMPORTANT:
- "original" in changes MUST be an exact substring/line from the original resume text so it can be highlighted in red.
- "improved" MUST be the new rewritten line so it can be highlighted in green in the optimized resume.

Return a JSON object matching this structure:
{
  "improvedSections": {
    "summary": "string",
    "experience": ["bullet 1", "bullet 2"]
  },
  "changes": [
    {
      "field": "Summary | Experience | Skills",
      "original": "exact line from candidate original resume",
      "improved": "new ATS optimized rewritten line",
      "reason": "explanation linked to job requirements"
    }
  ]
}`;

  const prompt = `Target Job Title & Requirements: ${JSON.stringify(jobData)}
Candidate Resume Content: ${JSON.stringify(resumeData)}
Weak Areas / Missing Keywords: ${JSON.stringify(weakAreas)}
Current Score: ${JSON.stringify(scoreData)}

Rewrite weak bullet points to add missing skills naturally.`;

  const result = await callLLM(prompt, systemPrompt, { responseFormat: 'json_object', temperature: 0.4 });
  
  try {
    const parsed = JSON.parse(result.content);
    return parsed;
  } catch (e) {
    console.error("Failed to parse LLM JSON response in ResumeRewriter", e);
    return { improvedSections: {}, changes: [] };
  }
}

module.exports = {
  name: 'ResumeRewriter',
  run
};
