const MAX_HISTORY_ENTRIES = 30;
const MAX_HISTORY_BYTES = 128 * 1024 * 1024;

export class History {
  constructor(canvas) { this.canvas = canvas; this.undoStack = []; this.redoStack = []; }
  capture() { return this.canvas.snapshot(); }
  captureState() { return { width: this.canvas.element.width, height: this.canvas.element.height, image: this.canvas.snapshot() }; }
  commit(before) {
    if (!before) return;
    const state = before.image instanceof ImageData
      ? before
      : { width: this.canvas.element.width, height: this.canvas.element.height, image: before };
    this.undoStack.push(state);
    this.redoStack = [];
    this.trim();
  }
  restoreState(state) {
    if (this.canvas.element.width !== state.width || this.canvas.element.height !== state.height) {
      this.canvas.resize(state.width, state.height, false);
    }
    this.canvas.restore(state.image);
  }
  undo() {
    if (!this.undoStack.length) return;
    this.redoStack.push(this.captureState());
    this.restoreState(this.undoStack.pop());
    this.trim();
  }
  redo() {
    if (!this.redoStack.length) return;
    this.undoStack.push(this.captureState());
    this.restoreState(this.redoStack.pop());
    this.trim();
  }
  trim() {
    const bytes = (state) => state.width * state.height * 4;
    const entryCount = () => this.undoStack.length + this.redoStack.length;
    const totalBytes = () => [...this.undoStack, ...this.redoStack].reduce((sum, state) => sum + bytes(state), 0);
    while (entryCount() > MAX_HISTORY_ENTRIES || (totalBytes() > MAX_HISTORY_BYTES && entryCount() > 1)) {
      if (this.undoStack.length > 1) this.undoStack.shift();
      else if (this.redoStack.length > 1) this.redoStack.shift();
      else break;
    }
  }
}
