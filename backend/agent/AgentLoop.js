/**
 * AgentLoop - Bounded agentic optimization loop for HireFlow AI
 *
 * Algorithm:
 * 1. Parse inputs (parallel)
 * 2. Calculate baseline score (threshold: 80)
 * 3. If baseline >= 80, skip optimization
 * 4. Plan improvements deterministically (respecting confirmed/declined skills)
 * 5. LLM rewrite attempt (max 2 attempts)
 * 6. Validate (deterministic prompt leakage & structure check) + re-score
 * 7. Stop if threshold (80) met OR improvement < 5 pts
 * 8. If below 80 and improvement >= 5, attempt #2
 * 9. Select best valid candidate across all attempts
 * 10. Generate cover letter, Q&A, explanations
 */

const config = require('../config/agentConfig');

class AgentLoop {
  constructor() {
    this.registry = require('./ToolRegistry');
    this.SCORE_THRESHOLD = config.SCORE_THRESHOLD || 80;
    this.MAX_OPTIMIZATION_ATTEMPTS = config.MAX_OPTIMIZATION_ATTEMPTS || 2;
    this.MIN_IMPROVEMENT = config.MIN_SCORE_IMPROVEMENT || 5;
  }

  async run({
    resumeText,
    jobText,
    userId,
    userName,
    confirmedSkills = [],
    declinedSkills = [],
    userChoice = 'none',
  }) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🤖 AgentLoop starting for ${userName}`);
    console.log(`⚙️  Config: threshold=${this.SCORE_THRESHOLD}, maxAttempts=${this.MAX_OPTIMIZATION_ATTEMPTS}, minImprovement=${this.MIN_IMPROVEMENT}`);
    if (confirmedSkills.length > 0) console.log(`✅ User confirmed skills: ${confirmedSkills.join(', ')}`);
    if (declinedSkills.length > 0) console.log(`🚫 User declined skills: ${declinedSkills.join(', ')}`);
    console.log(`${'='.repeat(60)}\n`);

    const decisions = [];
    decisions.push({ step: 'init', message: 'Agent initialized with bounded optimization loop.' });

    try {
      // ── Step 1: Parse inputs ──────────────────────────────────
      console.log('[AgentLoop] Step 1: Parsing documents...');
      const { resumeData, jobData } = await this._parseInputs(resumeText, jobText);
      decisions.push({
        step: 'parse',
        message: `Parsed resume (${resumeData.name || 'Candidate'}) and job (${jobData.title || 'Target Role'}).`,
      });

      // ── Step 2: Baseline score ────────────────────────────────
      console.log('[AgentLoop] Step 2: Calculating baseline score...');
      const { scoreData: baselineScore, keywordData: baselineKeywords } = await this._scoreAndAnalyze(resumeData, jobData);
      const initialScoreData = { ...baselineScore };

      decisions.push({
        step: 'baseline',
        message: `Baseline score: ${baselineScore.totalScore}/100. Matched skills: ${baselineKeywords.matchedSkills.length}/${baselineKeywords.jobKeywords.length}. Missing required: ${baselineKeywords.missingRequired.length}.`,
        score: baselineScore.totalScore,
        missingKeywords: baselineKeywords.missingRequired.slice(0, 8),
        matchedKeywords: baselineKeywords.matchedSkills.slice(0, 8),
      });

      // Candidates pool: tracks all resume versions with their scores
      const candidates = [{
        resumeData,
        scoreData: baselineScore,
        keywordData: baselineKeywords,
        changes: [],
        unsupportedSkills: baselineKeywords.unsupportedSkills || [],
        validationResult: null,
      }];

      let optimizationAttempts = 0;
      let stopReason = 'baseline_sufficient';
      let allUnsupportedSkills = baselineKeywords.unsupportedSkills || [];
      let allChanges = [];

      // ── Step 3: Check if optimization is needed ───────────────
      if (baselineScore.totalScore >= this.SCORE_THRESHOLD) {
        stopReason = 'threshold_met_at_baseline';
        console.log(`[AgentLoop] ✅ Baseline score ${baselineScore.totalScore} already meets threshold ${this.SCORE_THRESHOLD}. Skipping optimization.`);
        decisions.push({
          step: 'decision',
          message: `Baseline score ${baselineScore.totalScore} meets the target threshold of ${this.SCORE_THRESHOLD}. No optimization needed.`,
          action: 'proceed',
        });
      } else {
        // ── Step 4: Plan ──────────────────────────────────────────
        const plan = this._planImprovements(resumeData, jobData, baselineScore, baselineKeywords, confirmedSkills, declinedSkills);
        decisions.push({
          step: 'plan',
          message: plan.summary,
          sectionsToImprove: plan.sections,
          keywordsToIntegrate: plan.keywordsToIntegrate.slice(0, 10),
        });

        let previousScore = baselineScore.totalScore;

        // ── Optimization loop (max 2 LLM rewrite attempts) ────────
        while (optimizationAttempts < this.MAX_OPTIMIZATION_ATTEMPTS) {
          const attemptNum = optimizationAttempts + 1;
          const lastCandidate = candidates[candidates.length - 1];
          console.log(`\n[AgentLoop] 🔄 Optimization attempt ${attemptNum}/${this.MAX_OPTIMIZATION_ATTEMPTS} (current score: ${lastCandidate.scoreData.totalScore})...`);

          // LLM rewrite
          const rewriteResult = await this.registry.executeTool('ResumeRewriter', {
            resumeData: lastCandidate.resumeData,
            jobData,
            scoreData: lastCandidate.scoreData,
            weakAreas: lastCandidate.scoreData.weakAreas,
            iterationNumber: optimizationAttempts,
            confirmedSkills,
            declinedSkills,
            userChoice,
          });

          optimizationAttempts++;

          if (!rewriteResult || !rewriteResult.completeResume) {
            console.warn(`[AgentLoop] ⚠️ Attempt ${attemptNum}: Rewriter returned null. Stopping.`);
            stopReason = 'rewrite_failed';
            decisions.push({
              step: `attempt_${attemptNum}`,
              message: 'Resume rewriter returned invalid output. Retaining best previous result.',
            });
            break;
          }

          allChanges = allChanges.concat(rewriteResult.changes || []);
          allUnsupportedSkills = rewriteResult.unsupportedSkills || [];

          // Validate (deterministic — no LLM)
          const validationResult = await this.registry.executeTool('ResumeValidator', {
            originalResume: resumeData,
            rewrittenResume: rewriteResult.completeResume,
            unsupportedSkills: rewriteResult.unsupportedSkills,
            declinedSkills,
          });

          // Re-score (deterministic — no LLM)
          const { scoreData: newScore, keywordData: newKeywords } = await this._scoreAndAnalyze(
            rewriteResult.completeResume, jobData
          );

          const improvement = newScore.totalScore - previousScore;
          console.log(`[AgentLoop] Attempt ${attemptNum}: ${previousScore} → ${newScore.totalScore} (${improvement >= 0 ? '+' : ''}${improvement} pts)`);
          console.log(`[AgentLoop] Validation: ${validationResult.valid ? '✅ passed' : '⚠️ issues: ' + validationResult.issues.join(', ')}`);

          decisions.push({
            step: `attempt_${attemptNum}`,
            message: `Attempt ${attemptNum}: Score ${previousScore} → ${newScore.totalScore} (${improvement >= 0 ? '+' : ''}${improvement} pts). Validation: ${validationResult.valid ? 'passed' : 'issues detected'}.`,
            score: newScore.totalScore,
            improvement,
            validationIssues: validationResult.issues,
            validationWarnings: validationResult.warnings,
          });

          candidates.push({
            resumeData: rewriteResult.completeResume,
            scoreData: newScore,
            keywordData: newKeywords,
            changes: rewriteResult.changes || [],
            unsupportedSkills: rewriteResult.unsupportedSkills || [],
            validationResult,
          });

          // Stopping condition 1: Target threshold (80) reached
          if (newScore.totalScore >= this.SCORE_THRESHOLD) {
            stopReason = 'threshold_met';
            decisions.push({
              step: 'stop',
              message: `Target threshold of ${this.SCORE_THRESHOLD} reached with score ${newScore.totalScore}. Stopping optimization.`,
            });
            break;
          }

          // Stopping condition 2: Diminishing returns (< 5 points improvement)
          if (improvement < this.MIN_IMPROVEMENT) {
            stopReason = 'insufficient_improvement';
            decisions.push({
              step: 'stop',
              message: `Improvement of ${improvement} pts is below minimum threshold of ${this.MIN_IMPROVEMENT} pts. Optimization has plateaued. Stopping early.`,
            });
            break;
          }

          previousScore = newScore.totalScore;
        }

        if (optimizationAttempts >= this.MAX_OPTIMIZATION_ATTEMPTS &&
            !['threshold_met', 'insufficient_improvement', 'rewrite_failed'].includes(stopReason)) {
          stopReason = 'max_attempts_reached';
          decisions.push({
            step: 'stop',
            message: `Maximum ${this.MAX_OPTIMIZATION_ATTEMPTS} optimization attempts exhausted.`,
          });
        }
      }

      // ── Step 5: Select best valid candidate ───────────────────
      const bestCandidate = this._selectBestCandidate(candidates);
      decisions.push({
        step: 'best_candidate',
        message: `Selected best result: score ${bestCandidate.scoreData.totalScore}/100 (from ${candidates.length} candidate(s)).`,
        finalScore: bestCandidate.scoreData.totalScore,
      });

      // ── Step 6: Generate outputs (parallel LLM calls) ─────────
      console.log('[AgentLoop] Generating cover letter, Q&A, and explanations...');
      const outputs = await this._generateOutputs(
        bestCandidate.resumeData,
        jobData,
        bestCandidate.scoreData,
        allChanges,
        userName
      );

      decisions.push({
        step: 'complete',
        message: `Optimization complete. Final score: ${bestCandidate.scoreData.totalScore}/100. Stop reason: ${stopReason}. Attempts: ${optimizationAttempts}/${this.MAX_OPTIMIZATION_ATTEMPTS}.`,
      });

      console.log(`\n${'='.repeat(60)}`);
      console.log(`✅ AgentLoop done: ${initialScoreData.totalScore} → ${bestCandidate.scoreData.totalScore}`);
      console.log(`🛑 Stop: ${stopReason} | Attempts: ${optimizationAttempts}`);
      console.log(`${'='.repeat(60)}\n`);

      return {
        success: true,
        jobData,
        resumeData, // original resume
        improvedResume: bestCandidate.resumeData, // structured optimized resume
        initialScore: initialScoreData,
        finalScore: bestCandidate.scoreData,
        iterations: optimizationAttempts,
        changeLog: allChanges,
        unsupportedSkills: allUnsupportedSkills,
        confirmedSkills,
        declinedSkills,
        userChoice,
        stopReason,
        coverLetter: outputs.coverLetter,
        qaResponses: outputs.qaResponses,
        explanations: outputs.explanations,
        suggestions: outputs.explanations?.suggestions || [],
        agentDecisions: decisions,
      };

    } catch (error) {
      console.error(`[AgentLoop] ❌ Fatal error: ${error.message}`);
      console.error(error.stack);
      decisions.push({ step: 'fatal_error', message: error.message });
      return { success: false, error: error.message, agentDecisions: decisions };
    }
  }

  async _parseInputs(resumeText, jobText) {
    const [jobData, resumeData] = await Promise.all([
      this.registry.executeTool('JobDescriptionParser', jobText),
      this.registry.executeTool('ResumeParser', resumeText),
    ]);
    if (!resumeData.rawText) resumeData.rawText = resumeText;
    return { resumeData, jobData };
  }

  async _scoreAndAnalyze(resumeData, jobData) {
    const keywordData = await this.registry.executeTool('KeywordExtractor', { jobData, resumeData });
    const scoreData = await this.registry.executeTool('MatchScorer', { jobData, resumeData, keywordData });
    return { scoreData, keywordData };
  }

  _planImprovements(resumeData, jobData, scoreData, keywordData, confirmedSkills, declinedSkills) {
    const sections = [];
    const keywordsToIntegrate = [];

    if (scoreData.breakdown && scoreData.breakdown.skillsScore < 80) {
      sections.push('Technical Skills (categorization and coverage)');
    }
    if (!resumeData.summary || resumeData.summary.length < 50) {
      sections.push('Professional Summary (role-tailored)');
    }
    if ((resumeData.projects || []).some(p => !p.bullets || p.bullets.length === 0)) {
      sections.push('Project Descriptions (concise action bullets)');
    }
    if (sections.length === 0) {
      sections.push('Refine project action verbs and highlight technical impact');
    }

    // Evidenced keywords
    (keywordData.matchedSkills || []).forEach(kw => {
      keywordsToIntegrate.push({ keyword: kw, source: 'evidenced' });
    });

    // Confirmed keywords
    (confirmedSkills || []).forEach(kw => {
      keywordsToIntegrate.push({ keyword: kw, source: 'user_confirmed' });
    });

    const summary = `Improve: ${sections.join('; ')}. ` +
      `Focus on ${keywordsToIntegrate.length} evidenced and confirmed technical skills. ` +
      `${(keywordData.missingRequired || []).length} required skills remain unevidenced.`;

    return { sections, keywordsToIntegrate, summary };
  }

  _selectBestCandidate(candidates) {
    if (!candidates || candidates.length === 0) throw new Error('No candidates to select from');
    if (candidates.length === 1) return candidates[0];

    // Candidates that came from rewrite attempts (index > 0)
    const rewrittenCandidates = candidates.slice(1);

    // Filter valid rewritten candidates (no leakage, complete structure)
    const validRewrites = rewrittenCandidates.filter(c => !c.validationResult || c.validationResult.valid);

    if (validRewrites.length > 0) {
      // Pick the rewritten candidate with the highest score
      return validRewrites.reduce((best, c) =>
        c.scoreData.totalScore > best.scoreData.totalScore ? c : best
      );
    }

    // If rewrites had minor warnings, prefer structurally intact rewrite over unchanged baseline
    const intactRewrites = rewrittenCandidates.filter(c => c.resumeData && (c.resumeData.skillCategories || c.resumeData.projects));
    if (intactRewrites.length > 0) {
      return intactRewrites.reduce((best, c) =>
        c.scoreData.totalScore > best.scoreData.totalScore ? c : best
      );
    }

    return candidates[0];
  }

  async _generateOutputs(resumeData, jobData, scoreData, allChanges, userName) {
    try {
      const [coverLetter, qaResponses, explanations] = await Promise.all([
        this.registry.executeTool('CoverLetterGenerator', { resumeData, jobData, userName }),
        this.registry.executeTool('QAGenerator', { resumeData, jobData }),
        this.registry.executeTool('ExplanationGenerator', { changes: allChanges, jobData, scoreData }),
      ]);
      return { coverLetter, qaResponses, explanations };
    } catch (err) {
      console.error('[AgentLoop] Output generation error (non-fatal):', err.message);
      return { coverLetter: null, qaResponses: [], explanations: {} };
    }
  }
}

module.exports = AgentLoop;
