/**
 * ScoreCalculator - Scoring and result calculation
 * Extracted from kuis-ledakan.js for better maintainability
 * 
 * Handles: score calculation, result submission, leaderboard
 */

export class ScoreCalculator {
  /**
   * Calculate total score percentage
   * @param {number} score - Current score
   * @param {number} maxPoints - Maximum possible points
   * @returns {number} Percentage (0-100)
   */
  static calculatePercentage(score, maxPoints) {
    if (!maxPoints || maxPoints === 0) return 0;
    return Math.round((score / maxPoints) * 100);
  }

  /**
   * Format score for display
   * @param {number} score - Score value
   * @param {number} maxPoints - Maximum points
   * @returns {string} Formatted score string
   */
  static formatScore(score, maxPoints) {
    const pct = this.calculatePercentage(score, maxPoints);
    return `${score}/${maxPoints} (${pct}%)`;
  }

  /**
   * Check if score meets KKM (minimum passing grade)
   * @param {number} score - Score value
   * @param {number} maxPoints - Maximum points
   * @param {number} kkm - Minimum passing grade
   * @returns {boolean} True if passed
   */
  static hasPassed(score, maxPoints, kkm = 70) {
    const pct = this.calculatePercentage(score, maxPoints);
    return pct >= kkm;
  }

  /**
   * Calculate score based on answer correctness
   * @param {boolean} isCorrect - Whether answer is correct
   * @param {number} points - Points for this question
   * @returns {number} Score to add
   */
  calculateScore(isCorrect, points = 1) {
    return isCorrect ? points : 0;
  }

  /**
   * Prepare result data for submission
   * @param {Object} quizData - Quiz data
   * @returns {Object} Formatted result data
   */
  static prepareSubmission(quizData) {
    const { studentId, kdMateri, kategori, judul, score, maxPoints, answerTimings } = quizData;
    return {
      student_id: studentId,
      kd_materi: kdMateri,
      kategori: kategori || 'sumatif_lm',
      metadata_kuis: judul,
      skor: score,
      skor_maks: maxPoints,
      persentase: this.calculatePercentage(score, maxPoints),
      timestamp: new Date().toISOString(),
      answer_timings: answerTimings || [],
    };
  }

  /**
   * Get score grade based on percentage
   * @param {number} percentage - Score percentage
   * @returns {string} Grade letter
   */
  static getGrade(percentage) {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'E';
  }

  /**
   * Check if score needs remediation
   * @param {number} percentage - Score percentage
   * @param {number} kkm - Minimum passing grade
   * @returns {boolean} True if needs remediation
   */
  static needsRemediation(percentage, kkm = 70) {
    return percentage < kkm;
  }
}