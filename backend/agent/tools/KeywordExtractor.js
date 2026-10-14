const { normalizeSkill, getSkillCategory, areSkillsEquivalent } = require('../utils/skillNormalizer');

/**
 * KeywordExtractor — Computes matched vs missing skills and keywords,
 * distinguishing required vs preferred skills, and formatting unsupported items
 * for user confirmation.
 */
async function run(params) {
  const { jobData, resumeData } = params;

  // Extract normalized job skills
  const allJobSkills = Array.from(new Set(
    (jobData.skills || []).map(s => normalizeSkill(s)).filter(Boolean)
  ));

  const requiredJobSkills = Array.from(new Set(
    (jobData.requiredSkills || allJobSkills).map(s => normalizeSkill(s)).filter(Boolean)
  ));

  const preferredJobSkills = Array.from(new Set(
    (jobData.preferredSkills || []).map(s => normalizeSkill(s)).filter(Boolean)
  ));

  // Extract normalized resume skills
  const resumeSkills = (resumeData.skills || []).map(s => normalizeSkill(s)).filter(Boolean);
  const evidencedSkills = (resumeData.evidencedSkills || []).map(s => normalizeSkill(s)).filter(Boolean);
  const resumeRawText = (resumeData.rawText || JSON.stringify(resumeData)).toLowerCase();

  const isSkillInResume = (skill) => {
    // 1. Direct canonical match in resumeSkills array
    if (resumeSkills.some(rs => areSkillsEquivalent(rs, skill))) return true;
    // 2. Direct regex match on rawText
    const lower = skill.toLowerCase();
    const regex = new RegExp(`\\b${lower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return regex.test(resumeRawText);
  };

  const matchedSkills = [];
  const missingRequired = [];
  const missingPreferred = [];

  // Check required skills
  for (const skill of requiredJobSkills) {
    if (isSkillInResume(skill)) {
      matchedSkills.push(skill);
    } else {
      missingRequired.push(skill);
    }
  }

  // Check preferred skills
  for (const skill of preferredJobSkills) {
    if (requiredJobSkills.includes(skill)) continue; // Avoid duplicate
    if (isSkillInResume(skill)) {
      if (!matchedSkills.includes(skill)) matchedSkills.push(skill);
    } else {
      missingPreferred.push(skill);
    }
  }

  // All missing skills
  const missing = [...new Set([...missingRequired, ...missingPreferred])];

  // Build unsupportedSkills objects for the popup and report
  const unsupportedSkills = missing.map(skill => {
    const isReq = missingRequired.includes(skill);
    const category = getSkillCategory(skill);

    // Look for related skills in resume that might indicate exposure
    let relatedEvidence = '';
    if (['Docker', 'Kubernetes'].includes(skill) && resumeSkills.some(s => s.includes('Linux') || s.includes('AWS'))) {
      relatedEvidence = 'Has cloud or Linux foundation';
    } else if (['TypeScript'].includes(skill) && resumeSkills.some(s => s === 'JavaScript')) {
      relatedEvidence = 'Has JavaScript foundation';
    } else if (['React', 'Next.js'].includes(skill) && resumeSkills.some(s => s === 'JavaScript' || s === 'HTML5')) {
      relatedEvidence = 'Has frontend foundation';
    } else if (['PostgreSQL', 'MongoDB'].includes(skill) && resumeSkills.some(s => s === 'SQL')) {
      relatedEvidence = 'Has database foundation';
    }

    return {
      skill,
      category,
      importance: isReq ? 'required' : 'preferred',
      type: category === 'Programming Languages' || category === 'Frontend' || category === 'Backend' || category === 'Databases' ? 'technical' : 'tools',
      jobRequirement: isReq ? 'Listed as core requirement for this role' : 'Listed as preferred qualification',
      reason: 'No evidence found in original resume or project descriptions',
      relatedEvidence,
      action: isReq
        ? `Confirm if you have hands-on experience with ${skill} before adding it to your resume.`
        : `Consider confirming familiarity with ${skill} to increase ATS score.`,
    };
  });

  return {
    jobKeywords: allJobSkills,
    requiredSkills: requiredJobSkills,
    preferredSkills: preferredJobSkills,
    resumeKeywords: resumeSkills,
    evidencedSkills,
    overlap: matchedSkills,
    matchedSkills,
    missing,
    missingRequired,
    missingPreferred,
    unsupportedSkills,
    categories: {
      technical: matchedSkills.filter(s => ['Programming Languages', 'Frontend', 'Backend', 'Databases'].includes(getSkillCategory(s))),
      tools: matchedSkills.filter(s => ['Cloud & DevOps', 'Developer Tools', 'Testing & QA'].includes(getSkillCategory(s))),
      missing: missing,
    },
  };
}

module.exports = {
  name: 'KeywordExtractor',
  run,
};
