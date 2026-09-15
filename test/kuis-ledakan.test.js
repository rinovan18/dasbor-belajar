import { html, fixture, expect } from '@open-wc/testing';
import "../lib/kuis-ledakan.js";

describe("KuisLedakan test", () => {
  let element;
  beforeEach(async () => {
    globalThis.localStorage.removeItem("kuis-ledakan:soal:Pertemuan 1");
    element = await fixture(html`
      <kuis-ledakan
        judul="Evaluasi Kuis Interaktif"
        mode="siswa"
        kd-materi="Pertemuan 1"
      ></kuis-ledakan>
    `);
  });

  it("basic will it blend", async () => {
    expect(element).to.exist;
  });

  it("has the expected tag", () => {
    expect(element.tagName.toLowerCase()).to.equal("kuis-ledakan");
  });

  it("defaults to the start screen", () => {
    expect(element._screen).to.equal("start");
    expect(element.judul).to.equal("Evaluasi Kuis Interaktif");
    expect(element.questions.length).to.be.greaterThan(0);
  });

  it("starts the quiz and advances to question screen", async () => {
    element._startQuiz();
    expect(element._screen).to.equal("question");
    expect(element._currentIdx).to.equal(0);
  });

  it("scores a correct answer", async () => {
    element._startQuiz();
    const soal = element.questions[0];
    element._pilihJawaban(1, soal.k);
    expect(element._score).to.equal(1);
  });

  it("dispatches dasbor-kuis-log on completion", async () => {
    let logged = null;
    element.addEventListener("dasbor-kuis-log", (e) => (logged = e.detail));
    element.questions = [{ q: "Test?", a: "1", b: "2", c: "3", k: "a" }];
    element._startQuiz();
    element._pilihJawaban(0, "a");
    element._selesaiKuis();
    expect(logged).to.not.be.null;
    expect(logged.tipe).to.equal("quiz");
    expect(logged.payload.score).to.equal(100);
  });

  it("forwards kdMateri & kategori in dasbor-kuis-log payload", async () => {
    let logged = null;
    element.addEventListener("dasbor-kuis-log", (e) => (logged = e.detail));
    element.kdMateri = "Latihan-1";
    element.kategori = "formatif";
    element.questions = [{ q: "Test?", a: "1", b: "2", c: "3", k: "a" }];
    element._startQuiz();
    element._pilihJawaban(0, "a");
    element._selesaiKuis();
    expect(logged.payload.kdMateri).to.equal("Latihan-1");
    expect(logged.payload.kategori).to.equal("formatif");
    expect(element.kategori).to.equal("formatif");
  });

  it("sends kategori & kdMateri as standalone logActivity params", async () => {
    let captured = null;
    const origFetch = globalThis.fetch;
    globalThis.fetch = (url) => {
      captured = url;
      return Promise.resolve({ text: () => Promise.resolve('{"status":"ok"}') });
    };
    element.appsScriptUrl = "https://example.com/exec";
    element.studentId = "STD-1";
    element.kdMateri = "LM-X";
    element.kategori = "formatif";
    element._kirimHasilLangsung("LOG-TEST-1", 100);
    await new Promise((r) => setTimeout(r, 0));
    globalThis.fetch = origFetch;
    expect(captured).to.not.be.null;
    expect(captured).to.contain("kategori=formatif");
    expect(captured).to.contain("kdMateri=LM-X");
    expect(captured).to.contain("action=logActivity");
  });

  it("passes the a11y audit", async () => {
    await expect(element).shadowDom.to.be.accessible();
  });

  it("scores PGK per statement (1 poin per pernyataan benar)", async () => {
    element.questions = [
      {
        type: "pgk",
        question: "Pernyataan berikut benar?",
        statements: [
          { text: "Jakarta ibu kota RI", answer: true },
          { text: "Mars planet terdekat", answer: false },
          { text: "7 x 8 = 56", answer: true },
        ],
      },
    ];
    element._startQuiz();
    expect(element._maxPoints).to.equal(3);
    element._matchAnswers = { 0: true, 1: true, 2: true };
    element._submitPGK();
    expect(element._score).to.equal(2);
  });

  it("scores matching per pair (1 poin per pasangan benar)", async () => {
    element.questions = [
      {
        type: "matching",
        question: "Jodohkan!",
        leftItems: ["Kucing", "Anjing"],
        rightItems: ["Mengeong", "Menggonggong"],
        correctPairs: { 0: 0, 1: 1 },
      },
    ];
    element._startQuiz();
    expect(element._maxPoints).to.equal(2);
    element._matchAnswers = { 0: 0, 1: 0 };
    element._submitMatching();
    expect(element._score).to.equal(1);
  });

  it("hideScore menyembunyikan angka skor (layar soal & hasil)", async () => {
    element.hideScore = true;
    element._startQuiz();
    await element.updateComplete;
    expect(element.shadowRoot.textContent).to.not.contain("Skor Berjalan");
    element._currentIdx = element.questions.length - 1;
    element._selesaiKuis();
    await element.updateComplete;
    expect(element.shadowRoot.textContent).to.not.match(/\d+%/);
    expect(element.shadowRoot.textContent).to.contain("Kuis Selesai Dikerjakan!");
  });

  it("renders choice images when choices berbentuk {text,image}", async () => {
    element.questions = [
      {
        question: "Pilih gambar benar",
        choices: [
          { text: "Merah", image: "https://example.com/merah.png" },
          { text: "Biru", image: "https://example.com/biru.png" },
        ],
        correctIndex: 0,
      },
    ];
    element._startQuiz();
    await element.updateComplete;
    const imgs = element.shadowRoot.querySelectorAll("img.choice-image");
    expect(imgs.length).to.equal(2);
    expect(imgs[0].getAttribute("src")).to.equal("https://example.com/merah.png");
  });

  it("editor: open, add question, and save dispatches questions-changed", async () => {
    element._openEditor();
    expect(element._screen).to.equal("editor");
    const before = element._tempQuestions.length;
    element._tempQuestionText = "Soal baru?";
    element._tempChoice0 = "A";
    element._tempChoice1 = "B";
    element._tempCorrectIndex = "0";
    element._addQuestion();
    expect(element._tempQuestions.length).to.equal(before + 1);

    let changed = null;
    element.addEventListener("questions-changed", (e) => (changed = e.detail));
    element._saveAll();
    expect(changed).to.not.be.null;
    expect(element.questions[element.questions.length - 1].question).to.equal("Soal baru?");
    expect(element._screen).to.equal("start");
  });

  it("imports soal via _parseImported with wrapper & all tipe AKM", async () => {
    element._parseImported(JSON.stringify({
      questions: [
        { question: "Ibukota?", choices: ["Jakarta", "Bandung"], correctIndex: 0 },
        { q: "2+2?", a: "3", b: "4", c: "5", k: "b" },
        { type: "pgk", question: "Pernyataan?", statements: [{ text: "A", answer: true }, { text: "B", answer: false }] },
        { type: "matching", question: "Pasangkan", leftItems: ["1", "2"], rightItems: ["Satu", "Dua"], correctPairs: { 0: 1, 1: 0 } },
        { type: "shortAnswer", question: "Sebutkan", acceptedAnswers: ["surya", "angin"] },
        { question: "" },
      ],
    }));
    expect(element._tempQuestions.length).to.equal(5);
    expect(element._importStatus).to.contain("5 soal diimpor");
    const mc = element._tempQuestions[0];
    expect(mc.type).to.equal("mc");
    expect(mc.correctIndex).to.equal(0);
    const legacy = element._tempQuestions[1];
    expect(legacy.choices.length).to.equal(3);
    expect(legacy.correctIndex).to.equal(1);
  });

  it("impor rusak (invalid JSON) tidak crash & set status", async () => {
    element._parseImported("{ bukan json");
    expect(element._importStatus).to.contain("Format JSON tidak valid");
  });

  it("impor kosong/tanpa soal valid set status", async () => {
    element._parseImported("[]");
    expect(element._importStatus).to.contain("Tidak ada soal valid");
  });

  it("editor PGK visual: _tempStatements dipakai di add & edit tanpa JSON", async () => {
    element._openEditor();
    element._tempQuestionText = "Pernyataan?";
    element._tempQuestionType = "pgk";
    element._tempStatements = [
      { text: "Jakarta ibukota", answer: true },
      { text: "Mars terdekat", answer: false },
    ];
    element._addQuestion();
    const pgk = element._tempQuestions[element._tempQuestions.length - 1];
    expect(pgk.statements.length).to.equal(2);
    expect(pgk.statements[0].answer).to.equal(true);

    element._startEditQuestion(element._tempQuestions.length - 1);
    expect(element._tempStatements.length).to.equal(2);
    element._tempStatements = [...element._tempStatements, { text: "7x8=56", answer: true }];
    element._saveEditQuestion();
    const edited = element._tempQuestions[element._tempQuestions.length - 1];
    expect(edited.statements.length).to.equal(3);
  });

  it("editor matching: _syncCorrectPairs menjaga index valid", async () => {
    const pairs = element._syncCorrectPairs({ 0: 3, 1: 0 }, 2, 2);
    expect(pairs[0]).to.equal(0);
    expect(pairs[1]).to.equal(0);
    const pairs2 = element._syncCorrectPairs({ 0: 1, 1: 0 }, 2, 3);
    expect(pairs2[0]).to.equal(1);
  });

  it("timer-duration > 0 merender <timer-kuis> di layar soal", async () => {
    element.questions = [{ q: "1+1?", a: "2", b: "3", k: "a" }];
    element.timerDuration = 60;
    element.timerAutostart = false;
    element._startQuiz();
    await element.updateComplete;
    const timer = element.shadowRoot.querySelector("timer-kuis");
    expect(timer).to.not.be.null;
    expect(timer.getAttribute("duration")).to.equal("60");
  });

  it("mencegah re-submit: _submitShortAnswer hanya hitung sekali", async () => {
    element.questions = [{ type: "shortAnswer", question: "Ibu kota?", acceptedAnswers: ["jakarta"] }];
    element._startQuiz();
    expect(element._screen).to.equal("question");
    // Jawaban pertama (benar)
    element._shortAnswerText = "jakarta";
    element._submitShortAnswer();
    expect(element._score).to.equal(1);
    // Coba submit lagi dengan jawaban sama
    element._shortAnswerText = "jakarta";
    element._submitShortAnswer();
    // Score TIDAK boleh naik
    expect(element._score).to.equal(1);
  });

  it("mencegah re-submit: _submitPGK hanya hitung sekali", async () => {
    element.questions = [
      {
        type: "pgk",
        question: "Pernyataan?",
        statements: [{ text: "A", answer: true }, { text: "B", answer: false }],
      },
    ];
    element._startQuiz();
    element._matchAnswers = { 0: true, 1: false };
    element._submitPGK();
    expect(element._score).to.equal(2);
    // Coba submit lagi
    element._matchAnswers = { 0: true, 1: false };
    element._submitPGK();
    // Score TIDAK boleh naik
    expect(element._score).to.equal(2);
  });

  it("mencegah re-submit: _submitMatching hanya hitung sekali", async () => {
    element.questions = [
      {
        type: "matching",
        question: "Pasangkan",
        leftItems: ["Kucing", "Anjing"],
        rightItems: ["Mengeong", "Menggonggong"],
        correctPairs: { 0: 0, 1: 1 },
      },
    ];
    element._startQuiz();
    element._matchAnswers = { 0: 0, 1: 1 };
    element._submitMatching();
    expect(element._score).to.equal(2);
    // Coba submit lagi
    element._matchAnswers = { 0: 0, 1: 1 };
    element._submitMatching();
    // Score TIDAK boleh naik
    expect(element._score).to.equal(2);
  });

  describe("anti-cheat: periodic auto-save", () => {
    afterEach(() => {
      if (element._autoSaveInterval) {
        clearInterval(element._autoSaveInterval);
        element._autoSaveInterval = null;
      }
      try { localStorage.removeItem(element._attemptKey()); } catch (_) {}
    });

    it("_startQuiz sets _autoSaveInterval", async () => {
      element.lockAfterComplete = true;
      element.studentId = "STD-1";
      element.kdMateri = "Pertemuan 1";
      element._startQuiz();
      expect(element._autoSaveInterval).to.not.be.null;
      // setInterval returns number in browser, Timeout object in Node
      expect(element._autoSaveInterval).to.be.ok;
    });

    it("_selesaiKuis clears _autoSaveInterval", async () => {
      element.lockAfterComplete = true;
      element.studentId = "STD-1";
      element.kdMateri = "Pertemuan 1";
      element.questions = [{ q: "Test?", a: "1", b: "2", k: "a" }];
      element._startQuiz();
      expect(element._autoSaveInterval).to.not.be.null;
      element._pilihJawaban(0, "a");
      element._selesaiKuis();
      expect(element._autoSaveInterval).to.be.null;
    });

    it("_bukaKunci clears _autoSaveInterval", async () => {
      element.lockAfterComplete = true;
      element.studentId = "STD-1";
      element.kdMateri = "Pertemuan 1";
      element._startQuiz();
      expect(element._autoSaveInterval).to.not.be.null;
      element.appsScriptUrl = "https://example.com/exec";
      await element._bukaKunci();
      expect(element._autoSaveInterval).to.be.null;
    });
  });
});