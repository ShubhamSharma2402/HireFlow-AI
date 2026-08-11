const { callLLM } = require('../../services/llmService');

async function run(params) {
  const { resumeData, jobData, userName } = params;

  const systemPrompt = `You are an expert career coach writing professional cover letters.
Return a JSON object exactly with these keys: subject, greeting, openingParagraph, bodyParagraph1, bodyParagraph2, closingParagraph, signature.
The cover letter must be personalized using the resume data and directly reference the job requirements. Maintain a professional, confident, and authentic tone.`;

  const prompt = `Candidate Name: ${userName}
Resume Data: ${JSON.stringify(resumeData)}
Job Data: ${JSON.stringify(jobData)}

Generate the cover letter in JSON format.`;

  const result = await callLLM(prompt, systemPrompt, { responseFormat: 'json_object', temperature: 0.7 });

  try {
    return JSON.parse(result.content);
  } catch (e) {
    console.error("Failed to parse LLM JSON in CoverLetterGenerator", e);
    return { error: 'Failed to generate cover letter.' };
  }
}

module.exports = {
  name: 'CoverLetterGenerator',
  run
};
