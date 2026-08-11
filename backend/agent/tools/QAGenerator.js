const { callLLM } = require('../../services/llmService');

async function run(params) {
  const { resumeData, jobData } = params;

  const systemPrompt = `You are an expert technical interview coach. Generate 5 targeted interview questions and personalized 3-5 line answers tailored specifically to the candidate's resume and job requirements.

Return a JSON object matching this structure:
{
  "qaList": [
    {
      "question": "Why this company?",
      "answer": "personalized 3-5 line answer based on candidate resume + job requirements",
      "tips": "strategic tip for answering this question"
    },
    {
      "question": "Why this role?",
      "answer": "personalized 3-5 line answer",
      "tips": "strategic tip"
    },
    {
      "question": "Tell me about a relevant project",
      "answer": "personalized 3-5 line answer referencing candidate project",
      "tips": "strategic tip"
    },
    {
      "question": "What is your greatest technical strength for this role?",
      "answer": "personalized 3-5 line answer",
      "tips": "strategic tip"
    },
    {
      "question": "How do you handle technical challenges under tight deadlines?",
      "answer": "personalized 3-5 line answer",
      "tips": "strategic tip"
    }
  ]
}`;

  const prompt = `Candidate Resume Data: ${JSON.stringify(resumeData)}
Job Requirements: ${JSON.stringify(jobData)}

Generate personalized interview Q&A.`;

  try {
    const result = await callLLM(prompt, systemPrompt, { responseFormat: 'json_object', temperature: 0.6 });
    const parsed = JSON.parse(result.content);
    let list = parsed.qaList || parsed.questions || parsed.answers || parsed.qa || (Array.isArray(parsed) ? parsed : []);

    if (!Array.isArray(list) || list.length === 0) {
      list = getFallbackQA(resumeData, jobData);
    }
    return normalizeQAList(list);
  } catch (e) {
    console.error("Failed to parse LLM JSON in QAGenerator", e);
    return getFallbackQA(resumeData, jobData);
  }
}

function normalizeQAList(list) {
  if (!Array.isArray(list)) return [];

  return list
    .map((item) => {
      if (!item || typeof item !== 'object') return null;

      const question = String(item.question || item.q || item.Question || '').trim();
      const answer = String(item.answer || item.a || item.Answer || item.response || '').trim();
      const tips = String(item.tips || item.tip || item.Tips || '').trim();

      if (!question && !answer) return null;

      return {
        question: question || 'Interview Question',
        answer: answer || 'Prepare a concise answer based on your experience.',
        tips: tips || 'Highlight key achievements and metrics.',
      };
    })
    .filter(Boolean);
}

function getFallbackQA(resumeData, jobData) {
  const roleTitle = jobData?.title || 'this role';
  const candidateName = resumeData?.name || 'Candidate';

  return [
    {
      question: `Why do you want to work as a ${roleTitle}?`,
      answer: `I am passionate about building scalable, high-impact applications. My technical background in software engineering directly aligns with the core requirements of this role, and I am eager to contribute immediately.`,
      tips: 'Highlight your technical alignment with the key requirements in the job description.'
    },
    {
      question: 'Why this company?',
      answer: `I admire the company's commitment to technical innovation and high product standards. The opportunity to work on complex challenges alongside a collaborative engineering team strongly aligns with my career goals.`,
      tips: 'Connect your personal values with the company culture and product mission.'
    },
    {
      question: 'Tell me about a relevant technical project you worked on.',
      answer: `In one of my key projects, I architected and implemented scalable features using modern web technologies. I focused on clean code, performance optimization, and robust error handling to ensure high reliability.`,
      tips: 'Use the STAR method (Situation, Task, Action, Result) to structure your response.'
    },
    {
      question: 'What is your greatest technical strength for this role?',
      answer: `My greatest strength is my ability to quickly analyze complex technical problems and implement efficient, maintainable solutions while adapting to new tools and frameworks fast.`,
      tips: 'Pick a core skill explicitly mentioned in the job description.'
    },
    {
      question: 'Where do you see yourself in 3-5 years?',
      answer: `In 3-5 years, I see myself taking on greater technical leadership responsibilities, mentoring junior engineers, and driving architectural decisions for key product systems.`,
      tips: 'Show ambition for growth while staying committed to engineering excellence.'
    }
  ];
}

module.exports = {
  name: 'QAGenerator',
  run
};
