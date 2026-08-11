async function run(params) {
  const { jobData, resumeData, keywordData } = params;
  
  let skillsScore = 0;
  if (keywordData.jobKeywords.length > 0) {
    skillsScore = (keywordData.overlap.length / keywordData.jobKeywords.length) * 100;
  } else {
    skillsScore = 100;
  }

  let experienceScore = 0;
  if (jobData.experienceYears > 0) {
    experienceScore = Math.min((resumeData.totalExperienceYears / jobData.experienceYears) * 100, 100);
  } else {
    experienceScore = 100;
  }

  const keywordsScore = skillsScore; // Proxied for now
  
  let educationScore = 100;
  if (jobData.educationRequired) {
    const resEd = JSON.stringify(resumeData.education).toLowerCase();
    if (!resEd.includes(jobData.educationRequired.toLowerCase())) {
      educationScore = 50;
    }
  }

  const atsScore = resumeData.experience.length > 0 && resumeData.skills.length > 0 ? 90 : 40;

  const totalScore = (
    (skillsScore * 0.40) +
    (experienceScore * 0.25) +
    (keywordsScore * 0.20) +
    (educationScore * 0.10) +
    (atsScore * 0.05)
  );

  return {
    totalScore: Math.round(totalScore),
    breakdown: {
      skillsScore: Math.round(skillsScore),
      experienceScore: Math.round(experienceScore),
      keywordsScore: Math.round(keywordsScore),
      educationScore: Math.round(educationScore),
      atsScore: Math.round(atsScore)
    },
    missingCriticalSkills: keywordData.missing.slice(0, 5),
    missingKeywords: keywordData.missing.slice(5, 10),
    strongAreas: keywordData.overlap.slice(0, 3),
    weakAreas: keywordData.missing.slice(0, 3),
    atsIssues: atsScore < 80 ? ['Missing standard sections or quantified achievements'] : []
  };
}

module.exports = {
  name: 'MatchScorer',
  run
};
