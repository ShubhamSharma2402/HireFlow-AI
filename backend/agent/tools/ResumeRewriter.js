const { callLLM } = require('../../services/llmService');
const { normalizeSkill } = require('../utils/skillNormalizer');

/**
 * Sanitizes all string fields in a structured resume to remove any
 * internal prompt leakage, agent control words, or meta-commentary.
 */
function sanitizeResume(resume) {
  if (!resume) return resume;

  const LEAK_REGEX = /\b(boundary\s+iterative\s+control|iterative\s+control|system\s+prompt|as\s+an\s+ai|agent\s+instructions?|developer\s+notes?|rewritten\s+(line|bullet)|optimization\s+plan)\b[:\s-]*/gi;

  function cleanString(val) {
    if (val === null || val === undefined) return '';
    if (Array.isArray(val)) {
      return val.map(cleanString).filter(Boolean).join('\n');
    }
    if (typeof val === 'object') {
      val = val.description || val.bullet || val.text || val.name || val.title || val.skill || val.summary || val.achievement || val.certification || JSON.stringify(val);
    }
    if (typeof val !== 'string') val = String(val);
    return val.replace(LEAK_REGEX, '').trim();
  }

  if (resume.name) resume.name = cleanString(resume.name);
  if (resume.summary) resume.summary = cleanString(resume.summary);

  if (Array.isArray(resume.skillCategories)) {
    resume.skillCategories = resume.skillCategories.map(cat => ({
      category: cleanString(cat.category),
      skills: (cat.skills || []).map(s => cleanString(s)).filter(Boolean),
    })).filter(c => c.skills.length > 0);
  }

  if (Array.isArray(resume.experience)) {
    resume.experience = resume.experience.map(exp => ({
      ...exp,
      title: cleanString(exp.title),
      company: cleanString(exp.company),
      duration: cleanString(exp.duration),
      bullets: (exp.bullets || []).map(b => cleanString(b)).filter(Boolean),
    }));
  }

  if (Array.isArray(resume.projects)) {
    resume.projects = resume.projects.map(proj => ({
      ...proj,
      name: cleanString(proj.name),
      technologies: cleanString(proj.technologies),
      liveUrl: cleanString(proj.liveUrl),
      githubUrl: cleanString(proj.githubUrl),
      bullets: (proj.bullets || []).map(b => cleanString(b)).filter(Boolean),
    }));
  }

  if (Array.isArray(resume.education)) {
    resume.education = resume.education.map(edu => ({
      ...edu,
      degree: cleanString(edu.degree),
      institution: cleanString(edu.institution),
      year: cleanString(edu.year),
      gpa: cleanString(edu.gpa),
    }));
  }

  if (Array.isArray(resume.certifications)) {
    resume.certifications = resume.certifications.map(cleanString).filter(Boolean);
  }

  if (Array.isArray(resume.achievements)) {
    resume.achievements = resume.achievements.map(cleanString).filter(Boolean);
  }

  return resume;
}

/**
 * ResumeRewriter — Produces a complete, structured, optimized resume.
 * Naturally integrates evidenced and confirmed skills.
 * Never invents experience, projects, or employment.
 */
async function run(params) {
  const {
    resumeData,
    jobData,
    scoreData,
    weakAreas,
    iterationNumber,
    confirmedSkills = [],
    declinedSkills = [],
    userChoice = 'none',
  } = params;

  const systemPrompt = `You are an elite ATS resume writer and career coach.
Your task is to produce a COMPLETE, professionally rewritten resume that:
1. Integrates missing keywords NATURALLY into appropriate sections (skills, experience, projects)
2. Organizes skills into logical categories (Programming Languages, Frontend, Backend, Databases, Developer Tools, Cloud & DevOps, Testing & QA, etc.) — only create a category if the candidate actually has skills in that category
3. Rewrites project descriptions into concise, action-oriented bullets (Action verb + what was implemented + technical approach + outcome). Target 1-1.5 lines per bullet, max 2-3 bullets per project.
4. Preserves ALL factual information: names, dates, titles, institutions, actual technologies used, actual projects.
5. Does NOT invent experience, skills, or achievements the candidate does not have.
6. Does NOT add a generic keyword dump at the bottom.
7. NEVER includes internal instructions, prompt templates, agent words, or meta-commentary (such as "boundary iterative control", "as requested", "rewritten line") in any resume field.
8. Uses standard ATS section headings.
9. Normalizes skill aliases: 'JS' -> 'JavaScript', 'Node' -> 'Node.js', 'Mongo' -> 'MongoDB'.

Return a JSON object with this EXACT structure:
{
  "completeResume": {
    "name": "string",
    "email": "string",
    "phone": "string",
    "linkedin": "string",
    "github": "string",
    "website": "string",
    "summary": "string (2-3 sentences, role-tailored professional summary)",
    "skillCategories": [
      { "category": "Programming Languages", "skills": ["JavaScript", "Python"] }
    ],
    "experience": [
      {
        "title": "Software Engineer Intern",
        "company": "TechCorp",
        "duration": "May 2023 - Aug 2023",
        "bullets": ["Action verb + what + technical approach + outcome"]
      }
    ],
    "projects": [
      {
        "name": "Project Name",
        "technologies": "React, Node.js, MongoDB",
        "liveUrl": "",
        "githubUrl": "",
        "bullets": ["Concise action-oriented bullet (1-1.5 lines)"]
      }
    ],
    "education": [
      { "degree": "B.Tech in CS", "institution": "University Name", "year": "2024", "gpa": "" }
    ],
    "certifications": [],
    "achievements": []
  },
  "unsupportedSkills": [
    {
      "skill": "Kubernetes",
      "jobRequirement": "Container orchestration",
      "reason": "No evidence of Kubernetes in resume",
      "relatedEvidence": "Has Docker experience",
      "action": "Confirm if you have hands-on Kubernetes experience"
    }
  ],
  "changes": [
    {
      "field": "Summary",
      "original": "exact original line",
      "improved": "rewritten line",
      "reason": "explanation linked to job requirement"
    }
  ],
  "planningNotes": "Brief internal notes"
}`;

  let skillsInstructions = '';
  if (confirmedSkills && confirmedSkills.length > 0) {
    skillsInstructions += `\nUSER-CONFIRMED SKILLS TO ADD:
The candidate explicitly confirmed they possess these skills: ${confirmedSkills.join(', ')}.
- Add each confirmed skill to the appropriate category in skillCategories.
- If an existing project or job entry already demonstrated relevant work, you may refine the phrasing to mention it.
- CRITICAL: DO NOT invent fake projects, employment history, companies, or fake metrics to justify confirmed skills. Only place them in skillCategories unless already evidenced in an existing entry.
`;
  }

  if (declinedSkills && declinedSkills.length > 0) {
    skillsInstructions += `\nUSER-DECLINED SKILLS - DO NOT ADD:
The candidate explicitly DECLINED adding these skills: ${declinedSkills.join(', ')}.
- CRITICAL: You must NOT include any of these declined skills in ANY section of the resume.
`;
  }

  const prompt = `Target Job:
Title: ${jobData.title || 'Software Engineer'}
Required Skills: ${(jobData.requiredSkills || jobData.skills || []).join(', ')}
Preferred Skills: ${(jobData.preferredSkills || []).join(', ')}
Key Requirements: ${(jobData.requirements || []).slice(0, 8).join('; ')}
${skillsInstructions}

Candidate's Current Resume:
${JSON.stringify(resumeData, null, 2)}

Current ATS Match Score: ${scoreData.totalScore}/100
Missing/Weak Areas: ${(weakAreas || []).join(', ')}
Missing Required Keywords: ${((scoreData.missingCriticalSkills || scoreData.missingKeywords || [])).join(', ')}
Strong Areas: ${(scoreData.strongAreas || []).join(', ')}
Iteration: ${(iterationNumber || 0) + 1}

CRITICAL RULES:
1. Only add skills evidenced in the candidate's existing projects or experience, or explicitly listed in USER-CONFIRMED SKILLS above.
2. Under NO circumstances add any skills from USER-DECLINED SKILLS.
3. Do NOT invent new projects, companies, employment dates, or achievements.
4. Improve WORDING and ORGANIZATION, not facts.
5. Keep project bullets to 2-3 max, each 1-1.5 lines long.
6. Never include internal prompt instructions or agent terminology anywhere in the output.

Generate the complete optimized resume now.`;

  try {
    const result = await callLLM(prompt, systemPrompt, {
      responseFormat: 'json_object',
      temperature: 0.3,
      maxTokens: 8192,
    });

    const parsed = repairTruncatedJson(result.content);

    if (!parsed || !parsed.completeResume) {
      console.error('[ResumeRewriter] Missing completeResume in LLM output');
      return { completeResume: null, unsupportedSkills: [], changes: [], planningNotes: '' };
    }

    // Sanitize any meta-commentary or prompt leakage
    const sanitizedResume = sanitizeResume(parsed.completeResume);

    // Deterministically preserve original identity & contact info
    if (resumeData.name) sanitizedResume.name = resumeData.name;
    if (resumeData.email) sanitizedResume.email = resumeData.email;
    if (resumeData.phone) sanitizedResume.phone = resumeData.phone;
    if (resumeData.linkedin) sanitizedResume.linkedin = resumeData.linkedin;
    if (resumeData.github) sanitizedResume.github = resumeData.github;

    // If user confirmed skills, verify they are in skillCategories
    if (confirmedSkills && confirmedSkills.length > 0) {
      confirmedSkills.forEach(cs => {
        const canonical = normalizeSkill(cs);
        const allPresentSkills = (sanitizedResume.skillCategories || []).flatMap(c => c.skills || []);
        if (!allPresentSkills.some(s => s.toLowerCase() === canonical.toLowerCase())) {
          // Add to first available category or 'Technical Skills'
          if (!sanitizedResume.skillCategories || sanitizedResume.skillCategories.length === 0) {
            sanitizedResume.skillCategories = [{ category: 'Technical Skills', skills: [canonical] }];
          } else {
            sanitizedResume.skillCategories[0].skills.push(canonical);
          }
        }
      });
    }

    // If user declined skills, ensure none snuck in
    if (declinedSkills && declinedSkills.length > 0) {
      const declinedLower = declinedSkills.map(d => d.toLowerCase());
      if (Array.isArray(sanitizedResume.skillCategories)) {
        sanitizedResume.skillCategories.forEach(cat => {
          cat.skills = (cat.skills || []).filter(s => !declinedLower.includes(s.toLowerCase()));
        });
      }
    }

    // Serialize the complete resume to rawText for scoring
    sanitizedResume.rawText = serializeResumeToText(sanitizedResume);

    // Filter unsupportedSkills to exclude confirmed ones
    const remainingUnsupported = (Array.isArray(parsed.unsupportedSkills) ? parsed.unsupportedSkills : [])
      .filter(item => {
        const skillName = typeof item === 'string' ? item : item.skill;
        return !confirmedSkills.some(cs => cs.toLowerCase() === skillName.toLowerCase());
      });

    const sanitizedChanges = (Array.isArray(parsed.changes) ? parsed.changes : []).map(ch => {
      if (typeof ch === 'string') return { field: 'General', original: '', improved: cleanString(ch), reason: 'Improvement' };
      return {
        field: cleanString(ch.field || ch.section || 'General'),
        original: cleanString(ch.original || ch.old || ''),
        improved: cleanString(ch.improved || ch.new || ch.description || ''),
        reason: cleanString(ch.reason || ch.explanation || '')
      };
    });

    return {
      completeResume: sanitizedResume,
      unsupportedSkills: remainingUnsupported,
      changes: sanitizedChanges,
      planningNotes: parsed.planningNotes || '',
    };
  } catch (e) {
    console.error('[ResumeRewriter] Failed to parse LLM JSON response:', e.message);
    return { completeResume: null, unsupportedSkills: [], changes: [], planningNotes: '' };
  }
}

function serializeResumeToText(resume) {
  if (!resume) return '';
  const lines = [];

  if (resume.name) lines.push(resume.name);
  const contact = [resume.email, resume.phone, resume.linkedin, resume.github, resume.website]
    .filter(Boolean).join(' | ');
  if (contact) lines.push(contact);
  lines.push('');

  if (resume.summary) {
    lines.push('PROFESSIONAL SUMMARY');
    lines.push(resume.summary);
    lines.push('');
  }

  if (resume.skillCategories && resume.skillCategories.length > 0) {
    lines.push('TECHNICAL SKILLS');
    resume.skillCategories.forEach(cat => {
      if (cat.skills && cat.skills.length > 0) {
        lines.push(`${cat.category}: ${cat.skills.join(', ')}`);
      }
    });
    lines.push('');
  }

  if (resume.experience && resume.experience.length > 0) {
    lines.push('EXPERIENCE');
    resume.experience.forEach(exp => {
      lines.push(`${exp.title} | ${exp.company} | ${exp.duration || ''}`);
      (exp.bullets || []).forEach(b => lines.push(`• ${b}`));
      lines.push('');
    });
  }

  if (resume.projects && resume.projects.length > 0) {
    lines.push('PROJECTS');
    resume.projects.forEach(proj => {
      const techStr = proj.technologies ? ` | ${proj.technologies}` : '';
      lines.push(`${proj.name}${techStr}`);
      (proj.bullets || []).forEach(b => lines.push(`• ${b}`));
      lines.push('');
    });
  }

  if (resume.education && resume.education.length > 0) {
    lines.push('EDUCATION');
    resume.education.forEach(edu => {
      const gpaStr = edu.gpa ? ` | GPA: ${edu.gpa}` : '';
      lines.push(`${edu.degree} | ${edu.institution} | ${edu.year || ''}${gpaStr}`);
    });
    lines.push('');
  }

  if (resume.certifications && resume.certifications.length > 0) {
    lines.push('CERTIFICATIONS');
    resume.certifications.forEach(c => lines.push(`• ${c}`));
    lines.push('');
  }

  if (resume.achievements && resume.achievements.length > 0) {
    lines.push('ACHIEVEMENTS');
    resume.achievements.forEach(a => lines.push(`• ${a}`));
    lines.push('');
  }

  return lines.join('\n').trim();
}

function repairTruncatedJson(jsonStr) {
  if (!jsonStr) return null;
  let s = jsonStr.trim();
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }

  // 1. Direct parse attempt
  try {
    return JSON.parse(s);
  } catch (e1) {
    // Continue to repair
  }

  // 2. Track open braces, brackets, and quotes
  let inString = false;
  let escapeNext = false;
  const stack = [];

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (ch === '\\') {
      escapeNext = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (ch === '{' || ch === '[') {
        stack.push(ch);
      } else if (ch === '}' || ch === ']') {
        stack.pop();
      }
    }
  }

  let repaired = s;
  if (inString) repaired += '"';

  while (stack.length > 0) {
    const open = stack.pop();
    if (open === '{') repaired += '}';
    else if (open === '[') repaired += ']';
  }

  try {
    return JSON.parse(repaired);
  } catch (e2) {
    // 3. Fallback: Trim to last good comma and close
    const lastComma = repaired.lastIndexOf(',');
    if (lastComma > 0) {
      let cut = repaired.slice(0, lastComma);
      let inStr = false;
      let esc = false;
      const st = [];
      for (let i = 0; i < cut.length; i++) {
        const c = cut[i];
        if (esc) { esc = false; continue; }
        if (c === '\\') { esc = true; continue; }
        if (c === '"') { inStr = !inStr; continue; }
        if (!inStr) {
          if (c === '{' || c === '[') st.push(c);
          else if (c === '}' || c === ']') st.pop();
        }
      }
      if (inStr) cut += '"';
      while (st.length > 0) {
        const op = st.pop();
        if (op === '{') cut += '}';
        else if (op === '[') cut += ']';
      }
      try {
        return JSON.parse(cut);
      } catch (e3) {
        console.error('[ResumeRewriter] All JSON repair attempts failed:', e3.message);
        return null;
      }
    }
    return null;
  }
}

module.exports = {
  name: 'ResumeRewriter',
  run,
  serializeResumeToText,
  sanitizeResume,
  repairTruncatedJson,
};
