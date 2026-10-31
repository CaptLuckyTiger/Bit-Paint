const DEFAULT_WIDTH = 1000;
const DEFAULT_HEIGHT = 700;

export class PaintCanvas {
  constructor(canvas, onChange = () => {}) {
    this.element = canvas;
    this.context = canvas.getContext("2d", { willReadFrequently: true });
    if (!this.context) throw new Error("Canvas 2D context is not available.");
    this.onChange = onChange;
    this.resize(DEFAULT_WIDTH, DEFAULT_HEIGHT, false);
  }

  resize(width, height, preserve = true) {
    const old = preserve ? document.createElement("canvas") : null;
    if (old) { old.width = this.element.width; old.height = this.element.height; old.getContext("2d").drawImage(this.element, 0, 0); }
    this.element.width = Math.max(1, Math.round(width));
    this.element.height = Math.max(1, Math.round(height));
    this.context.fillStyle = "#ffffff";
    this.context.fillRect(0, 0, this.element.width, this.element.height);
    if (old) this.context.drawImage(old, 0, 0);
    this.onChange();
  }

  getPoint(event) {
    const bounds = this.element.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) * (this.element.width / bounds.width), y: (event.clientY - bounds.top) * (this.element.height / bounds.height) };
  }

  snapshot() { return this.context.getImageData(0, 0, this.element.width, this.element.height); }
  restore(image) { this.context.putImageData(image, 0, 0); this.onChange(); }
  notify() { this.onChange(); }
}
