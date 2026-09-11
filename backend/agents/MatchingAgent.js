/**
 * MatchingAgent — Computes job-resume similarity
 * Uses existing KeywordExtractor + MatchScorer tools (rule-based, NO LLM)
 * Cost-efficient: purely algorithmic computation
 */
const ToolRegistry = require('../agent/ToolRegistry');

class MatchingAgent {
  /**
   * Match a single resume against a single job
   * @param {object} resumeData - Parsed resume from ResumeParser
   * @param {object} jobData - Must have: skills[], keywords[], title, company, requirements[]
   */
  async matchOne(resumeData, jobData) {
    // Normalize jobData to format expected by KeywordExtractor/MatchScorer
    const normalizedJobData = {
      title: jobData.title || '',
      company: jobData.company || '',
      skills: jobData.skillsRequired || jobData.skills || [],
      keywords: jobData.keywords || jobData.skillsRequired || [],
      requirements: jobData.skillsRequired || [],
      responsibilities: [],
      niceToHave: [],
      experienceYears: 0,
      educationRequired: null,
      jobType: 'onsite',
    };

    const keywordData = await ToolRegistry.executeTool('KeywordExtractor', {
      jobData: normalizedJobData,
      resumeData,
    });

    const scoreData = await ToolRegistry.executeTool('MatchScorer', {
      jobData: normalizedJobData,
      resumeData,
      keywordData,
    });

    return {
      matchScore: scoreData.totalScore || 0,
      missingSkills: [
        ...(scoreData.missingCriticalSkills || []),
        ...(scoreData.missingKeywords || []),
      ].slice(0, 8),
      strongSkills: scoreData.strongAreas || [],
      atsScoreEstimate: scoreData.breakdown?.atsScore || 0,
      breakdown: scoreData.breakdown || {},
    };
  }

  /**
   * Match resume against all scraped jobs, rank by matchScore
   * @param {object} resumeData
   * @param {object[]} jobs - Array of scraped job objects
   * @returns {object[]} ranked matches
   */
  async matchAll(resumeData, jobs) {
    const results = [];

    for (const job of jobs) {
      try {
        const matchResult = await this.matchOne(resumeData, job);
        results.push({
          job,
          ...matchResult,
        });
      } catch (err) {
        console.warn(`[MatchingAgent] Error matching "${job.title}": ${err.message}`);
        results.push({
          job,
          matchScore: 45,
          missingSkills: [],
          strongSkills: [],
          atsScoreEstimate: 50,
          breakdown: {},
        });
      }
    }

    // Sort by matchScore descending
    results.sort((a, b) => b.matchScore - a.matchScore);

    // Add rank
    return results.map((r, i) => ({ ...r, rank: i + 1 }));
  }
}

module.exports = MatchingAgent;
