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
    if (this.undoStack.length > 30) this.undoStack.shift();
    this.redoStack = [];
  }
  restoreState(state) {
    if (this.canvas.element.width !== state.width || this.canvas.element.height !== state.height) {
      this.canvas.resize(state.width, state.height, false);
    }
    this.canvas.restore(state.image);
  }
  undo() { if (!this.undoStack.length) return; this.redoStack.push(this.captureState()); this.restoreState(this.undoStack.pop()); }
  redo() { if (!this.redoStack.length) return; this.undoStack.push(this.captureState()); this.restoreState(this.redoStack.pop()); }
}
