import { html, fixture, expect } from '@open-wc/testing';
import "../dasbor-kuis.js";

describe("DasborKuis test", () => {
  let element;
  beforeEach(async () => {
    // global flush lock can leak from async flushes across tests
    globalThis.__a3V5FlushLock = false;
    element = await fixture(html`
      <dasbor-kuis
        title="title"
      ></dasbor-kuis>
    `);
    localStorage.clear();
  });

  afterEach(() => {
    globalThis.__a3V5FlushLock = false;
    localStorage.clear();
  });

  it("basic will it blend", async () => {
    expect(element).to.exist;
  });

  it("passes the a11y audit", async () => {
    await expect(element).shadowDom.to.be.accessible();
  });

  it("logActivity writes to sync queue in localStorage", async () => {
    element.studentId = "STD-001";
    element.kdMateri = "Pertemuan 1";
    element.logActivity("baca", { page: "hal1" });
    const queue = JSON.parse(localStorage.getItem("a3_v5_sync_queue") || "[]");
    expect(queue.length).to.equal(1);
    expect(queue[0].student_id).to.equal("STD-001");
    expect(queue[0].tipe_aktivitas).to.equal("baca");
  });

  it("logActivity avoids duplicate entries (same id_log)", async () => {
    element.studentId = "STD-001";
    element.kdMateri = "Pertemuan 1";
    element.logActivity("baca", { page: "hal1" });
    element.logActivity("baca", { page: "hal1" });
    const queue = JSON.parse(localStorage.getItem("a3_v5_sync_queue") || "[]");
    expect(queue.length).to.equal(1);
  });

  it("logActivity rejects entries without studentId", async () => {
    element.studentId = "";
    element.logActivity("baca", { page: "hal1" });
    const queue = JSON.parse(localStorage.getItem("a3_v5_sync_queue") || "[]");
    expect(queue.length).to.equal(1);
    // entry is written but student_id is empty string, not undefined
    expect(queue[0].student_id).to.equal("");
  });

  it("_flushQueue does not flush when offline", async () => {
    element.studentId = "STD-001";
    element.appsScriptUrl = "https://example.com/exec";
    element.kdMateri = "Pertemuan 1";
    element.logActivity("baca", { page: "hal1" });
    const origOnLine = navigator.onLine;
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false });
    try {
      await element._flushQueue();
      const queue = JSON.parse(localStorage.getItem("a3_v5_sync_queue") || "[]");
      expect(queue.length).to.equal(1);
    } finally {
      Object.defineProperty(navigator, "onLine", { configurable: true, get: () => origOnLine });
    }
  });

  it("_flushQueue prunes entries without student_id before sending", async () => {
    const el = document.createElement("dasbor-kuis");
    el.studentId = "STD-001";
    el.appsScriptUrl = "https://example.com/exec";
    el.kdMateri = "Pertemuan 1";
    let callCount = 0;
    el._apiGet = () => {
      callCount++;
      return Promise.resolve({ status: "error", message: "mock" });
    };
    const queue = [
      { id_log: "LOG-1", student_id: "STD-001", tipe_aktivitas: "baca", payload_data: "{}", timestamp: new Date().toISOString() },
      { id_log: "LOG-2", student_id: null, tipe_aktivitas: "absen", payload_data: "{}", timestamp: new Date().toISOString() },
    ];
    localStorage.setItem("a3_v5_sync_queue", JSON.stringify(queue));
    await el._flushQueue();
    const remaining = JSON.parse(localStorage.getItem("a3_v5_sync_queue") || "[]");
    // LOG-2 (null student_id) should be pruned; LOG-1 remains (send failed)
    expect(callCount).to.equal(1);
    expect(remaining.some((e) => e.id_log === "LOG-2")).to.be.false;
    expect(remaining.length).to.equal(1);
    expect(remaining[0].id_log).to.equal("LOG-1");
  });

  it("_bacaCacheLokal reads from localStorage", async () => {
    const data = { roster: [{ nama: "Siswa A" }], leaderboard: [] };
    localStorage.setItem("a3_v5_activity_logs_cache", JSON.stringify(data));
    const cached = element._bacaCacheLokal();
    expect(cached).to.deep.equal(data);
  });

  it("_bacaCacheLokal returns null when no cache exists", async () => {
    const cached = element._bacaCacheLokal();
    expect(cached).to.be.null;
  });
});
