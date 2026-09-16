import { html, fixture, expect } from '@open-wc/testing';
import "../lib/latihan-kuis.js";

describe("LatihanKuis test", () => {
  let element;
  beforeEach(async () => {
    element = await fixture(html`<latihan-kuis judul-materi="Materi Uji"></latihan-kuis>`);
  });

  it("basic will it blend", async () => {
    expect(element).to.exist;
  });

  it("has the expected tag", () => {
    expect(element.tagName.toLowerCase()).to.equal("latihan-kuis");
  });

  it("shows materi + start button when logged in, no quiz yet", async () => {
    element.studentId = "u1";
    await element.updateComplete;
    expect(element._mulai).to.equal(false);
    expect(element.shadowRoot.querySelector(".materi-card")).to.exist;
    expect(element.shadowRoot.querySelector(".btn-mulai")).to.exist;
    expect(element.shadowRoot.querySelector("kuis-ledakan")).to.not.exist;
  });

  it("hides materi/kuis and shows sent message on selesai branch (logged in)", async () => {
    element.studentId = "u1";
    element._selesai = true;
    await element.updateComplete;
    expect(element.shadowRoot.querySelector(".materi-card")).to.not.exist;
    expect(element.shadowRoot.querySelector("kuis-ledakan")).to.not.exist;
    expect(element.shadowRoot.textContent).to.contain("terkirim");
  });

  it("on time expiry sets selesai and shows sent message (logged in)", async () => {
    element.studentId = "u1";
    element._onWaktuHabis();
    await element.updateComplete;
    expect(element._selesai).to.equal(true);
    expect(element.shadowRoot.querySelector(".materi-card")).to.not.exist;
    expect(element.shadowRoot.textContent).to.contain("Waktu habis");
    expect(element.shadowRoot.textContent).to.contain("terkirim");
  });

  it("passes the a11y audit", async function () {
    this.timeout(15000);
    // Login dulu agar tak menyertakan <quiz-user-auth> bersarang (scan axe lebih stabil).
    element.studentId = "u1";
    await element.updateComplete;
    await expect(element).shadowDom.to.be.accessible();
  });

  describe("status kuis (best-score / retake)", () => {
    const _origFetch = window.fetch;
    const setFetch = (fn) =>
      Object.defineProperty(window, "fetch", { value: fn, configurable: true, writable: true });
    afterEach(() => setFetch(_origFetch));

    it("allowRetake=false + sudah ikut => hard-lock (terkunci, tanpa kuis, tanpa tombol ulang)", async () => {
      element.appsScriptUrl = "https://example.com/x";
      element.studentId = "u1";
      element.kdMateri = "bab1";
      element.allowRetake = false;
      setFetch(async () => ({
        ok: true,
        json: async () => ({ status: "ok", locked: true, best: 85 }),
      }));
      await element._muatStatusKuis();
      await element.updateComplete;
      expect(element._terkunci).to.equal(true);
      expect(element._pernahIkut).to.equal(true);
      expect(element._bestSkor).to.equal(85);
      expect(element._selesai).to.equal(false);
      expect(element.shadowRoot.querySelector("kuis-ledakan")).to.not.exist;
      expect(element.shadowRoot.textContent).to.contain("85%");
      expect(element.shadowRoot.textContent).to.contain("terkunci");
      expect(element.shadowRoot.querySelector(".btn-mulai")).to.not.exist;
    });

    it("allowRetake=false + locked=false dari backend + best ada => BUKAN terkunci (backend izinkan retake)", async () => {
      element.appsScriptUrl = "https://example.com/x";
      element.studentId = "u1";
      element.kdMateri = "bab1";
      element.allowRetake = false;
      setFetch(async () => ({
        ok: true,
        json: async () => ({ status: "ok", locked: false, best: 60 }),
      }));
      await element._muatStatusKuis();
      await element.updateComplete;
      expect(element._terkunci).to.equal(false);
      expect(element._pernahIkut).to.equal(true);
      expect(element._bestSkor).to.equal(60);
      expect(element.shadowRoot.querySelector(".btn-mulai")).to.exist;
      expect(element.shadowRoot.querySelector(".skor-best")).to.exist;
      expect(element.shadowRoot.querySelector("kuis-ledakan")).to.not.exist;
    });

    it("allowRetake=false + locked tidak ada di response + best ada => BUKAN terkunci (default aman)", async () => {
      element.appsScriptUrl = "https://example.com/x";
      element.studentId = "u1";
      element.kdMateri = "bab1";
      element.allowRetake = false;
      setFetch(async () => ({
        ok: true,
        json: async () => ({ status: "ok", best: 55 }),
      }));
      await element._muatStatusKuis();
      await element.updateComplete;
      expect(element._terkunci).to.equal(false);
      expect(element._pernahIkut).to.equal(true);
      expect(element._bestSkor).to.equal(55);
      expect(element.shadowRoot.querySelector(".btn-mulai")).to.exist;
    });

    it("allowRetake=true + locked=true dari backend => tetap terkunci (backend yang menentukan)", async () => {
      element.appsScriptUrl = "https://example.com/x";
      element.studentId = "u1";
      element.kdMateri = "bab1";
      element.allowRetake = true;
      setFetch(async () => ({
        ok: true,
        json: async () => ({ status: "ok", locked: true, best: 70 }),
      }));
      await element._muatStatusKuis();
      await element.updateComplete;
      expect(element._terkunci).to.equal(true);
      expect(element._pernahIkut).to.equal(true);
      expect(element._bestSkor).to.equal(70);
      expect(element.shadowRoot.querySelector(".btn-mulai")).to.not.exist;
    });

    it("_muatStatusKuis early-return bila belum ada appsScriptUrl/studentId/kdMateri (tanpa fetch)", async () => {
      let called = false;
      setFetch(async () => {
        called = true;
        return { ok: true, json: async () => ({}) };
      });
      await element._muatStatusKuis();
      expect(called).to.equal(false);
    });

    it("belum pernah ikut (best=null, locked=false) => BUKAN terkunci, bisa mulai", async () => {
      element.appsScriptUrl = "https://example.com/x";
      element.studentId = "u1";
      element.kdMateri = "bab1";
      setFetch(async () => ({
        ok: true,
        json: async () => ({ status: "ok", locked: false, best: null }),
      }));
      await element._muatStatusKuis();
      await element.updateComplete;
      expect(element._terkunci).to.equal(false);
      expect(element._pernahIkut).to.equal(false);
      expect(element._bestSkor).to.equal(null);
      expect(element.shadowRoot.querySelector(".btn-mulai")).to.exist;
      expect(element.shadowRoot.querySelector("kuis-ledakan")).to.not.exist;
    });
  });

  describe("max-retake (batas ulangan)", () => {
    const keyFor = (s, k) => `latihan_kuis_attempt_${s}_${k}`;
    const _origFetch = window.fetch;
    const setFetch = (fn) =>
      Object.defineProperty(window, "fetch", { value: fn, configurable: true, writable: true });
    beforeEach(() => {
      element.appsScriptUrl = "https://example.com/x";
      element.studentId = "u1";
      element.kdMateri = "bab1";
      element.allowRetake = true;
      element.maxRetake = 1;
      element._attemptKe = 0;
      // Hindari fetch nyata dari _muatStatusKuis/_sendLogDirect (async continuations
      // dari klik Mulai bisa leak ke test berikutnya & menyambar setFetch milik test lain).
      setFetch(async () => ({ ok: true, json: async () => ({ status: "ok" }) }));
      try { localStorage.removeItem(keyFor("u1", "bab1")); } catch (_) {}
    });
    afterEach(() => {
      setFetch(_origFetch);
      try { localStorage.removeItem(keyFor("u1", "bab1")); } catch (_) {}
    });

    const submit = async () => {
      element._onKuisLog({ detail: { payload: { score: 80 } } });
      await element.updateComplete;
    };

    it("submit ke-1 => Ulangi muncul & localStorage attempt = 1", async () => {
      await submit();
      expect(localStorage.getItem(keyFor("u1", "bab1"))).to.equal("1");
      expect(element._attemptKe).to.equal(1);
      expect(element.shadowRoot.querySelector(".btn-mulai")).to.exist;
      expect(element.shadowRoot.textContent).to.contain("Ulangi");
    });

    it("submit ke-2 => Ulangi & Mulai tidak muncul & localStorage attempt = 2", async () => {
      await submit();
      await submit();
      expect(localStorage.getItem(keyFor("u1", "bab1"))).to.equal("2");
      expect(element._attemptKe).to.equal(2);
      // selesai-card: tombol Ulangi tertutup (counter = maxRetake+1)
      const ulangBtn = [...element.shadowRoot.querySelectorAll(".btn-mulai")]
        .find((b) => b.textContent.includes("Ulangi"));
      expect(ulangBtn).to.not.exist;
    });

    it("reload setelah ke-2 => tombol Mulai & Ulangi tertutup (counter persist)", async () => {
      await submit();
      await submit();
      // simulasi reload: baca counter dari localStorage via _loadAttemptCounter
      element._selesai = false;
      element._mulai = false;
      element._loadSession();
      element._loadAttemptCounter();
      await element.updateComplete;
      const mulaiBtn = [...element.shadowRoot.querySelectorAll(".btn-mulai")]
        .find((b) => b.textContent.includes("Mulai"));
      expect(mulaiBtn).to.not.exist;
      const ulangBtn = [...element.shadowRoot.querySelectorAll(".btn-mulai")]
        .find((b) => b.textContent.includes("Ulangi"));
      expect(ulangBtn).to.not.exist;
    });

    it("reload setelah ke-1 lalu Mulai (bukan Ulangi) => attempt ke-2, tetap tak bisa ke-3", async () => {
      // ke-1 via Ulangi
      await submit();
      element._selesai = false;
      element._mulai = false;
      element._loadAttemptCounter();
      await element.updateComplete;
      // klik Mulai (jalur reload, bukan Ulangi)
      const mulaiBtn = [...element.shadowRoot.querySelectorAll(".btn-mulai")]
        .find((b) => b.textContent.includes("Mulai"));
      expect(mulaiBtn).to.exist;
      mulaiBtn.click();
      await element.updateComplete;
      // ke-2 via submit
      await submit();
      expect(element._attemptKe).to.equal(2);
      const ulangBtn = [...element.shadowRoot.querySelectorAll(".btn-mulai")]
        .find((b) => b.textContent.includes("Ulangi"));
      expect(ulangBtn).to.not.exist;
    });

    it("login siswa lain => counter milik siswa tsb (terisolasi)", async () => {
      await submit();
      expect(localStorage.getItem(keyFor("u1", "bab1"))).to.equal("1");
      // login beda siswa (panggil handler langsung, hindari listener global menumpuk)
      element._onAuthLogin({ detail: { studentId: "u2", nama: "Budi", nis: "2", absen: "2", kelas: "X" } });
      await element.updateComplete;
      expect(element._attemptKe).to.equal(0);
      expect(element.studentId).to.equal("u2");
      expect(localStorage.getItem(keyFor("u2", "bab1"))).to.equal(null);
    });

    it("maxRetake=0 => tanpa batas (Ulangi tetap muncul setelah banyak submit)", async () => {
      element.maxRetake = 0;
      await submit();
      await submit();
      await submit();
      expect(element._attemptKe).to.equal(0); // tidak dihitung saat maxRetake=0
      const ulangBtn = [...element.shadowRoot.querySelectorAll(".btn-mulai")]
        .find((b) => b.textContent.includes("Ulangi"));
      expect(ulangBtn).to.exist;
    });
  });

  describe("anti-cheat + remidi", () => {
    beforeEach(() => {
      element.appsScriptUrl = "";
      element.studentId = "u1";
      element.kdMateri = "bab1";
      element._sendLogDirect = () => {}; // hindari network di test
    });

    describe("_effectiveRemidiMode", () => {
      it("true ketika remidiMode attribute di-set (manual)", async () => {
        element.remidiMode = true;
        element.remidiSoalUrl = "";
        element._bestSkor = null;
        expect(element._effectiveRemidiMode).to.equal(true);
      });

      it("auto-true ketika remidiSoalUrl ada + _bestSkor < kkm + belum remidi", async () => {
        element.remidiMode = false;
        element.remidiSoalUrl = "./remidi.json";
        element.kkm = 75;
        element._bestSkor = 60;
        element.sudahRemidi = false;
        expect(element._effectiveRemidiMode).to.equal(true);
      });

      it("false ketika skor >= kkm (tidak perlu remidi)", async () => {
        element.remidiMode = false;
        element.remidiSoalUrl = "./remidi.json";
        element.kkm = 75;
        element._bestSkor = 80;
        element.sudahRemidi = false;
        expect(element._effectiveRemidiMode).to.equal(false);
      });

      it("false ketika sudah remidi (hanya boleh sekali)", async () => {
        element.remidiMode = false;
        element.remidiSoalUrl = "./remidi.json";
        element.kkm = 75;
        element._bestSkor = 60;
        element.sudahRemidi = true;
        expect(element._effectiveRemidiMode).to.equal(false);
      });

      it("false ketika tidak ada remidiSoalUrl dan tidak manual", async () => {
        element.remidiMode = false;
        element.remidiSoalUrl = "";
        element.kkm = 75;
        element._bestSkor = 60;
        element.sudahRemidi = false;
        expect(element._effectiveRemidiMode).to.equal(false);
      });
    });

    describe("_cekThresholdCurang", () => {
      it("log curang_tab_switch sekali saat count >= threshold", async () => {
        element.tabSwitchThreshold = 3;
        let logCount = 0;
        element._logActivity = (tipe, payload) => {
          if (tipe === "curang_tab_switch") logCount++;
        };
        element._tabSwitchCount = 3;
        element._curangLogged = false;
        element._cekThresholdCurang();
        expect(logCount).to.equal(1);
        expect(element._curangLogged).to.equal(true);
      });

      it("tidak log lagi jika sudah pernah logged (_curangLogged=true)", async () => {
        element.tabSwitchThreshold = 3;
        let logCount = 0;
        element._logActivity = (tipe) => {
          if (tipe === "curang_tab_switch") logCount++;
        };
        element._tabSwitchCount = 5;
        element._curangLogged = true;
        element._cekThresholdCurang();
        expect(logCount).to.equal(0);
      });

      it("tidak log saat count < threshold", async () => {
        element.tabSwitchThreshold = 3;
        let logCount = 0;
        element._logActivity = (tipe) => {
          if (tipe === "curang_tab_switch") logCount++;
        };
        element._tabSwitchCount = 2;
        element._curangLogged = false;
        element._cekThresholdCurang();
        expect(logCount).to.equal(0);
        expect(element._curangLogged).to.equal(false);
      });
    });

    describe("dedup _onKuisLog (sessionToken)", () => {
      it("dispatch 2x event serupa (same sessionToken) => hanya sekali _logSelesaiKuis", async () => {
        element._sessionToken = "tok-1";
        element._sessionLogged = "";
        let selesaiCount = 0;
        element._logSelesaiKuis = () => { selesaiCount++; };
        element._kirimLogSession = () => {};

        const event = { detail: { payload: { score: 80, sessionToken: "tok-1" } } };
        element._onKuisLog(event);
        element._onKuisLog(event);

        await element.updateComplete;
        expect(selesaiCount).to.equal(1);
        expect(element._sessionLogged).to.equal("tok-1");
        expect(element._skor).to.equal(80);
      });

      it("dispatch 2x dengan sessionToken beda => _logSelesaiKuis dipanggil 2x", async () => {
        element._sessionToken = "tok-A";
        element._sessionLogged = "";
        let selesaiCount = 0;
        element._logSelesaiKuis = () => { selesaiCount++; };
        element._kirimLogSession = () => {};

        element._onKuisLog({ detail: { payload: { score: 80, sessionToken: "tok-A" } } });
        element._onKuisLog({ detail: { payload: { score: 90, sessionToken: "tok-B" } } });
        await element.updateComplete;
        expect(selesaiCount).to.equal(2);
      });
    });

    describe("dialog 3x (_warningCount, _forceChoiceDialog)", () => {
      it("_lanjutkanKuis reset _warningCount ke 0 + _forceChoiceDialog false", async () => {
        element._warningCount = 5;
        element._forceChoiceDialog = true;
        element._lanjutkanKuis();
        expect(element._warningCount).to.equal(0);
        expect(element._forceChoiceDialog).to.equal(false);
      });

      it("_kumpulkanSekarang set _forceChoiceDialog false tanpa throw bila tidak ada kuis child", async () => {
        element._forceChoiceDialog = true;
        element._kumpulkanSekarang();
        expect(element._forceChoiceDialog).to.equal(false);
      });

      it("_onVisibilityChange hidden trigger dialog saat _warningCount >= 3", async () => {
        element._mulai = true;
        element._selesai = false;
        element._warningCount = 2;
        element._forceChoiceDialog = false;
        element._logActivity = () => {};
        // simulasikan visibilityState hidden
        Object.defineProperty(document, "visibilityState", {
          configurable: true, get: () => "hidden",
        });
        element._onVisibilityChange();
        expect(element._warningCount).to.equal(3);
        expect(element._forceChoiceDialog).to.equal(true);
        Object.defineProperty(document, "visibilityState", {
          configurable: true, get: () => "visible",
        });
      });

      it("_laporKeGuru reset counter + log 'lapor_ke_guru' ke sheet", async () => {
        element._forceChoiceDialog = true;
        element._warningCount = 5;
        let loggedTipe = "";
        element._logActivity = (tipe) => { loggedTipe = tipe; };
        element._laporKeGuru();
        expect(element._forceChoiceDialog).to.equal(false);
        expect(element._warningCount).to.equal(0);
        expect(loggedTipe).to.equal("lapor_ke_guru");
      });
    });

    describe("reset anti-cheat di _mulaiLatihan", () => {
      it("_warningCount & _forceChoiceDialog dan _curangLogged di-reset ke 0/false", async () => {
        element._warningCount = 5;
        element._forceChoiceDialog = true;
        element._curangLogged = true;
        element._sessionLogged = "old";
        element._sessionToken = "old-tok";
        // _mulaiLatihan butuh appsScriptUrl? cek early guards
        element._muatStatusKuis = () => Promise.resolve();
        element._mulaiLatihan();
        await element.updateComplete;
        expect(element._warningCount).to.equal(0);
        expect(element._forceChoiceDialog).to.equal(false);
        expect(element._curangLogged).to.equal(false);
        expect(element._sessionToken).to.not.equal("old-tok");
      });
    });

    describe("start → db_aktivitas (timer_mulai)", () => {
      it("fires timer_mulai with kategori & percobaanKe when NOT latihanOnlyMode", async () => {
        element.lockAfterComplete = true; // _latihanOnlyMode = false (duration=300)
        element._attemptKe = 2;
        element.kategori = "sumatif_lm";
        element._muatStatusKuis = () => Promise.resolve();
        let capturedTipe = null;
        let capturedPayload = null;
        element._logActivity = (tipe, payload) => {
          if (tipe === "timer_mulai") {
            capturedTipe = tipe;
            capturedPayload = payload;
          }
        };
        element._mulaiLatihan();
        await element.updateComplete;
        expect(capturedTipe).to.equal("timer_mulai");
        expect(capturedPayload).to.not.be.null;
        expect(capturedPayload.kategori).to.equal("sumatif_lm");
        expect(capturedPayload.percobaanKe).to.equal(3); // attemptKe (2) + 1
        expect(capturedPayload.kdMateri).to.equal(element.kdMateri);
      });
    });
  });

  describe("hardening: id_log & key cleanup", () => {
    const _origFetch = window.fetch;
    const setFetch = (fn) =>
      Object.defineProperty(window, "fetch", { value: fn, configurable: true, writable: true });
    afterEach(() => setFetch(_origFetch));

    it("_sendLogDirect reuses id_log from payload instead of generating new", async () => {
      element.appsScriptUrl = "https://example.com/x";
      element.studentId = "u1";
      element.kdMateri = "bab1";
      let capturedUrl = "";
      setFetch(async (url) => {
        capturedUrl = url;
        return { ok: true, json: async () => ({ status: "ok" }) };
      });
      await element._sendLogDirect("selesai", { id_log: "PREDEFINED-LOG-ID", score: 80 });
      expect(capturedUrl).to.contain("id_log=PREDEFINED-LOG-ID");
    });

    it("_onKuisLog propagates id_log from event to _sendLogDirect", async () => {
      element.appsScriptUrl = "https://example.com/x";
      element.studentId = "u1";
      element.kdMateri = "bab1";
      element._sessionLogged = "";
      let captured = [];
      setFetch(async (url) => {
        captured.push(url);
        return { ok: true, json: async () => ({ status: "ok" }) };
      });
      element._logSelesaiKuis = () => {};
      element._kirimLogSession = () => {};
      element._onKuisLog({ detail: { id_log: "EVENT-LOG-123", tipe: "quiz", payload: { score: 80, sessionToken: "tok-x" } } });
      await new Promise((r) => setTimeout(r, 50));
      expect(captured.some((u) => u.includes("id_log=EVENT-LOG-123"))).to.equal(true);
    });

    it("_onKuisLog clears kuis-ledakan attempt & session keys on completion", async () => {
      element.appsScriptUrl = "https://example.com/x";
      element.studentId = "u1";
      element.kdMateri = "bab1";
      element._sessionLogged = "";
      localStorage.setItem("kuis-ledakan:attempt:u1:bab1", JSON.stringify({ start: Date.now() }));
      localStorage.setItem("kuis-ledakan:session:u1:bab1", JSON.stringify({ token: "tok" }));
      element._logSelesaiKuis = () => {};
      element._kirimLogSession = () => {};
      element._onKuisLog({ detail: { payload: { score: 80, sessionToken: "tok-x" } } });
      await element.updateComplete;
      expect(localStorage.getItem("kuis-ledakan:attempt:u1:bab1")).to.be.null;
      expect(localStorage.getItem("kuis-ledakan:session:u1:bab1")).to.be.null;
    });

    it("_onKuisLog selesai log includes security context fields", async () => {
      element.appsScriptUrl = "https://example.com/x";
      element.studentId = "u1";
      element.kdMateri = "bab1";
      element._warningCount = 3;
      element._forceChoiceDialog = true;
      element._curangLogged = true;
      element.tabSwitchThreshold = 3;
      element._sessionLogged = "";
      let capturedPayload = null;
      element._logActivity = (tipe, payload) => {
        if (tipe === "selesai") capturedPayload = payload;
      };
      element._kirimLogSession = () => {};
      element._logSelesaiKuis = () => {};
      element._onKuisLog({ detail: { payload: { score: 75, sessionToken: "tok-sec" } } });
      await element.updateComplete;
      expect(capturedPayload).to.not.equal(null);
      expect(capturedPayload.warningCount).to.equal(3);
      expect(capturedPayload.forceChoiceDialogTriggered).to.equal(true);
      expect(capturedPayload.curangTabSwitchTriggered).to.equal(true);
      expect(capturedPayload.tabSwitchThreshold).to.equal(3);
    });

    it("_kirimLogSession includes security context fields", async () => {
      element.appsScriptUrl = "https://example.com/x";
      element.studentId = "u1";
      element.kdMateri = "bab1";
      element._warningCount = 2;
      element._forceChoiceDialog = false;
      element._curangLogged = false;
      element.tabSwitchThreshold = 3;
      element._waktuMulai = Date.now();
      let capturedParams = null;
      const origFetch = window.fetch;
      window.fetch = async (url) => {
        const qs = new URL(url.toString()).searchParams;
        capturedParams = {};
        for (const [k, v] of qs.entries()) capturedParams[k] = v;
        return { ok: true, json: async () => ({ status: "ok" }) };
      };
      element._kirimLogSession("selesai");
      await new Promise((r) => setTimeout(r, 100));
      window.fetch = origFetch;
      expect(capturedParams).to.not.equal(null);
      expect(capturedParams.warningCount).to.equal("2");
      expect(capturedParams.forceChoiceDialogTriggered).to.equal("false");
      expect(capturedParams.curangTabSwitchTriggered).to.equal("false");
      expect(capturedParams.tabSwitchThreshold).to.equal("3");
    });

    it("_onAuthLogout clears kuis-ledakan attempt & session keys", () => {
      element.studentId = "u1";
      element.kdMateri = "bab1";
      localStorage.setItem("kuis-ledakan:attempt:u1:bab1", JSON.stringify({ start: Date.now() }));
      localStorage.setItem("kuis-ledakan:session:u1:bab1", JSON.stringify({ token: "tok" }));
      element._onAuthLogout();
      expect(localStorage.getItem("kuis-ledakan:attempt:u1:bab1")).to.be.null;
      expect(localStorage.getItem("kuis-ledakan:session:u1:bab1")).to.be.null;
      expect(element.studentId).to.equal("");
    });
  });

  describe("ulanganMode preset wiring", () => {
    const getKuis = () => element.shadowRoot.querySelector("kuis-ledakan");

    it("ulangan-mode enables editable + practice + hide + shuffle preset on kuis-ledakan", async () => {
      element.ulanganMode = true;
      element.studentId = "u1";
      element.kdMateri = "bab1";
      element._mulai = true;
      await element.updateComplete;
      const kk = getKuis();
      expect(kk).to.not.be.null;
      expect(kk.editable).to.equal(true);
      expect(kk.practiceMode).to.equal(true);
      expect(kk.lockAfterComplete).to.equal(true);
      expect(kk.hideConfetti).to.equal(true);
      expect(kk.hideAnswers).to.equal(true);
      expect(kk.hideScore).to.equal(true);
      expect(kk.shuffleQuestions).to.equal(true);
      expect(kk.shuffleChoices).to.equal(true);
      expect(kk.hidePauseRestart).to.equal(true);
    });

    it("explicit false props tetap memakai preset (preset adalah pilihan penulis)", async () => {
      element.ulanganMode = true;
      element.hideScore = false;
      element.shuffleQuestions = false;
      element.studentId = "u1";
      element.kdMateri = "bab1";
      element._mulai = true;
      await element.updateComplete;
      const kk = getKuis();
      expect(kk).to.not.be.null;
      // Preset hard-set saat ulangan-mode aktif
      expect(kk.hideScore).to.equal(true);
      expect(kk.shuffleQuestions).to.equal(true);
      expect(kk.editable).to.equal(true);
      expect(kk.hideAnswers).to.equal(true);
    });

    it("ulangan-mode tetap default off (tanpa preset)", async () => {
      element.studentId = "u1";
      element.kdMateri = "bab1";
      element._mulai = true;
      await element.updateComplete;
      const kk = getKuis();
      expect(kk).to.not.be.null;
      expect(kk.editable).to.equal(false);
      expect(kk.practiceMode).to.equal(false);
      expect(kk.lockAfterComplete).to.equal(false); // allowRetake default true
    });
  });
});