const DEFAULT_WIDTH = 1000;
const DEFAULT_HEIGHT = 700;
export const MAX_CANVAS_DIMENSION = 8192;

export class PaintCanvas {
  constructor(canvas, onChange = () => {}) {
    this.element = canvas;
    this.context = canvas.getContext("2d", { willReadFrequently: true });
    if (!this.context) throw new Error("Canvas 2D context is not available.");
    this.onChange = onChange;
    this.resize(DEFAULT_WIDTH, DEFAULT_HEIGHT, false);
  }

  resize(width, height, preserve = true, offsetX = 0, offsetY = 0, background = "#ffffff") {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1 || width > MAX_CANVAS_DIMENSION || height > MAX_CANVAS_DIMENSION) {
      throw new RangeError(`O canvas deve ter entre 1 e ${MAX_CANVAS_DIMENSION} pixels por lado.`);
    }
    const old = preserve ? document.createElement("canvas") : null;
    if (old) { old.width = this.element.width; old.height = this.element.height; old.getContext("2d").drawImage(this.element, 0, 0); }
    this.element.width = Math.max(1, Math.round(width));
    this.element.height = Math.max(1, Math.round(height));
    this.context.setTransform(1, 0, 0, 1, 0, 0);
    if (background) {
      this.context.fillStyle = background;
      this.context.fillRect(0, 0, this.element.width, this.element.height);
    }
    if (old) this.context.drawImage(old, offsetX, offsetY);
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
