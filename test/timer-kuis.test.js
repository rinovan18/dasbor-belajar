import { html, fixture, expect } from '@open-wc/testing';
import "../lib/timer-kuis.js";

describe("TimerKuis test", () => {
  let element;
  beforeEach(async () => {
    element = await fixture(html`<timer-kuis duration="5"></timer-kuis>`);
  });

  it("basic will it blend", async () => {
    expect(element).to.exist;
  });

  it("has the expected tag", () => {
    expect(element.tagName.toLowerCase()).to.equal("timer-kuis");
  });

  it("defaults remaining to duration", () => {
    expect(element._remaining).to.equal(5);
    expect(element._running).to.equal(false);
  });

  it("start() sets running and reset() restores", async () => {
    element.start();
    expect(element._running).to.equal(true);
    element.reset();
    expect(element._running).to.equal(false);
    expect(element._remaining).to.equal(5);
  });

  it("_tick() counts down and dispatches timer-kuis-expired at zero", async () => {
    let expired = null;
    element.addEventListener("timer-kuis-expired", (e) => (expired = e.detail));
    element._remaining = 2;
    element._tick();
    expect(element._remaining).to.equal(1);
    expect(expired).to.be.null;
    element._tick();
    expect(element._remaining).to.equal(0);
    expect(element._running).to.equal(false);
    expect(expired).to.not.be.null;
    expect(expired.duration).to.equal(5);
  });

  it("passes the a11y audit", async () => {
    await expect(element).shadowDom.to.be.accessible();
  });
});
