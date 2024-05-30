import { css } from "./util.js";

export class ZoomController {
  constructor({ container, duration = 300, count = 3, step = 30 } = {}) {
    if (getComputedStyle(container).position !== "relative") {
      console.warn("container should be position: relative");
    }
    this._scope = document.createElement("div");
    container.append(this._scope);
    this.duration = duration;
    this.count = count;
    this.step = step;
  }

  isZooming() {
    return this._scope.getAnimations({ subtree: true }).length > 0;
  }

  async animate(from, to) {
    const t = document.timeline.currentTime;
    const times = Array.from(
      { length: this.count },
      (_, i) => i * this.step + t,
    );
    await Promise.all(
      times.map((t) => this._animateOne(from, to, t, this.duration)),
    );
  }

  async _animateOne(from, to, startTime, duration) {
    const box = this._makeBox();
    try {
      Object.assign(box.style, from);
      await Object.assign(box.animate([], {}), { startTime }).finished;
      await box.animate([from, to], { duration }).finished;
    } finally {
      box.remove();
    }
  }

  _makeBox() {
    const box = document.createElement("div");
    const shadow = box.attachShadow({ mode: "open" });
    shadow.adoptedStyleSheets.push(sheet);
    this._scope.append(box);
    return box;
  }
}

const sheet = css`
  :host {
    position: absolute;
    pointer-events: none;
    outline: 1px solid;
  }`;
