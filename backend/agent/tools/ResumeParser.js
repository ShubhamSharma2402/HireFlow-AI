const { extractSkillsFromText, normalizeSkill } = require('../utils/skillNormalizer');

/**
 * ResumeParser — Parses uploaded resume text into structured fields.
 * Robustly detects section headers (including PROJECT EXPERIENCE, ACHIVEMENTS, etc.),
 * bullet styles (including Unicode dashes), and extracts evidenced skills across
 * projects, work experience, certifications, and summary.
 */
async function run(resumeText) {
  if (!resumeText || typeof resumeText !== 'string') {
    return {
      name: '',
      email: '',
      phone: '',
      linkedin: '',
      github: '',
      summary: '',
      skills: [],
      explicitSkills: [],
      evidencedSkills: [],
      experience: [],
      education: [],
      projects: [],
      certifications: [],
      achievements: [],
      totalExperienceYears: 0,
      rawText: '',
    };
  }

  const lines = resumeText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  const result = {
    name: lines[0] || '',
    email: '',
    phone: '',
    linkedin: '',
    github: '',
    summary: '',
    skills: [],
    explicitSkills: [],
    evidencedSkills: [],
    experience: [],
    education: [],
    projects: [],
    certifications: [],
    achievements: [],
    totalExperienceYears: 0,
    rawText: resumeText,
  };

  // Contact extractions
  const emailMatch = resumeText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) result.email = emailMatch[0];

  const phoneMatch = resumeText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  if (phoneMatch) result.phone = phoneMatch[0];

  const liMatch = resumeText.match(/linkedin\.com\/in\/[a-zA-Z0-9_.-]+/i);
  if (liMatch) result.linkedin = liMatch[0].replace(/\/+$/, '');

  const ghMatch = resumeText.match(/github\.com\/[a-zA-Z0-9_.-]+/i);
  if (ghMatch) result.github = ghMatch[0].replace(/\/+$/, '');

  let currentSection = 'summary';
  let curExp = null, curEd = null, curProj = null;
  const explicitSkillsList = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const lLower = line.toLowerCase();

    // Section header detection
    if (/^(experience|work experience|employment history|professional experience|internships?|work history)\b/i.test(lLower)) {
      currentSection = 'experience';
      continue;
    }
    if (/^(education|academic background|academics|educational background)\b/i.test(lLower)) {
      currentSection = 'education';
      continue;
    }
    if (/^(technical skills|skills & tools|skills|technologies|core competencies|areas of expertise)\b/i.test(lLower)) {
      currentSection = 'skills';
      continue;
    }
    if (/^(projects?|personal projects?|key projects?|academic projects?|project experience|technical projects?)\b/i.test(lLower)) {
      currentSection = 'projects';
      continue;
    }
    if (/^(certifications?|certificates?|licenses?|certifications & training|training & certifications)\b/i.test(lLower)) {
      currentSection = 'certifications';
      continue;
    }
    if (/^(achievements?|achivements?|awards|honors|accomplishments)\b/i.test(lLower)) {
      currentSection = 'achievements';
      continue;
    }

    const isBullet = Boolean(line.match(/^[-*•\u2013\u2014\u2022\u25cf\u25aa\u25ba\u2192]\s*|^\d+[\.\)]\s*/));
    const cleanLine = line.replace(/^[-*•\u2013\u2014\u2022\u25cf\u25aa\u25ba\u2192]\s*|^\d+[\.\)]\s*/, '').trim();

    if (currentSection === 'summary') {
      result.summary += (result.summary ? ' ' : '') + cleanLine;
    } else if (currentSection === 'skills') {
      // Collect explicit skills
      const extractedFromLine = extractSkillsFromText(cleanLine);
      if (extractedFromLine.length > 0) {
        explicitSkillsList.push(...extractedFromLine);
      } else {
        cleanLine.split(/[,|;:]/).map(s => s.trim()).forEach(s => {
          if (s.length > 1 && s.length < 35) explicitSkillsList.push(normalizeSkill(s));
        });
      }
    } else if (currentSection === 'certifications') {
      if (cleanLine) result.certifications.push(cleanLine);
    } else if (currentSection === 'achievements') {
      if (cleanLine) result.achievements.push(cleanLine);
    } else if (currentSection === 'experience') {
      if (!isBullet && (cleanLine.includes('|') || cleanLine.includes(' - ') || cleanLine.length < 60)) {
        if (curExp) result.experience.push(curExp);
        const parts = cleanLine.split(/[|–—]/).map(p => p.trim());
        curExp = {
          title: parts[0] || cleanLine,
          company: parts[1] || '',
          duration: parts[2] || '',
          bullets: [],
        };
      } else if (curExp) {
        if (cleanLine) curExp.bullets.push(cleanLine);
      }
    } else if (currentSection === 'education') {
      if (!isBullet) {
        if (curEd && curEd.degree && curEd.institution) {
          result.education.push(curEd);
          curEd = null;
        }
        if (!curEd) {
          const parts = cleanLine.split(/[|–—]/).map(p => p.trim());
          curEd = {
            institution: parts[0] || cleanLine,
            degree: parts[1] || '',
            year: parts[2] || '',
          };
        } else {
          curEd.degree = (curEd.degree ? curEd.degree + ' ' : '') + cleanLine;
        }
      }
    } else if (currentSection === 'projects') {
      if (!isBullet && (cleanLine.includes(' - ') || cleanLine.includes(' – ') || cleanLine.includes(' — ') || cleanLine.includes('|') || cleanLine.length < 50)) {
        if (curProj) result.projects.push(curProj);
        const parts = cleanLine.split(/\s*[-|–—]\s*/).map(p => p.trim());
        curProj = {
          name: parts[0] || cleanLine,
          technologies: parts.slice(1).join(' - ') || '',
          bullets: [],
        };
      } else if (curProj) {
        if (cleanLine) curProj.bullets.push(cleanLine);
      }
    }
  }

  if (curExp) result.experience.push(curExp);
  if (curEd) result.education.push(curEd);
  if (curProj) result.projects.push(curProj);

  // Extract evidenced skills across the entire resume text
  const allDetectedInText = extractSkillsFromText(resumeText);

  // Evidenced skills: skills appearing specifically in projects, experience, certifications, or summary
  const projectAndExpText = [
    JSON.stringify(result.projects),
    JSON.stringify(result.experience),
    JSON.stringify(result.certifications),
    result.summary,
  ].join('\n');
  const evidencedSkills = extractSkillsFromText(projectAndExpText);

  result.explicitSkills = Array.from(new Set(explicitSkillsList.map(s => normalizeSkill(s)).filter(Boolean)));
  result.evidencedSkills = evidencedSkills;

  // Total skills is the union of explicit and evidenced
  result.skills = Array.from(new Set([...result.explicitSkills, ...allDetectedInText]));

  // Experience calculation
  let expYears = 0;
  const expYearMatches = resumeText.match(/(\d+)\+?\s*years?(?:\s+of)?\s+experience/i);
  if (expYearMatches) {
    expYears = parseInt(expYearMatches[1], 10);
  } else {
    expYears = Math.max(1, (result.experience.length + result.projects.length * 0.5));
  }
  result.totalExperienceYears = expYears;

  return result;
}

module.exports = {
  name: 'ResumeParser',
  run,
};
