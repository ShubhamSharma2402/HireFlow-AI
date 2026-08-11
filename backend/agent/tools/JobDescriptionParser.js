const techSkills = [
  'react', 'node.js', 'python', 'aws', 'sql', 'javascript', 'typescript', 'java', 'c++', 'c#',
  'ruby', 'php', 'swift', 'kotlin', 'go', 'rust', 'docker', 'kubernetes', 'azure', 'gcp',
  'html', 'css', 'sass', 'less', 'angular', 'vue', 'svelte', 'django', 'flask', 'spring',
  'express', 'nestjs', 'graphql', 'rest', 'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch',
  'rabbitmq', 'kafka', 'git', 'ci/cd', 'jenkins', 'github actions', 'terraform', 'ansible',
  'linux', 'unix', 'bash', 'powershell', 'machine learning', 'ai', 'data science', 'hadoop', 'spark'
];

async function run(jobText) {
  const lowerText = jobText.toLowerCase();
  
  const skills = techSkills.filter(skill => {
    const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return regex.test(jobText);
  });
  
  const keywords = skills.slice(0, 15); // Simplistic TF-IDF approx

  const requirements = [];
  const responsibilities = [];
  
  const lines = jobText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  let inReqs = false, inResps = false;
  
  for (const line of lines) {
    const lLower = line.toLowerCase();
    if (lLower.includes('requirement') || lLower.includes('must have') || lLower.includes('qualifications')) {
      inReqs = true; inResps = false; continue;
    }
    if (lLower.includes('responsibilit') || lLower.includes('what you will do')) {
      inResps = true; inReqs = false; continue;
    }
    
    if (line.match(/^[-*•]\s/) || line.match(/^\d+\.\s/)) {
      if (inReqs) requirements.push(line.replace(/^[-*•\d.]\s*/, '').trim());
      else if (inResps) responsibilities.push(line.replace(/^[-*•\d.]\s*/, '').trim());
    } else if (lLower.includes('required')) {
      requirements.push(line);
    }
  }

  const expMatch = lowerText.match(/(\d+)(?:[-+]\d+)?(?:\+)?\s*(?:years?|yrs?)(?:\s+of)?\s+experience/);
  const experienceYears = expMatch ? parseInt(expMatch[1]) : 0;

  let educationRequired = null;
  if (lowerText.includes('bachelor') || lowerText.includes('bs') || lowerText.includes('b.s')) educationRequired = 'Bachelor';
  if (lowerText.includes('master') || lowerText.includes('ms') || lowerText.includes('m.s')) educationRequired = 'Master';
  if (lowerText.includes('phd') || lowerText.includes('ph.d')) educationRequired = 'PhD';

  let jobType = 'onsite';
  if (lowerText.includes('remote')) jobType = 'remote';
  else if (lowerText.includes('hybrid')) jobType = 'hybrid';

  return {
    title: lines[0] || 'Unknown Title',
    company: 'Unknown Company',
    location: 'Unknown Location',
    requirements,
    responsibilities,
    skills,
    keywords,
    niceToHave: [],
    experienceYears,
    educationRequired,
    jobType
  };
}

module.exports = {
  name: 'JobDescriptionParser',
  run
};
