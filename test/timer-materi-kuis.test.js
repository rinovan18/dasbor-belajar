import { html, fixture, expect } from '@open-wc/testing';
import "../lib/timer-materi-kuis.js";

describe("TimerMateriKuis test", () => {
  let element;
  beforeEach(async () => {
    element = await fixture(html`
      <timer-materi-kuis durasi-materi="5" durasi-kuis="5"></timer-materi-kuis>
    `);
  });

  it("basic will it blend", async () => {
    expect(element).to.exist;
  });

  it("has the expected tag", () => {
    expect(element.tagName.toLowerCase()).to.equal("timer-materi-kuis");
  });

  it("initializes both timers from durations", () => {
    expect(element._sisaMateri).to.equal(5);
    expect(element._sisaKuis).to.equal(5);
    expect(element._jalanMateri).to.equal(false);
    expect(element._jalanKuis).to.equal(false);
  });

  it("start()/reset() work per phase independently", async () => {
    element.start("materi");
    element.start("kuis");
    expect(element._jalanMateri).to.equal(true);
    expect(element._jalanKuis).to.equal(true);
    element.reset("materi");
    expect(element._jalanMateri).to.equal(false);
    expect(element._sisaMateri).to.equal(5);
    expect(element._jalanKuis).to.equal(true);
    element.reset("kuis");
    expect(element._sisaKuis).to.equal(5);
  });

  it("_tick() decrements materi and dispatches timer-materi-expired", async () => {
    let materi = null;
    element.addEventListener("timer-materi-expired", (e) => (materi = e.detail));
    element._jalanMateri = true;
    element._sisaMateri = 1;
    element._tick("materi");
    expect(element._sisaMateri).to.equal(0);
    expect(materi).to.not.be.null;
    expect(materi.phase).to.equal("materi");
  });

  it("_tick() decrements kuis and dispatches timer-kuis-expired", async () => {
    let kuis = null;
    element.addEventListener("timer-kuis-expired", (e) => (kuis = e.detail));
    element._jalanKuis = true;
    element._sisaKuis = 1;
    element._tick("kuis");
    expect(element._sisaKuis).to.equal(0);
    expect(kuis).to.not.be.null;
    expect(kuis.phase).to.equal("kuis");
  });

  it("passes the a11y audit", async () => {
    await expect(element).shadowDom.to.be.accessible();
  });
});
