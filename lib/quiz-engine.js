/**
 * QuizEngine - Core quiz logic module
 * Extracted from kuis-ledakan.js for better maintainability
 * 
 * Handles: quiz start, answer submission, scoring, timing
 */

export class QuizEngine {
  constructor(host) {
    this._host = host;
    this._questionStartTime = null;
  }

  /**
   * Calculate answer timing using host's question start time
   * @returns {number} Time in milliseconds to answer
   */
  getAnswerTime() {
    if (!this._host._questionStartTime) return 0;
    return Date.now() - this._host._questionStartTime;
  }

  /**
   * Reset question timer when navigating to new question
   */
  resetQuestionTimer() {
    this._questionStartTime = Date.now();
  }

  /**
   * Validate answer timing for anti-cheating
   * @param {number} answerTime - Time in ms to answer
   * @param {number} minTime - Minimum expected time (default 3 seconds)
   * @returns {boolean} True if timing is suspicious
   */
  isSuspiciousTiming(answerTime, minTime = 3000) {
    return answerTime > 0 && answerTime < minTime;
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
   * Get answer timing data for logging
   * @returns {Object} Timing data for anti-cheating
   */
  getTimingData() {
    return {
      questionStartTime: this._questionStartTime,
      currentTime: Date.now(),
    };
  }
}
