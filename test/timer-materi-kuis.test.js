import { html, fixture, expect } from '@open-wc/testing';
import "../lib/timer-materi-kuis.js";

const TimerMateriKuis = customElements.get("timer-materi-kuis");

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

   it("has haxProperties with demoSchema", () => {
     const hp = TimerMateriKuis.haxProperties;
     expect(hp.demoSchema).to.exist;
     expect(hp.demoSchema.length).to.equal(2);
     expect(hp.type).to.equal("element");
     expect(hp.designSystem).to.exist;
   });

   it("haxProperties includes canScale, canPosition, canEditSource", () => {
     const hp = TimerMateriKuis.haxProperties;
     expect(hp.canScale).to.equal(true);
     expect(hp.canPosition).to.equal(true);
     expect(hp.canEditSource).to.equal(false);
   });

   it("has kdMateri and studentId properties", () => {
     const props = TimerMateriKuis.properties;
     expect(props.kdMateri).to.exist;
     expect(props.studentId).to.exist;
   });

   it("_renderTimer uses bound methods instead of arrow functions", () => {
     const renderFn = TimerMateriKuis.prototype._renderTimer;
     expect(typeof renderFn).to.equal("function");
   });

   it("passes the a11y audit", async () => {
     await expect(element).shadowDom.to.be.accessible();
   });
});
