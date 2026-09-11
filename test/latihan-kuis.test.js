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
    beforeEach(() => {
      element.appsScriptUrl = "https://example.com/x";
      element.studentId = "u1";
      element.kdMateri = "bab1";
      element.allowRetake = true;
      element.maxRetake = 1;
      element._attemptKe = 0;
      try { localStorage.removeItem(keyFor("u1", "bab1")); } catch (_) {}
    });
    afterEach(() => {
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
});
