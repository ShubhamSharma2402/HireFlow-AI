async function run(resumeText) {
  const lines = resumeText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  const result = {
    name: lines[0] || '',
    email: '',
    phone: '',
    linkedin: '',
    github: '',
    summary: '',
    skills: [],
    experience: [],
    education: [],
    projects: [],
    certifications: [],
    totalExperienceYears: 0
  };

  // Simple extractions
  const emailMatch = resumeText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) result.email = emailMatch[0];

  const phoneMatch = resumeText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  if (phoneMatch) result.phone = phoneMatch[0];

  const liMatch = resumeText.match(/linkedin\.com\/in\/[a-zA-Z0-9_-]+/);
  if (liMatch) result.linkedin = liMatch[0];

  const ghMatch = resumeText.match(/github\.com\/[a-zA-Z0-9_-]+/);
  if (ghMatch) result.github = ghMatch[0];

  let currentSection = 'summary';
  let curExp = null, curEd = null, curProj = null;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const lLower = line.toLowerCase();
    
    // Detect sections
    if (lLower === 'experience' || lLower === 'work experience' || lLower === 'employment') { currentSection = 'experience'; continue; }
    if (lLower === 'education' || lLower === 'academic background') { currentSection = 'education'; continue; }
    if (lLower === 'skills' || lLower === 'technical skills') { currentSection = 'skills'; continue; }
    if (lLower === 'projects' || lLower === 'personal projects') { currentSection = 'projects'; continue; }
    if (lLower === 'certifications' || lLower === 'certificates') { currentSection = 'certifications'; continue; }
    
    const isBullet = line.match(/^[-*•]\s/) || line.match(/^\d+\.\s/);
    const cleanLine = line.replace(/^[-*•\d.]\s*/, '').trim();

    if (currentSection === 'summary') {
      result.summary += (result.summary ? ' ' : '') + cleanLine;
    } else if (currentSection === 'skills') {
      result.skills.push(...cleanLine.split(/[,|]/).map(s => s.trim()).filter(s => s));
    } else if (currentSection === 'certifications') {
      if (isBullet) result.certifications.push(cleanLine);
    } else if (currentSection === 'experience') {
      if (!isBullet) {
        if (curExp) result.experience.push(curExp);
        curExp = { company: cleanLine, title: '', duration: '', startDate: '', endDate: '', bullets: [] };
      } else if (curExp) {
        curExp.bullets.push(cleanLine);
      }
    } else if (currentSection === 'education') {
      if (!isBullet) {
        if (curEd) result.education.push(curEd);
        curEd = { institution: cleanLine, degree: '', field: '', year: '' };
      }
    } else if (currentSection === 'projects') {
      if (!isBullet) {
        if (curProj) result.projects.push(curProj);
        curProj = { name: cleanLine, description: '', technologies: [], bullets: [] };
      } else if (curProj) {
        curProj.bullets.push(cleanLine);
      }
    }
  }

  if (curExp) result.experience.push(curExp);
  if (curEd) result.education.push(curEd);
  if (curProj) result.projects.push(curProj);

  // Approximate experience years
  result.totalExperienceYears = result.experience.length * 2; // naive fallback

  result.rawText = resumeText;

  return result;
}

module.exports = {
  name: 'ResumeParser',
  run
};
