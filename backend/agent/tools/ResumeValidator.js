/**
 * ResumeValidator — Deterministic quality checks on rewritten resume.
 * No LLM calls. Pure structural and integrity validation.
 * Enforces prompt leakage prevention, identity preservation, and declined skill exclusion.
 */

const LEAKAGE_PATTERNS = [
  /boundary\s+iterative\s+control/i,
  /iterative\s+control/i,
  /agentic\s+(loop|optimization)/i,
  /system\s+prompt/i,
  /as\s+an\s+ai/i,
  /optimization\s+plan/i,
  /prompt\s+instructions?/i,
  /developer\s+notes?/i,
  /rewritten\s+(line|bullet|section)/i,
  /llm\s+(model|output|response)/i,
];

function checkForLeakage(obj) {
  const found = [];
  function scan(val, path) {
    if (typeof val === 'string') {
      for (const pattern of LEAKAGE_PATTERNS) {
        if (pattern.test(val)) {
          found.push({ path, match: val });
        }
      }
    } else if (Array.isArray(val)) {
      val.forEach((item, idx) => scan(item, `${path}[${idx}]`));
    } else if (val && typeof val === 'object') {
      Object.keys(val).forEach(key => scan(val[key], `${path}.${key}`));
    }
  }
  scan(obj, 'resume');
  return found;
}

async function run(params) {
  const { originalResume, rewrittenResume, unsupportedSkills, declinedSkills = [] } = params;
  const issues = [];
  const warnings = [];

  if (!rewrittenResume) {
    return { valid: false, issues: ['Rewritten resume is null or empty'], warnings: [], qualityScore: 0 };
  }

  const r = rewrittenResume;

  // 1. Prompt Leakage & Meta-Instruction check
  const leakages = checkForLeakage(r);
  if (leakages.length > 0) {
    issues.push(`Prompt instructions / meta-terminology detected in resume (${leakages.length} occurrences). Must be stripped.`);
  }

  // 2. Declined Skills check: ensure user-declined skills are NOT inserted
  if (declinedSkills && declinedSkills.length > 0) {
    const rawNewText = (r.rawText || JSON.stringify(r)).toLowerCase();
    for (const declined of declinedSkills) {
      const lowerDeclined = declined.toLowerCase();
      // Check in skill categories
      const inSkills = (r.skillCategories || []).some(cat =>
        (cat.skills || []).some(s => s.toLowerCase() === lowerDeclined)
      );
      if (inSkills) {
        issues.push(`Declined skill "${declined}" was included in skills categories despite user rejection.`);
      }
    }
  }

  // 3. Required candidate fields
  if (!r.name || r.name.trim().length === 0) issues.push('Missing candidate name');
  if (!r.email || r.email.trim().length === 0) warnings.push('Missing email address');
  if (!r.summary || r.summary.trim().length < 20) warnings.push('Summary is too short or missing');

  // 4. Skills structure check
  if (!r.skillCategories || r.skillCategories.length === 0) {
    issues.push('No skill categories found in rewritten resume');
  } else {
    const allSkills = r.skillCategories.flatMap(c => c.skills || []);
    if (allSkills.length === 0) issues.push('Skill categories present but no skills listed');
    const normalized = allSkills.map(s => s.toLowerCase().trim());
    const duplicates = normalized.filter((s, i) => normalized.indexOf(s) !== i);
    if (duplicates.length > 0) warnings.push(`Duplicate skills detected: ${[...new Set(duplicates)].join(', ')}`);
  }

  // 5. Experience structure check
  if (r.experience && r.experience.length > 0) {
    r.experience.forEach((exp, i) => {
      if (!exp.title) warnings.push(`Experience #${i+1} missing title`);
      if (!exp.company) warnings.push(`Experience #${i+1} missing company`);
      if (!exp.bullets || exp.bullets.length === 0) warnings.push(`Experience #${i+1} has no bullets`);
    });
  }

  // 6. Projects structure check
  if (r.projects && r.projects.length > 0) {
    r.projects.forEach((proj, i) => {
      if (!proj.name) warnings.push(`Project #${i+1} missing name`);
      if (!proj.bullets || proj.bullets.length === 0) warnings.push(`Project "${proj.name || i+1}" has no bullets`);
      if (proj.bullets && proj.bullets.length > 4) warnings.push(`Project "${proj.name}" has ${proj.bullets.length} bullets (recommended max 3)`);
    });
  }

  // 7. Identity preservation check
  if (originalResume) {
    const origName = (originalResume.name || '').toLowerCase().trim();
    const newName = (r.name || '').toLowerCase().trim();
    if (origName && newName && origName !== newName) {
      issues.push(`Candidate name changed from "${originalResume.name}" to "${r.name}" — identity must be preserved`);
    }
    if (originalResume.email && r.email &&
        originalResume.email.toLowerCase().trim() !== r.email.toLowerCase().trim()) {
      issues.push('Email address was changed — must preserve original contact info');
    }
  }

  // 8. Keyword dump check
  const rawText = (r.rawText || '').toLowerCase();
  if (/^\s*(keywords|additional keywords|keyword dump|skills to add):/m.test(rawText)) {
    issues.push('Detected generic keyword dump section — keywords must be integrated naturally');
  }

  const valid = issues.length === 0;
  const qualityScore = Math.max(0, 100 - (issues.length * 25) - (warnings.length * 5));

  return {
    valid,
    issues,
    warnings,
    qualityScore,
    leakagesDetected: leakages.length,
    unsupportedSkillsCount: Array.isArray(unsupportedSkills) ? unsupportedSkills.length : 0,
  };
}

module.exports = { name: 'ResumeValidator', run, checkForLeakage };
