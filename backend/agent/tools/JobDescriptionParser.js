const { extractSkillsFromText, normalizeSkill } = require('../utils/skillNormalizer');

/**
 * JobDescriptionParser — Extracts structured requirements, responsibilities,
 * required vs preferred skills, experience, and education from target job description.
 */
async function run(jobText) {
  if (!jobText || typeof jobText !== 'string' || jobText.trim().length === 0) {
    return {
      title: 'Unknown Title',
      company: 'Unknown Company',
      location: 'Unknown Location',
      requirements: [],
      responsibilities: [],
      skills: [],
      requiredSkills: [],
      preferredSkills: [],
      keywords: [],
      niceToHave: [],
      experienceYears: 0,
      educationRequired: null,
      jobType: 'onsite',
    };
  }

  const lowerText = jobText.toLowerCase();
  const lines = jobText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  const requirements = [];
  const responsibilities = [];
  const niceToHave = [];

  let currentSection = 'general'; // 'general' | 'reqs' | 'resps' | 'preferred'

  for (const line of lines) {
    const lLower = line.toLowerCase();

    // Section header detection
    if (/^(preferred|nice to have|bonus|plus|optional)/i.test(lLower) ||
        lLower.includes('nice to have') || lLower.includes('bonus points') || lLower.includes('preferred qualification')) {
      currentSection = 'preferred';
      continue;
    }
    if (/^(requirements?|must have|qualifications?|what you bring|what you need|who you are|skills required)/i.test(lLower) ||
        lLower.includes('minimum qualification') || lLower.includes('basic qualification')) {
      currentSection = 'reqs';
      continue;
    }
    if (/^(responsibilit|what you('ll| will) do|key duties|the role|your role)/i.test(lLower)) {
      currentSection = 'resps';
      continue;
    }

    const isBullet = line.match(/^[-*•\d.)\]]\s+/);
    const cleanContent = line.replace(/^[-*•\d.)\]]\s*/, '').trim();

    if (cleanContent.length > 5) {
      if (currentSection === 'preferred') {
        niceToHave.push(cleanContent);
      } else if (currentSection === 'reqs') {
        requirements.push(cleanContent);
      } else if (currentSection === 'resps') {
        responsibilities.push(cleanContent);
      } else if (lLower.includes('required') || lLower.includes('must have') || lLower.includes('proficiency in')) {
        requirements.push(cleanContent);
      }
    }
  }

  // Extract all recognizable technical skills from the entire text
  const allDetectedSkills = extractSkillsFromText(jobText);

  // Extract preferred skills from niceToHave section
  const preferredText = niceToHave.join('\n');
  const preferredSkills = extractSkillsFromText(preferredText);

  // Required skills are those detected in requirements or general text not marked preferred
  const preferredSet = new Set(preferredSkills);
  const requiredSkills = allDetectedSkills.filter(s => !preferredSet.has(s));

  // If no separate preferred section was found, all detected skills are required
  const finalRequired = requiredSkills.length > 0 ? requiredSkills : allDetectedSkills;
  const finalPreferred = preferredSkills;

  // Title detection heuristics
  let title = lines[0] || 'Unknown Title';
  for (const line of lines.slice(0, 5)) {
    if (/(engineer|developer|architect|lead|manager|consultant|analyst|specialist|designer|scientist)/i.test(line)) {
      title = line.replace(/^job\s+title:\s*/i, '').trim();
      break;
    }
  }

  // Company detection
  let company = 'Unknown Company';
  const companyMatch = jobText.match(/(?:at|company:?|about)\s+([A-Z][A-Za-z0-9&.\s]{2,25})/);
  if (companyMatch) company = companyMatch[1].trim();

  // Experience requirement
  const expMatch = lowerText.match(/(\d+)(?:[-+]\d+)?(?:\+)?\s*(?:years?|yrs?)(?:\s+of)?\s+experience/);
  const experienceYears = expMatch ? parseInt(expMatch[1], 10) : 0;

  // Education requirement
  let educationRequired = null;
  if (lowerText.includes('bachelor') || lowerText.includes('bs') || lowerText.includes('b.s') || lowerText.includes('b.tech') || lowerText.includes('btech')) {
    educationRequired = 'Bachelor';
  }
  if (lowerText.includes('master') || lowerText.includes('ms') || lowerText.includes('m.s') || lowerText.includes('m.tech')) {
    educationRequired = 'Master';
  }
  if (lowerText.includes('phd') || lowerText.includes('ph.d')) {
    educationRequired = 'PhD';
  }

  // Job type
  let jobType = 'onsite';
  if (lowerText.includes('remote')) jobType = 'remote';
  else if (lowerText.includes('hybrid')) jobType = 'hybrid';

  return {
    title,
    company,
    location: 'Unknown Location',
    requirements,
    responsibilities,
    skills: allDetectedSkills,
    requiredSkills: finalRequired,
    preferredSkills: finalPreferred,
    keywords: allDetectedSkills,
    niceToHave,
    experienceYears,
    educationRequired,
    jobType,
  };
}

module.exports = {
  name: 'JobDescriptionParser',
  run,
};
