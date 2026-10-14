// Centralized agent configuration constants
module.exports = {
  SCORE_THRESHOLD: parseInt(process.env.MATCH_SCORE_THRESHOLD) || 80,
  MAX_OPTIMIZATION_ATTEMPTS: parseInt(process.env.MAX_ITERATIONS) || 2,
  MIN_SCORE_IMPROVEMENT: parseInt(process.env.MIN_IMPROVEMENT) || 5,
};
