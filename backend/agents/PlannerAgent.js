/**
 * PlannerAgent — Decides workflow steps and breaks tasks into subtasks
 * Rule-based (no LLM needed) — maximizes cost efficiency
 */

class PlannerAgent {
  /**
   * Creates an ordered plan given roles and resume data
   * @param {string[]} roles - Selected job roles e.g. ['SDE', 'Frontend']
   * @param {object} resumeData - Parsed resume object from ResumeParser
   * @returns {object} plan with steps array
   */
  plan(roles, resumeData) {
    const steps = [];
    const skills = resumeData.skills || [];
    const experienceYears = resumeData.totalExperienceYears || 0;

    // Step 1: Resume analysis (already done)
    steps.push({
      stepId: 1,
      name: 'resume_analysis',
      description: 'Analyze resume skills, experience, and profile',
      status: 'completed',
      agent: 'PlannerAgent',
      result: {
        skillsDetected: skills.length,
        experienceYears,
        topSkills: skills.slice(0, 8),
      },
      timestamp: new Date().toISOString(),
    });

    // Steps 2+: One scraping step per role
    roles.forEach((role, i) => {
      steps.push({
        stepId: 2 + i,
        name: `scrape_${role.toLowerCase().replace(/\s+/g, '_')}`,
        description: `Fetch job listings from Adzuna for role: ${role}`,
        status: 'pending',
        agent: 'ScraperAgent',
        role,
        targetCount: 15,
        timestamp: null,
      });
    });

    // Match step
    steps.push({
      stepId: 2 + roles.length,
      name: 'match_jobs',
      description: `Compute resume-job match scores for all fetched listings`,
      status: 'pending',
      agent: 'MatchingAgent',
      timestamp: null,
    });

    // Rank step
    steps.push({
      stepId: 3 + roles.length,
      name: 'rank_jobs',
      description: 'Rank and persist job matches by score',
      status: 'pending',
      agent: 'MatchingAgent',
      timestamp: null,
    });

    return {
      totalSteps: steps.length,
      steps,
      roles,
      plan: `Will fetch job listings across ${roles.length} role(s) [${roles.join(', ')}] via Adzuna, then compute match scores and rank results.`,
      estimatedDuration: `~${15 + roles.length * 10} seconds`,
    };
  }
}

module.exports = PlannerAgent;
