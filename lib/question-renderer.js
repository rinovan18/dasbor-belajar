/**
 * QuestionRenderer - Rendering logic for different question types
 * Extracted from kuis-ledakan.js for better maintainability
 * 
 * Handles: MC, PG Kompleks, PGK, Matching, Short Answer rendering
 */

import { html } from "lit";

export class QuestionRenderer {
  /**
   * Render Multiple Choice question
   * @param {Object} soal - Question data
   * @param {Object} state - Current quiz state
   * @returns {import('lit').TemplateResult}
   */
  static renderMC(soal, state) {
    const { selected, selectedAnswers, answered, feedbackText, feedbackPositive, hideAnswers } = state;
    const isMulti = state.isMulti;
    const choices = soal.choices || [];
    const correctPositions = soal._correctMap
      ? (state.correctAnswers || []).map((i) => soal._correctMap.indexOf(i))
      : (state.correctAnswers || []);
    return html`
      <div class="choices-container">
        ${choices.map((choice, i) => {
          const isSelected = isMulti ? selectedAnswers.has(i) : selected === i;
          const isCorrect = correctPositions.includes(i);
          let cls = "choice-row";
          if (isSelected && answered && !hideAnswers) cls += isCorrect ? " correct" : " wrong";
          else if (isSelected) cls += " selected";
          const disabled = answered;
          const pilImg = state.pilihanImages && state.pilihanImages[i];
          const huruf = ["A", "B", "C", "D", "E", "F"];
          return html`
            <button
              class="${cls} ${disabled ? "disabled" : ""}"
              ?disabled=${disabled}
              @click=${() => state.onSelect(i)}
              aria-label="Pilihan ${huruf[i] || i + 1}: ${choice}"
            >${isSelected && answered && !hideAnswers && isCorrect ? "✓ " : ""}${huruf[i] || i + 1}. ${choice}
            ${pilImg ? html`<br /><img class="choice-image" src="${pilImg}" alt="Gambar pilihan ${huruf[i] || i + 1}" loading="lazy" />` : ""}
            </button>
          `;
        })}
      </div>
      ${hideAnswers ? "" : feedbackText ? html`<div class="feedback ${feedbackPositive ? 'correct' : 'wrong'}">${feedbackText}</div>` : ''}
      ${isMulti && !answered ? html`<button class="btn-submit" @click=${state.onSubmit}>Kirim Jawaban (${selectedAnswers.size} dipilih)</button>` : ''}
    `;
  }

  /**
   * Render Multiple Correct (PG Kompleks) question
   * @param {Object} soal - Question data
   * @param {Object} state - Current quiz state
   * @returns {import('lit').TemplateResult}
   */
  static renderPGKompleks(soal, state) {
    const { selectedAnswers, answered, feedbackText, feedbackPositive, hideAnswers } = state;
    const selected = selectedAnswers || new Set();
    return html`
      <div class="choices-container">
        ${soal.choices.map((choice, i) => {
          const isSelected = selected.has(i);
          const isCorrect = (soal.correctAnswers || []).includes(i);
          let cls = "choice-row multi-correct";
          if (answered && !hideAnswers) {
            if (isCorrect) cls += " correct";
            if (isSelected && !isCorrect) cls += " wrong";
          } else if (isSelected) {
            cls += " selected";
          }
          return html`
            <button
              class="${cls} ${disabled ? "disabled" : ""}"
              ?disabled=${disabled}
              @click=${() => state.onToggle(i)}
              aria-label="Pilihan ${huruf[i] || i + 1}: ${choice} ${isSelected ? "(dipilih)" : ""}"
            >${!hideAnswers && isSelected && answered && isCorrect ? "✓ " : ""}${huruf[i] || i + 1}. ${choice}
            </button>
          `;
        })}
      </div>
      ${!answered ? html`<button class="btn-submit" @click=${state.onSubmit}>Kirim Jawaban</button>` : ''}
      ${hideAnswers ? "" : feedbackText ? html`<div class="feedback ${feedbackPositive ? 'correct' : 'wrong'}">${feedbackText}</div>` : ''}
    `;
  }

  /**
   * Render PGK (Pernyataan yang Benar/Salah) question
   * @param {Object} soal - Question data
   * @param {Object} state - Current quiz state
   * @returns {import('lit').TemplateResult}
   */
  static renderPGK(soal, state) {
    const { pgkAnswers, answered, feedbackText, feedbackPositive, hideAnswers } = state;
    return html`
      <div class="pgk-container">
        ${(soal.statements || []).map((stmt, i) => {
          const currentAnswer = pgkAnswers ? pgkAnswers[i] : null;
          return html`
            <div class="pgk-statement">
              <div class="statement-text">${i + 1}. ${stmt.text}</div>
              <div class="statement-options">
                <button class="pgk-btn ${currentAnswer === true ? 'selected' : ''}" 
                  @click=${() => state.onPGK(i, true)}
                  ?disabled=${answered}>
                  ${answered && !hideAnswers && stmt.answer === true ? '✓ ' : ''}Benar
                </button>
                <button class="pgk-btn ${currentAnswer === false ? 'selected' : ''}" 
                  @click=${() => state.onPGK(i, false)}
                  ?disabled=${answered}>
                  ${answered && !hideAnswers && stmt.answer === false ? '✓ ' : ''}Salah
                </button>
              </div>
            </div>
          `;
        })}
      </div>
      ${!answered ? html`<button class="btn-submit" @click=${state.onSubmit}>Kirim Jawaban</button>` : ''}
      ${hideAnswers ? "" : feedbackText ? html`<div class="feedback ${feedbackPositive ? 'correct' : 'wrong'}">${feedbackText}</div>` : ''}
    `;
  }

  /**
   * Render Matching question
   * @param {Object} soal - Question data
   * @param {Object} state - Current quiz state
   * @returns {import('lit').TemplateResult}
   */
  static renderMatching(soal, state) {
    const { matchAnswers, answered, feedbackText, feedbackPositive, hideAnswers } = state;
    return html`
      <div class="matching-container">
        <div class="matching-left">
          ${(soal.leftItems || []).map((item, i) => html`
            <div class="match-item left">${item}</div>
          `)}
        </div>
        <div class="matching-right">
          ${(soal.rightItems || []).map((item, i) => {
            const selectedLeft = matchAnswers ? matchAnswers[i] : null;
            return html`
              <div class="match-item right ${selectedLeft !== null ? 'matched' : ''}" 
                @click=${() => state.onMatchRight(i)}>
                <span class="match-label">${item}</span>
                ${hideAnswers ? "" : selectedLeft !== null ? html`<span class="match-connector">← ${soal.leftItems[selectedLeft]}</span>` : ''}
              </div>
            `;
          })}
        </div>
      </div>
      ${!answered ? html`<button class="btn-submit" @click=${state.onSubmit}>Kirim Jawaban</button>` : ''}
      ${hideAnswers ? "" : feedbackText ? html`<div class="feedback ${feedbackPositive ? 'correct' : 'wrong'}">${feedbackText}</div>` : ''}
    `;
  }

  /**
   * Render Short Answer question
   * @param {Object} soal - Question data
   * @param {Object} state - Current quiz state
   * @returns {import('lit').TemplateResult}
   */
  static renderShortAnswer(soal, state) {
    const { shortAnswerText, answered, feedbackText, feedbackPositive, hideAnswers } = state;
    return html`
      <div class="short-answer-container">
        <input type="text" 
          class="short-answer-input"
          .value=${shortAnswerText || ''}
          @input=${(e) => state.onInput(e.target.value)}
          placeholder="Ketik jawaban Anda..."
          ?disabled=${answered}>
        ${!answered ? html`<button class="btn-submit" @click=${state.onSubmit}>Kirim Jawaban</button>` : ''}
      </div>
      ${hideAnswers ? "" : feedbackText ? html`<div class="feedback ${feedbackPositive ? 'correct' : 'wrong'}">${feedbackText}</div>` : ''}
    `;
  }
}
