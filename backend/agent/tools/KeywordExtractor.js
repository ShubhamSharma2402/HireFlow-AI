async function run(params) {
  const { jobData, resumeData } = params;
  
  const jSkills = (jobData.skills || []).map(s => s.toLowerCase());
  const jKws = (jobData.keywords || []).map(s => s.toLowerCase());
  
  const jobKeywords = [...new Set([...jSkills, ...jKws])];
  const resumeText = JSON.stringify(resumeData).toLowerCase();
  
  const overlap = [];
  const missing = [];
  const extra = [];
  
  jobKeywords.forEach(kw => {
    if (resumeText.includes(kw)) {
      overlap.push(kw);
    } else {
      missing.push(kw);
    }
  });

  const resumeKeywords = [...overlap]; // Simplification for extra keywords
  
  return {
    jobKeywords,
    resumeKeywords,
    overlap,
    missing,
    extra,
    categories: {
      technical: overlap, // Simplified categorization
      soft: [],
      domain: [],
      tools: []
    }
  };
}

module.exports = {
  name: 'KeywordExtractor',
  run
};
