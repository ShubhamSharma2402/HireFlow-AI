const assert = require('assert');
const path = require('path');

// 1. ToolRegistry
console.log('--- Test 1: Tool Registry Registration ---');
const registry = require('../agent/ToolRegistry');
const tools = registry.getAvailableTools();
console.log('Registered tools:', tools);
assert(tools.includes('JobDescriptionParser'), 'Must include JobDescriptionParser');
assert(tools.includes('ResumeParser'), 'Must include ResumeParser');
assert(tools.includes('KeywordExtractor'), 'Must include KeywordExtractor');
assert(tools.includes('MatchScorer'), 'Must include MatchScorer');
assert(tools.includes('ResumeRewriter'), 'Must include ResumeRewriter');
assert(tools.includes('ResumeValidator'), 'Must include ResumeValidator');
assert(tools.includes('CoverLetterGenerator'), 'Must include CoverLetterGenerator');
assert(tools.includes('QAGenerator'), 'Must include QAGenerator');
assert(tools.includes('ExplanationGenerator'), 'Must include ExplanationGenerator');
console.log('✓ Tool Registry passes all checks');

// 2. ResumeValidator
console.log('\n--- Test 2: ResumeValidator Deterministic Quality Checks ---');
const ResumeValidator = require('../agent/tools/ResumeValidator');

async function testValidator() {
  const origResume = {
    name: 'Jane Doe',
    email: 'jane@example.com',
    skills: ['JavaScript', 'React'],
    experience: [],
    education: []
  };

  // Valid structured resume
  const validResume = {
    name: 'Jane Doe',
    email: 'jane@example.com',
    summary: 'Experienced software engineer specializing in scalable frontend and backend web applications.',
    skillCategories: [
      { category: 'Frontend', skills: ['React', 'JavaScript', 'HTML5'] },
      { category: 'Backend', skills: ['Node.js', 'Express'] }
    ],
    experience: [
      {
        title: 'Frontend Developer',
        company: 'WebWorks',
        duration: '2022 - Present',
        bullets: ['Built responsive React interfaces, improving user retention by 25%']
      }
    ],
    projects: [
      {
        name: 'Portfolio Site',
        bullets: ['Designed responsive web layout with modern CSS']
      }
    ],
    education: [{ degree: 'B.S. Computer Science', institution: 'State University' }]
  };

  const validResult = await ResumeValidator.run({
    originalResume: origResume,
    rewrittenResume: validResume,
    unsupportedSkills: []
  });
  assert.strictEqual(validResult.valid, true, 'Valid resume should pass');
  assert.strictEqual(validResult.issues.length, 0, 'No critical issues');
  console.log('✓ Valid structured resume passed with quality score:', validResult.qualityScore);

  // Identity tampering check: name altered
  const tamperedNameResume = { ...validResume, name: 'John Smith' };
  const tamperedResult = await ResumeValidator.run({
    originalResume: origResume,
    rewrittenResume: tamperedNameResume,
    unsupportedSkills: []
  });
  assert.strictEqual(tamperedResult.valid, false, 'Tampered name must fail validation');
  assert(tamperedResult.issues.some(i => i.includes('Candidate name changed')), 'Must detect name alteration');
  console.log('✓ Identity tampering properly rejected');

  // Generic keyword dump detection
  const keywordDumpResume = {
    ...validResume,
    rawText: 'EXPERIENCE\n• Did work\n\nKeywords: react, node, sql, aws, docker, python, java, k8s'
  };
  const dumpResult = await ResumeValidator.run({
    originalResume: origResume,
    rewrittenResume: keywordDumpResume,
    unsupportedSkills: []
  });
  assert(dumpResult.issues.some(i => i.includes('keyword dump')), 'Must detect keyword dump');
  console.log('✓ Generic keyword dumping properly rejected');
}

// 3. MatchScorer & KeywordExtractor
console.log('\n--- Test 3: MatchScorer and KeywordExtractor Consistency ---');
async function testScoring() {
  const JobDescriptionParser = require('../agent/tools/JobDescriptionParser');
  const ResumeParser = require('../agent/tools/ResumeParser');
  const KeywordExtractor = require('../agent/tools/KeywordExtractor');
  const MatchScorer = require('../agent/tools/MatchScorer');

  const sampleJobText = `Senior Full Stack Developer
Company: Acme Tech
Requirements:
- Bachelor's degree in CS
- 3+ years experience with React, Node.js, and MongoDB
- Strong knowledge of TypeScript, Git, and REST APIs
Responsibilities:
- Build scalable web applications`;

  const sampleResumeText = `Jane Doe
jane@example.com | 555-0199 | linkedin.com/in/janedoe | github.com/janedoe

SUMMARY
Full Stack Engineer with experience building web applications.

SKILLS
React, JavaScript, Git, HTML, CSS

EXPERIENCE
Frontend Engineer - Startup Co
- Developed user interfaces using React and Git
- Integrated REST endpoints

EDUCATION
Bachelor of Science in Computer Science - Tech University`;

  const jobData = await JobDescriptionParser.run(sampleJobText);
  const resumeData = await ResumeParser.run(sampleResumeText);

  assert(jobData.skills.length > 0, 'Should extract job skills');
  assert(resumeData.skills.length > 0, 'Should extract resume skills');

  const kwData = await KeywordExtractor.run({ jobData, resumeData });
  const scoreData = await MatchScorer.run({ jobData, resumeData, keywordData: kwData });

  assert(typeof scoreData.totalScore === 'number', 'Total score must be numeric');
  assert(scoreData.totalScore >= 0 && scoreData.totalScore <= 100, 'Score must be between 0 and 100');
  assert(scoreData.breakdown, 'Must contain score breakdown');
  assert(Array.isArray(scoreData.missingKeywords) || Array.isArray(scoreData.weakAreas), 'Must report gaps');

  console.log('✓ Scoring calculated properly: Score =', scoreData.totalScore, 'Breakdown =', scoreData.breakdown);
}

// 4. ResumeRewriter text serialization
console.log('\n--- Test 4: Resume Serialization to Plain Text ---');
function testSerialization() {
  const { serializeResumeToText } = require('../agent/tools/ResumeRewriter');
  const sample = {
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '555-0100',
    summary: 'Skilled developer with a track record of building production systems.',
    skillCategories: [
      { category: 'Frontend', skills: ['React', 'TypeScript'] },
      { category: 'Backend', skills: ['Node.js', 'Express', 'MongoDB'] }
    ],
    experience: [
      {
        title: 'Software Engineer',
        company: 'Cloud Corp',
        duration: '2022 - 2024',
        bullets: ['Built scalable microservices using Node.js and MongoDB', 'Reduced API latency by 40%']
      }
    ],
    projects: [
      {
        name: 'Task Manager',
        technologies: 'React, Node.js',
        bullets: ['Implemented real-time collaboration with WebSocket']
      }
    ],
    education: [
      { degree: 'B.S. in Computer Science', institution: 'University', year: '2022' }
    ]
  };

  const text = serializeResumeToText(sample);
  assert(text.includes('JANE DOE') || text.includes('Jane Doe'), 'Must include name');
  assert(text.includes('TECHNICAL SKILLS'), 'Must have Technical Skills header');
  assert(text.includes('Frontend: React, TypeScript'), 'Must format categorized skills');
  assert(text.includes('Backend: Node.js, Express, MongoDB'), 'Must format backend skills');
  assert(text.includes('EXPERIENCE'), 'Must have Experience header');
  assert(text.includes('• Built scalable microservices'), 'Must format bullet point');
  assert(!text.includes('Keywords:'), 'Must NOT have generic keywords dump');
  console.log('✓ Resume serialization generates structured ATS-ready text');
}

// 5. AgentLoop Configuration & Logic
console.log('\n--- Test 5: AgentLoop Configuration and Limits ---');
function testAgentLoopConfig() {
  const AgentLoop = require('../agent/AgentLoop');
  const loop = new AgentLoop();

  assert.strictEqual(loop.SCORE_THRESHOLD, 80, 'Threshold must be 80 by default');
  assert.strictEqual(loop.MAX_OPTIMIZATION_ATTEMPTS, 2, 'Max attempts must be 2');
  assert.strictEqual(loop.MIN_IMPROVEMENT, 5, 'Min improvement must be 5');

  // Verify best candidate selection logic
  const candidate1 = {
    scoreData: { totalScore: 50 },
    validationResult: { valid: true }
  };
  const candidate2 = {
    scoreData: { totalScore: 75 },
    validationResult: { valid: true }
  };
  const candidate3 = {
    scoreData: { totalScore: 85 },
    validationResult: { valid: false } // invalid due to tampering/hallucination
  };

  // Best valid should be candidate2 (75) because candidate3 is invalid
  const best = loop._selectBestCandidate([candidate1, candidate2, candidate3]);
  assert.strictEqual(best.scoreData.totalScore, 75, 'Must pick best VALID candidate, ignoring invalid ones');
  console.log('✓ Best valid candidate correctly selected over higher-scoring invalid candidate');
}

async function runAll() {
  await testValidator();
  await testScoring();
  testSerialization();
  testAgentLoopConfig();
  console.log('\n========================================');
  console.log('ALL TESTS PASSED SUCCESSFULLY! ✓');
  console.log('========================================');
}

runAll().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
