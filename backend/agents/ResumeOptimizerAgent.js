/**
 * ResumeOptimizerAgent — Wraps the existing AgentLoop for single-job optimization
 * Preserves full backward compatibility with manual mode
 */
const AgentLoop = require('../agent/AgentLoop');

class ResumeOptimizerAgent {
  constructor() {
    this.agentLoop = new AgentLoop();
  }

  /**
   * Optimize a resume for a specific job
   * @param {object} params
   * @param {string} params.resumeText - Raw resume text
   * @param {string} params.jobText - Raw job description text
   * @param {string} params.userId - MongoDB user ID string
   * @param {string} params.userName - User display name
   * @returns {object} same structure as AgentLoop.run()
   */
  async optimize({ resumeText, jobText, userId, userName }) {
    console.log(`[ResumeOptimizerAgent] Starting optimization for user: ${userName}`);
    const result = await this.agentLoop.run({
      resumeText,
      jobText,
      userId,
      userName: userName || 'Candidate',
    });
    console.log(`[ResumeOptimizerAgent] Done. Score: ${result.initialScore?.totalScore} → ${result.finalScore?.totalScore}`);
    return result;
  }
}

module.exports = ResumeOptimizerAgent;
