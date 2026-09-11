/**
 * CoverLetterAgent — Generates personalized cover letters
 * Wraps existing CoverLetterGenerator tool
 */
const ToolRegistry = require('../agent/ToolRegistry');

class CoverLetterAgent {
  /**
   * Generate a tailored cover letter
   * @param {object} params
   * @param {object} params.resumeData - Parsed resume
   * @param {object} params.jobData - Parsed job
   * @param {string} params.userName - Candidate name
   */
  async generate({ resumeData, jobData, userName }) {
    console.log(`[CoverLetterAgent] Generating cover letter for: ${userName}`);
    return ToolRegistry.executeTool('CoverLetterGenerator', {
      resumeData,
      jobData,
      userName: userName || 'Candidate',
    });
  }
}

module.exports = CoverLetterAgent;
