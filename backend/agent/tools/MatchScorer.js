/**
 * MatchScorer — Deterministic, transparent ATS-style scoring calculation.
 * Accurately reflects skill gaps without artificially inflating scores.
 * Target threshold: 80.
 */
async function run(params) {
  const { jobData, resumeData, keywordData } = params;

  const totalRequired = (keywordData.requiredSkills || []).length;
  const totalPreferred = (keywordData.preferredSkills || []).length;
  const totalSkills = (keywordData.jobKeywords || []).length;

  const matchedRequiredCount = (keywordData.requiredSkills || []).filter(
    s => (keywordData.matchedSkills || []).includes(s)
  ).length;

  const matchedPreferredCount = (keywordData.preferredSkills || []).filter(
    s => (keywordData.matchedSkills || []).includes(s)
  ).length;

  // 1. Required skills match percentage
  let requiredScore = 0;
  if (totalRequired > 0) {
    requiredScore = Math.round((matchedRequiredCount / totalRequired) * 100);
  } else if (totalSkills > 0) {
    requiredScore = Math.round(((keywordData.matchedSkills || []).length / totalSkills) * 100);
  } else {
    // If no technical skills could be extracted from job description, neutral baseline
    requiredScore = 75;
  }

  // 2. Preferred skills match percentage
  let preferredScore = 100;
  if (totalPreferred > 0) {
    preferredScore = Math.round((matchedPreferredCount / totalPreferred) * 100);
  }

  // Combined skills score (required has 80% weight, preferred 20%)
  const skillsScore = totalPreferred > 0
    ? Math.round(requiredScore * 0.80 + preferredScore * 0.20)
    : requiredScore;

  // 3. Experience Score
  let experienceScore = 70;
  const resumeYears = resumeData.totalExperienceYears || 0;
  const jobYears = jobData.experienceYears || 0;

  if (jobYears > 0) {
    experienceScore = Math.min(100, Math.round((resumeYears / jobYears) * 100));
  } else {
    // If job does not specify years: evaluate based on verified experience entries
    const expCount = (resumeData.experience || []).length;
    if (expCount >= 2) experienceScore = 90;
    else if (expCount === 1) experienceScore = 80;
    else experienceScore = 55;
  }

  // 4. Education Score
  let educationScore = 85;
  if (jobData.educationRequired) {
    const resEdText = JSON.stringify(resumeData.education || []).toLowerCase();
    const targetEd = jobData.educationRequired.toLowerCase();
    if (resEdText.includes(targetEd)) {
      educationScore = 100;
    } else if (resEdText.includes('degree') || resEdText.includes('bachelor') || resEdText.includes('b.tech') || resEdText.includes('b.s')) {
      educationScore = 75;
    } else {
      educationScore = 40;
    }
  } else {
    const hasEd = (resumeData.education || []).length > 0;
    educationScore = hasEd ? 90 : 60;
  }

  // 5. ATS Formatting & Structural Quality
  let atsScore = 50;
  const hasContact = Boolean(resumeData.email && (resumeData.phone || resumeData.linkedin || resumeData.github));
  const hasSummary = Boolean(resumeData.summary && resumeData.summary.length > 20);
  const hasSkills = Boolean((resumeData.skills || []).length > 0);
  const hasExperience = Boolean((resumeData.experience || []).length > 0);
  const hasProjects = Boolean((resumeData.projects || []).length > 0);

  if (hasContact) atsScore += 15;
  if (hasSummary) atsScore += 10;
  if (hasSkills) atsScore += 10;
  if (hasExperience) atsScore += 10;
  if (hasProjects) atsScore += 5;

  // Composite ATS Match Score:
  // Skills: 65% weight (core driver of compatibility)
  // Experience: 20% weight
  // Education: 10% weight
  // ATS format: 5% weight
  const totalScore = Math.round(
    (skillsScore * 0.65) +
    (experienceScore * 0.20) +
    (educationScore * 0.10) +
    (atsScore * 0.05)
  );

  const missingCritical = keywordData.missingRequired || keywordData.missing || [];
  const missingNiceToHave = keywordData.missingPreferred || [];

  const atsIssues = [];
  if (!hasContact) atsIssues.push('Missing direct email or phone contact details');
  if (!hasSummary) atsIssues.push('Missing concise professional summary section');
  if (atsScore < 80) atsIssues.push('Ensure standard section headers are used throughout the document');

  return {
    totalScore: Math.min(100, Math.max(0, totalScore)),
    breakdown: {
      skillsScore,
      requiredSkillsScore: requiredScore,
      preferredSkillsScore: preferredScore,
      experienceScore,
      educationScore,
      atsScore,
    },
    missingCriticalSkills: missingCritical,
    missingKeywords: missingNiceToHave,
    allMissingSkills: keywordData.missing || [],
    strongAreas: keywordData.matchedSkills || [],
    weakAreas: missingCritical.slice(0, 5),
    atsIssues,
  };
}

module.exports = {
  name: 'MatchScorer',
  run,
};
