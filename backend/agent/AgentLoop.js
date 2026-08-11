/**
 * AgentLoop - Core agentic decision engine for HireFlow AI
 * Goal: Maximize user's chances of being shortlisted for a given job
 * 
 * Behavior:
 * - Dynamically selects tools based on current state
 * - Iteratively refines resume until score threshold met or max iterations reached
 * - Stops early if improvement is minimal
 * - Uses LLM only for rewriting/generation tasks
 */

class AgentLoop {
  constructor() {
    this.registry = require('./ToolRegistry');
    this.SCORE_THRESHOLD = parseInt(process.env.MATCH_SCORE_THRESHOLD) || 65;
    this.MAX_ITERATIONS = parseInt(process.env.MAX_ITERATIONS) || 2;
    this.MIN_IMPROVEMENT = parseInt(process.env.MIN_IMPROVEMENT) || 5;
  }

  async run({ resumeText, jobText, userId, userName }) {
    console.log(`🚀 Starting AgentLoop for user ${userName} (${userId})`);
    
    const decisions = [];
    decisions.push({ step: 'init', message: 'Agent Loop initialized.' });

    try {
      const { resumeData, jobData } = await this._parseInputs(resumeText, jobText);
      decisions.push({ step: 'parse', message: 'Parsed inputs successfully.' });

      let currentResumeData = { ...resumeData };
      let initialScoreData = null;
      let finalScoreData = null;
      let iterations = 0;
      let allChanges = [];

      while (iterations < this.MAX_ITERATIONS) {
        console.log(`🔄 Iteration ${iterations + 1}`);
        const { scoreData, keywordData } = await this._scoreAndAnalyze(currentResumeData, jobData);
        
        if (iterations === 0) {
          initialScoreData = scoreData;
        }

        const action = await this._decideAction(scoreData);
        decisions.push({ step: `decision_iter_${iterations+1}`, action, score: scoreData.totalScore });

        if (action === 'proceed') {
          console.log(`✅ Score threshold met (${scoreData.totalScore} >= ${this.SCORE_THRESHOLD}). Proceeding...`);
          finalScoreData = scoreData;
          break;
        }

        console.log(`🛠️ Score below threshold (${scoreData.totalScore} < ${this.SCORE_THRESHOLD}). Improving...`);
        const { improvedResume, changes } = await this._improve(currentResumeData, jobData, scoreData, keywordData, iterations);
        
        // Re-score to check improvement
        const { scoreData: newScoreData } = await this._scoreAndAnalyze(improvedResume, jobData);
        const improvement = newScoreData.totalScore - scoreData.totalScore;
        
        console.log(`📈 Improvement this iteration: +${improvement} points`);
        
        currentResumeData = improvedResume;
        allChanges = allChanges.concat(changes);
        finalScoreData = newScoreData;

        if (improvement < this.MIN_IMPROVEMENT) {
          console.log(`⚠️ Improvement minimal (< ${this.MIN_IMPROVEMENT}). Breaking early.`);
          decisions.push({ step: `early_break_iter_${iterations+1}`, message: 'Improvement too small.' });
          break;
        }

        iterations++;
      }

      if (!finalScoreData) finalScoreData = initialScoreData;

      console.log(`📝 Generating final outputs...`);
      const outputs = await this._generateOutputs(currentResumeData, jobData, finalScoreData, allChanges, userName);
      
      console.log(`🏁 AgentLoop completed successfully!`);

      return {
        success: true,
        jobData,
        resumeData: currentResumeData,
        initialScore: initialScoreData,
        finalScore: finalScoreData,
        iterations,
        improvedResume: currentResumeData,
        changeLog: allChanges,
        coverLetter: outputs.coverLetter,
        qaResponses: outputs.qaResponses,
        explanations: outputs.explanations,
        suggestions: outputs.explanations.suggestions || [],
        agentDecisions: decisions
      };

    } catch (error) {
      console.error(`❌ AgentLoop failed: ${error.message}`);
      return { success: false, error: error.message, agentDecisions: decisions };
    }
  }

  async _parseInputs(resumeText, jobText) {
    const jobData = await this.registry.executeTool('JobDescriptionParser', jobText);
    const resumeData = await this.registry.executeTool('ResumeParser', resumeText);
    if (!resumeData.rawText) {
      resumeData.rawText = resumeText;
    }
    return { resumeData, jobData };
  }

  async _scoreAndAnalyze(resumeData, jobData) {
    const keywordData = await this.registry.executeTool('KeywordExtractor', { jobData, resumeData });
    const scoreData = await this.registry.executeTool('MatchScorer', { jobData, resumeData, keywordData });
    return { scoreData, keywordData };
  }

  async _decideAction(scoreData) {
    if (scoreData.totalScore >= this.SCORE_THRESHOLD) {
      return 'proceed';
    }
    return 'improve';
  }

  async _improve(resumeData, jobData, scoreData, keywordData, iteration) {
    const result = await this.registry.executeTool('ResumeRewriter', {
      resumeData,
      jobData,
      scoreData,
      weakAreas: scoreData.weakAreas
    });

    const improvedResume = JSON.parse(JSON.stringify(resumeData));
    const changes = result.changes || [];

    // Apply rewrites directly into rawText so optimized resume actually changes
    if (improvedResume.rawText && typeof improvedResume.rawText === 'string') {
      let updatedText = improvedResume.rawText;
      changes.forEach((c) => {
        if (c.original && c.improved && updatedText.includes(c.original)) {
          updatedText = updatedText.replace(c.original, c.improved);
        } else if (c.improved && !updatedText.includes(c.improved)) {
          updatedText += `\n• ${c.improved}`;
        }
      });
      improvedResume.rawText = updatedText;
    }

    // Apply improved summary/experience if provided
    if (result.improvedSections) {
      if (result.improvedSections.summary) {
        improvedResume.summary = result.improvedSections.summary;
      }
      if (result.improvedSections.experience) {
        improvedResume.experience = result.improvedSections.experience;
      }
    }

    return {
      improvedResume,
      changes: result.changes || []
    };
  }

  async _generateOutputs(resumeData, jobData, scoreData, allChanges, userName) {
    const [coverLetter, qaResponses, explanations] = await Promise.all([
      this.registry.executeTool('CoverLetterGenerator', { resumeData, jobData, userName }),
      this.registry.executeTool('QAGenerator', { resumeData, jobData }),
      this.registry.executeTool('ExplanationGenerator', { changes: allChanges, jobData, scoreData })
    ]);

    return { coverLetter, qaResponses, explanations };
  }
}

module.exports = AgentLoop;
