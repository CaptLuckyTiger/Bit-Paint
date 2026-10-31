export class History {
  constructor(canvas) { this.canvas = canvas; this.undoStack = []; this.redoStack = []; }
  capture() { return this.canvas.snapshot(); }
  commit(before) { if (!before) return; this.undoStack.push(before); if (this.undoStack.length > 30) this.undoStack.shift(); this.redoStack = []; }
  undo() { if (!this.undoStack.length) return; this.redoStack.push(this.capture()); this.canvas.restore(this.undoStack.pop()); }
  redo() { if (!this.redoStack.length) return; this.undoStack.push(this.capture()); this.canvas.restore(this.redoStack.pop()); }
}
