const assert = require('assert');

console.log('====================================================');
console.log('HIREFLOW AI — COMPREHENSIVE REGRESSION TEST SUITE');
console.log('====================================================\n');

// Tool imports
const skillNormalizer = require('../agent/utils/skillNormalizer');
const JobDescriptionParser = require('../agent/tools/JobDescriptionParser');
const ResumeParser = require('../agent/tools/ResumeParser');
const KeywordExtractor = require('../agent/tools/KeywordExtractor');
const MatchScorer = require('../agent/tools/MatchScorer');
const ResumeValidator = require('../agent/tools/ResumeValidator');
const ResumeRewriter = require('../agent/tools/ResumeRewriter');
const AgentLoop = require('../agent/AgentLoop');
const config = require('../config/agentConfig');

async function runRegressionTests() {
  // ── TEST SUITE A: Skill-Gap Detection & Normalization ───────────
  console.log('--- SUITE A: Skill-Gap Detection & Normalization ---');

  // Test A1: Missing React while job requires React
  {
    const jobText = 'Senior Backend Engineer\nRequirements:\n- Strong experience with Python, Django, PostgreSQL, and React';
    const resumeText = 'Jane Doe\njane@example.com\nSUMMARY\nBackend developer\nSKILLS\nPython, Django, PostgreSQL\nEXPERIENCE\nDev at Co\n- Built APIs with Django';

    const jobData = await JobDescriptionParser.run(jobText);
    const resumeData = await ResumeParser.run(resumeText);
    const kwData = await KeywordExtractor.run({ jobData, resumeData });

    assert(kwData.missing.includes('React') || kwData.missingRequired.includes('React'), 'React must be detected as missing');
    assert(kwData.matchedSkills.includes('Python'), 'Python must be matched');
    assert(kwData.matchedSkills.includes('Django'), 'Django must be matched');
    assert(kwData.matchedSkills.includes('PostgreSQL'), 'PostgreSQL must be matched');
    console.log('✓ A1: Missing skill (React) correctly identified');
  }

  // Test A2: Skill in project description counts as evidence even if not in formal skills section
  {
    const jobText = 'Frontend Engineer\nRequirements:\n- Hands-on React experience';
    const resumeText = `John Smith
john@example.com
SUMMARY
Web Developer
SKILLS
HTML, CSS, JavaScript
PROJECTS
E-Commerce App | Web Application
• Developed dynamic storefront using React and Redux`;

    const jobData = await JobDescriptionParser.run(jobText);
    const resumeData = await ResumeParser.run(resumeText);
    const kwData = await KeywordExtractor.run({ jobData, resumeData });

    assert(kwData.matchedSkills.includes('React'), 'React in project bullet must be recognized as matched');
    assert(!kwData.missingRequired.includes('React'), 'React must not be reported as missing when evidenced in project');
    console.log('✓ A2: Skill evidenced in project description correctly recognized');
  }

  // Test A3: JavaScript does NOT automatically satisfy Node.js
  {
    const jobText = 'Backend Node.js Engineer\nRequirements:\n- 3+ years experience with Node.js and Express.js';
    const resumeText = 'Developer\ndev@test.com\nSKILLS\nJavaScript, HTML, CSS\nEXPERIENCE\nFront-end dev building interactive websites with JavaScript';

    const jobData = await JobDescriptionParser.run(jobText);
    const resumeData = await ResumeParser.run(resumeText);
    const kwData = await KeywordExtractor.run({ jobData, resumeData });

    assert(kwData.missing.includes('Node.js') || kwData.missingRequired.includes('Node.js'), 'JavaScript must NOT satisfy Node.js');
    console.log('✓ A3: JavaScript does not falsely satisfy Node.js requirement');
  }

  // Test A4: Equivalent normalized aliases match (JS = JavaScript, K8s = Kubernetes)
  {
    assert.strictEqual(skillNormalizer.normalizeSkill('JS'), 'JavaScript');
    assert.strictEqual(skillNormalizer.normalizeSkill('K8s'), 'Kubernetes');
    assert.strictEqual(skillNormalizer.normalizeSkill('nodejs'), 'Node.js');
    assert.strictEqual(skillNormalizer.normalizeSkill('mongo'), 'MongoDB');
    assert.strictEqual(skillNormalizer.normalizeSkill('postgres'), 'PostgreSQL');
    assert.strictEqual(skillNormalizer.normalizeSkill('rest api'), 'REST APIs');

    assert(skillNormalizer.areSkillsEquivalent('JS', 'JavaScript'));
    assert(skillNormalizer.areSkillsEquivalent('K8s', 'Kubernetes'));
    assert(skillNormalizer.areSkillsEquivalent('nodejs', 'Node.js'));
    console.log('✓ A4: Equivalent normalized aliases match correctly');
  }

  // Test A5: Duplicate keyword mentions do not artificially inflate score
  {
    const jobText = 'Role\nRequirements:\n- Python, Docker, Kubernetes';
    const resumeText = 'Dev\nSKILLS\nPython, Python, Python, Python, Python';

    const jobData = await JobDescriptionParser.run(jobText);
    const resumeData = await ResumeParser.run(resumeText);
    const kwData = await KeywordExtractor.run({ jobData, resumeData });
    const scoreData = await MatchScorer.run({ jobData, resumeData, keywordData: kwData });

    // 1 out of 3 skills matched = 33% skills score, should NOT get 100% because Python is repeated 5 times
    assert(scoreData.breakdown.skillsScore <= 35, 'Repeated skills must not inflate skills score');
    assert(scoreData.totalScore < 60, 'Total score must remain low when 2 of 3 required skills are missing');
    console.log('✓ A5: Duplicate keyword mentions do not inflate score');
  }

  // Test A6: Empty or missing requirements do not yield a perfect score or false "no gaps"
  {
    const jobText = 'Software Engineer\nRequirements:\n- Go, Rust, Distributed Systems';
    const emptyResume = '';
    const jobData = await JobDescriptionParser.run(jobText);
    const resumeData = await ResumeParser.run(emptyResume);
    const kwData = await KeywordExtractor.run({ jobData, resumeData });
    const scoreData = await MatchScorer.run({ jobData, resumeData, keywordData: kwData });

    assert(kwData.missingRequired.length > 0, 'Must report missing skills for empty resume');
    assert(scoreData.totalScore < 40, 'Empty resume must not get a passing score');
    console.log('✓ A6: Empty resume rejected with appropriate low score and detected gaps');
  }

  // ── TEST SUITE B: Skill Confirmation & Integrity ───────────────
  console.log('\n--- SUITE B: Skill Confirmation & Integrity ---');

  // Test B1: Missing skills trigger requiresConfirmation in pre-analysis
  {
    const jobText = 'Full Stack Engineer\nRequirements:\n- React, Node.js, Docker, Kubernetes, AWS';
    const resumeText = 'Jane\njane@test.com\nSKILLS\nReact, Node.js';

    const jobData = await JobDescriptionParser.run(jobText);
    const resumeData = await ResumeParser.run(resumeText);
    const kwData = await KeywordExtractor.run({ jobData, resumeData });
    const scoreData = await MatchScorer.run({ jobData, resumeData, keywordData: kwData });

    const requiresConfirmation = kwData.unsupportedSkills.length > 0 && scoreData.totalScore < 80;
    assert.strictEqual(requiresConfirmation, true, 'Pre-analysis must require confirmation when missing skills exist and score < 80');
    assert(kwData.unsupportedSkills.some(s => s.skill === 'Docker'), 'Docker must be in unsupported skills');
    assert(kwData.unsupportedSkills.some(s => s.skill === 'Kubernetes'), 'Kubernetes must be in unsupported skills');
    assert(kwData.unsupportedSkills.some(s => s.skill === 'AWS'), 'AWS must be in unsupported skills');
    console.log('✓ B1: Pre-analysis correctly flags unsupported skills for confirmation');
  }

  // Test B2: Declined skills must be strictly excluded
  {
    const candidateResume = {
      name: 'Alex Morgan',
      email: 'alex@example.com',
      summary: 'Experienced software engineer.',
      skillCategories: [
        { category: 'Frontend', skills: ['React', 'JavaScript'] },
        { category: 'Backend', skills: ['Node.js', 'Docker'] } // Docker was declined!
      ],
      experience: [{ title: 'Engineer', company: 'Co', bullets: ['Built web app'] }],
      projects: [{ name: 'Project 1', bullets: ['Implemented feature'] }],
      education: [{ degree: 'B.S.', institution: 'University' }]
    };

    const valResult = await ResumeValidator.run({
      originalResume: { name: 'Alex Morgan', email: 'alex@example.com' },
      rewrittenResume: candidateResume,
      declinedSkills: ['Docker', 'Kubernetes'],
    });

    assert.strictEqual(valResult.valid, false, 'Validator must reject resume containing user-declined skills');
    assert(valResult.issues.some(i => i.includes('Declined skill "Docker"')), 'Must detect declined skill');
    console.log('✓ B2: Validator enforces strict exclusion of user-declined skills');
  }

  // ── TEST SUITE C: Prompt Leakage Prevention & Formatting ────────
  console.log('\n--- SUITE C: Prompt Leakage Prevention & Formatting ---');

  // Test C1: Prompt leakage detection in ResumeValidator
  {
    const contaminatedResume = {
      name: 'Alex Morgan',
      email: 'alex@example.com',
      summary: 'Experienced software engineer. Applied boundary iterative control to optimize backend services.',
      skillCategories: [{ category: 'Programming Languages', skills: ['Python'] }],
      experience: [{ title: 'Developer', company: 'Tech', bullets: ['Rewritten line as requested by system prompt'] }],
      projects: [{ name: 'App', bullets: ['Built service'] }],
      education: [{ degree: 'BS', institution: 'College' }]
    };

    const valResult = await ResumeValidator.run({
      originalResume: { name: 'Alex Morgan', email: 'alex@example.com' },
      rewrittenResume: contaminatedResume,
      declinedSkills: [],
    });

    assert.strictEqual(valResult.valid, false, 'Must reject prompt leakage');
    assert(valResult.leakagesDetected > 0, 'Must record leakage count');
    console.log('✓ C1: Prompt leakage ("boundary iterative control", "system prompt") detected and rejected');
  }

  // Test C2: Sanitizer cleanly removes leaked prompt instructions
  {
    const sample = {
      name: 'Alex Morgan',
      summary: 'Developer with 4 years experience. System prompt: optimize for ATS.',
      projects: [{
        name: 'Web App',
        bullets: ['Implemented API. Boundary iterative control applied for latency reduction.']
      }]
    };

    const sanitized = ResumeRewriter.sanitizeResume(sample);
    assert(!sanitized.summary.includes('System prompt'), 'Sanitizer must remove system prompt leakage');
    assert(!sanitized.projects[0].bullets[0].includes('Boundary iterative control'), 'Sanitizer must remove boundary iterative control');
    console.log('✓ C2: ResumeRewriter sanitizer cleans prompt leakage');
  }

  // ── TEST SUITE D: ATS Threshold = 80 & Bounded Loop Logic ───────
  console.log('\n--- SUITE D: ATS Threshold = 80 & Bounded Loop Logic ---');

  // Test D1: Default threshold is 80
  {
    const loop = new AgentLoop();
    assert.strictEqual(loop.SCORE_THRESHOLD, 80, 'Default score threshold must be 80');
    assert.strictEqual(loop.MAX_OPTIMIZATION_ATTEMPTS, 2, 'Max attempts must be 2');
    assert.strictEqual(loop.MIN_IMPROVEMENT, 5, 'Min score improvement must be 5');
    console.log('✓ D1: AgentLoop defaults verified: Threshold=80, MaxAttempts=2, MinGain=5');
  }

  // Test D2: Best candidate selection ignores invalid candidates
  {
    const loop = new AgentLoop();
    const candidates = [
      { scoreData: { totalScore: 72 }, validationResult: { valid: true } },
      { scoreData: { totalScore: 95 }, validationResult: { valid: false } }, // High score but failed validation (e.g. prompt leakage or fake claims)
      { scoreData: { totalScore: 82 }, validationResult: { valid: true } },
    ];

    const best = loop._selectBestCandidate(candidates);
    assert.strictEqual(best.scoreData.totalScore, 82, 'Must pick highest valid candidate (82), rejecting invalid candidate (95)');
    console.log('✓ D2: Best candidate selection correctly filters out invalid versions');
  }

  // Test D3: Scorer accurately weights skills and prevents false 80+
  {
    const jobData = {
      skills: ['Go', 'Kubernetes', 'Docker', 'gRPC', 'PostgreSQL', 'Terraform', 'AWS'],
      requiredSkills: ['Go', 'Kubernetes', 'Docker', 'gRPC', 'PostgreSQL', 'Terraform', 'AWS'],
      preferredSkills: [],
      experienceYears: 4,
      educationRequired: 'Bachelor',
    };

    // Candidate has only 1 skill (Go)
    const resumeData = {
      skills: ['Go'],
      evidencedSkills: ['Go'],
      totalExperienceYears: 4,
      experience: [{ title: 'Go Developer', company: 'Co', bullets: ['Wrote Go code'] }],
      education: [{ degree: 'Bachelor of Science in CS', institution: 'Uni' }],
      email: 'go@test.com',
      phone: '555-0100',
      summary: 'Go developer',
    };

    const kwData = await KeywordExtractor.run({ jobData, resumeData });
    const scoreData = await MatchScorer.run({ jobData, resumeData, keywordData: kwData });

    // With 1 of 7 skills (14%), score MUST be well below 80!
    assert(scoreData.totalScore < 50, `Score (${scoreData.totalScore}) must be < 50 when 6 of 7 required skills are missing`);
    assert(scoreData.totalScore < 80, 'Score must not reach threshold when missing majority of required skills');
    console.log(`✓ D3: Accurate scoring verified (1/7 skills matched -> Score: ${scoreData.totalScore}/100, far below 80)`);
  }

  console.log('\n====================================================');
  console.log('ALL REGRESSION TESTS PASSED CLEANLY! (12/12) ✓');
  console.log('====================================================\n');
}

runRegressionTests().catch(err => {
  console.error('\n❌ REGRESSION TEST FAILED:', err);
  process.exit(1);
});
