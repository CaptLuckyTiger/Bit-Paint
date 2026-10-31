import { PaintCanvas } from "./canvas.js";
import { setupColors } from "./colors.js";
import { setupDrawing } from "./drawing.js";
import { History } from "./history.js";
import { setupFileManager } from "./file-manager.js";

const $ = (selector) => document.querySelector(selector);
const canvas = new PaintCanvas($("#paint-canvas"));
canvas.onChange = updateCanvasStatus;
const overlay = $("#selection-overlay");
const overlayContext = overlay.getContext("2d");
const textEditor = $("#text-editor");
const textInput = textEditor.querySelector("textarea");
const textGrip = textEditor.querySelector(".text-editor-grip");
const textResize = textEditor.querySelector(".text-editor-resize");
const history = new History(canvas);
const colors = setupColors({ picker: $("#primary-color"), palette: $("#palette"), primaryPreview: $("#primary-color-preview"), secondaryPreview: $("#secondary-color-preview") });
let tool = "pencil"; let zoom = 100; let selected = null; let clipboard = null;
let textState = null;
let textInteraction = null;
const toolNames = { pencil: "Lápis", brush: "Pincel", eraser: "Borracha", line: "Linha", rectangle: "Retângulo", "round-rectangle": "Retângulo arredondado", ellipse: "Elipse", triangle: "Triângulo", diamond: "Losango", star: "Estrela", arrow: "Seta", speech: "Balão", fill: "Preencher", picker: "Conta-gotas", text: "Texto", select: "Selecionar" };
function updateCanvasStatus() { $("#canvas-size").textContent = `${canvas.element.width} × ${canvas.element.height}`; }
function renderSelection(value = selected) {
  overlay.width = canvas.element.width;
  overlay.height = canvas.element.height;
  overlayContext.clearRect(0, 0, overlay.width, overlay.height);
  if (!value || value.width < 1 || value.height < 1) return;
  overlayContext.save();
  overlayContext.setLineDash([6, 4]);
  overlayContext.lineWidth = 1;
  overlayContext.strokeStyle = "#ffffff";
  overlayContext.strokeRect(value.x, value.y, value.width, value.height);
  overlayContext.lineDashOffset = 5;
  overlayContext.strokeStyle = "#2563eb";
  overlayContext.strokeRect(value.x, value.y, value.width, value.height);
  overlayContext.setLineDash([]);
  overlayContext.fillStyle = "#ffffff";
  overlayContext.strokeStyle = "#2563eb";
  [[value.x, value.y], [value.x + value.width / 2, value.y], [value.x + value.width, value.y],
    [value.x, value.y + value.height / 2], [value.x + value.width, value.y + value.height / 2],
    [value.x, value.y + value.height], [value.x + value.width / 2, value.y + value.height], [value.x + value.width, value.y + value.height]]
    .forEach(([x, y]) => { overlayContext.fillRect(x - 3, y - 3, 6, 6); overlayContext.strokeRect(x - 3, y - 3, 6, 6); });
  overlayContext.restore();
}
function setZoom(value) { zoom = Math.max(25, Math.min(300, value)); canvas.element.style.width = `${canvas.element.width * zoom / 100}px`; $("#zoom-value").textContent = `${zoom}%`; }
function setTool(value) { tool = value; $("#current-tool").textContent = toolNames[value]; document.querySelectorAll(".tool-button").forEach((button) => { const active = button.dataset.tool === value; button.classList.toggle("is-selected", active); button.setAttribute("aria-pressed", String(active)); }); canvas.element.style.cursor = value === "text" ? "text" : "crosshair"; }
function options() { return { filled: $("#shape-fill").checked, brushType: $("#brush-type").value, fontFamily: $("#font-family").value, fontSize: Number($("#font-size").value), bold: $("#font-bold").checked, italic: $("#font-italic").checked }; }
function commit() { history.commit(before); before = null; }
function textFont(value) { return `${value.italic ? "italic " : ""}${value.bold ? "bold " : ""}${value.fontSize}px ${value.fontFamily}`; }
function updateTextEditorSize() {
  textInput.style.height = "auto";
  textInput.style.height = `${Math.max(46, textInput.scrollHeight)}px`;
}
function openTextEditor(point) {
  if (textState) finishTextEditor(false);
  before = canvas.snapshot();
  textState = { point, options: { ...options() }, color: colors.getPrimaryColor() };
  const bounds = canvas.element.getBoundingClientRect();
  const frame = canvas.element.parentElement.getBoundingClientRect();
  const scale = bounds.width / canvas.element.width;
  textEditor.hidden = false;
  textEditor.style.left = `${(point.x * scale) + (bounds.left - frame.left)}px`;
  textEditor.style.top = `${(point.y * scale) + (bounds.top - frame.top)}px`;
  textEditor.style.width = `${Math.max(180, 260 * scale)}px`;
  textEditor.style.height = "auto";
  textInput.value = "";
  textInput.style.font = textFont({ ...textState.options, fontSize: textState.options.fontSize * scale });
  textInput.style.color = textState.color;
  updateTextEditorSize();
  textInput.focus();
}
function finishTextEditor(apply) {
  if (!textState) return;
  const state = textState;
  const value = textInput.value;
  textEditor.hidden = true;
  textState = null;
  if (!apply || !value.trim()) { before = null; return; }
  const scale = canvas.element.getBoundingClientRect().width / canvas.element.width;
  const lineHeight = state.options.fontSize * 1.2;
  const maxWidth = textInput.clientWidth / scale;
  canvas.context.save();
  canvas.context.fillStyle = state.color;
  canvas.context.font = textFont(state.options);
  const lines = [];
  value.split("\n").forEach((line) => {
    let current = "";
    line.split(" ").forEach((word) => {
      const candidate = current ? `${current} ${word}` : word;
      if (current && canvas.context.measureText(candidate).width > maxWidth) {
        lines.push(current);
        current = word;
      } else current = candidate;
    });
    lines.push(current);
  });
  lines.forEach((line, index) => canvas.context.fillText(line, state.point.x, state.point.y + state.options.fontSize + index * lineHeight));
  canvas.context.restore();
  canvas.notify();
  commit();
  if (scale < 0) textInput.style.transform = "";
}
function applyFilter(name, amount = 0) {
  const image = canvas.snapshot();
  const data = image.data;
  for (let index = 0; index < data.length; index += 4) {
    const red = data[index]; const green = data[index + 1]; const blue = data[index + 2];
    if (name === "grayscale") {
      const value = Math.round(red * .299 + green * .587 + blue * .114);
      data[index] = value; data[index + 1] = value; data[index + 2] = value;
    } else if (name === "invert") {
      data[index] = 255 - red; data[index + 1] = 255 - green; data[index + 2] = 255 - blue;
    } else if (name === "sepia") {
      data[index] = Math.min(255, Math.round(red * .393 + green * .769 + blue * .189));
      data[index + 1] = Math.min(255, Math.round(red * .349 + green * .686 + blue * .168));
      data[index + 2] = Math.min(255, Math.round(red * .272 + green * .534 + blue * .131));
    } else if (name === "brightness") {
      data[index] = Math.max(0, Math.min(255, red + amount));
      data[index + 1] = Math.max(0, Math.min(255, green + amount));
      data[index + 2] = Math.max(0, Math.min(255, blue + amount));
    } else if (name === "contrast") {
      const factor = (259 * (amount + 255)) / (255 * (259 - amount));
      data[index] = Math.max(0, Math.min(255, factor * (red - 128) + 128));
      data[index + 1] = Math.max(0, Math.min(255, factor * (green - 128) + 128));
      data[index + 2] = Math.max(0, Math.min(255, factor * (blue - 128) + 128));
    }
  }
  canvas.context.putImageData(image, 0, 0);
  canvas.notify();
}
let before = null;
document.querySelectorAll(".tool-button").forEach((button) => button.addEventListener("click", () => setTool(button.dataset.tool)));
$("#brush-size").addEventListener("input", () => { const text = `${$("#brush-size").value} px`; $("#brush-size-value").textContent = text; $("#current-size").textContent = text; });
setupDrawing({ paintCanvas: canvas, getTool: () => tool, getColor: colors.getPrimaryColor, getSize: () => Number($("#brush-size").value), getOptions: options, onCursorMove: (point) => { $("#cursor-position").textContent = point ? `${Math.round(point.x)}, ${Math.round(point.y)}` : "—"; }, onBegin: () => { before = canvas.snapshot(); }, onCommit: commit, onPickColor: (data) => colors.setPrimary(`#${[data[0], data[1], data[2]].map((value) => value.toString(16).padStart(2, "0")).join("")}`), onSelection: (value) => { selected = value; renderSelection(); }, onTextStart: openTextEditor });
textInput.addEventListener("input", updateTextEditorSize);
textEditor.querySelector('[data-text-action="confirm"]').addEventListener("click", () => finishTextEditor(true));
textEditor.querySelector('[data-text-action="cancel"]').addEventListener("click", () => finishTextEditor(false));
textInput.addEventListener("keydown", (event) => {
  if (event.key === "Escape") { event.preventDefault(); finishTextEditor(false); }
  if (event.key === "Enter" && event.ctrlKey) { event.preventDefault(); finishTextEditor(true); }
});
function beginTextInteraction(event, type) {
  if (!textState) return;
  event.preventDefault();
  event.stopPropagation();
  const rect = textEditor.getBoundingClientRect();
  textInteraction = {
    type,
    startX: event.clientX,
    startY: event.clientY,
    left: textEditor.offsetLeft,
    top: textEditor.offsetTop,
    width: textEditor.offsetWidth,
    height: textEditor.offsetHeight
  };
  if (event.isTrusted) event.currentTarget.setPointerCapture(event.pointerId);
}
textGrip.addEventListener("pointerdown", (event) => beginTextInteraction(event, "move"));
textResize.addEventListener("pointerdown", (event) => beginTextInteraction(event, "resize"));
textEditor.addEventListener("pointermove", (event) => {
  if (!textInteraction || !textState) return;
  const dx = event.clientX - textInteraction.startX;
  const dy = event.clientY - textInteraction.startY;
  const frame = canvas.element.parentElement.getBoundingClientRect();
  if (textInteraction.type === "move") {
    textEditor.style.left = `${Math.max(0, Math.min(frame.width - textEditor.offsetWidth, textInteraction.left + dx))}px`;
    textEditor.style.top = `${Math.max(0, Math.min(frame.height - textEditor.offsetHeight, textInteraction.top + dy))}px`;
    const scale = canvas.element.getBoundingClientRect().width / canvas.element.width;
    textState.point.x = textEditor.offsetLeft / scale;
    textState.point.y = textEditor.offsetTop / scale;
  } else {
    textEditor.style.width = `${Math.max(150, textInteraction.width + dx)}px`;
    textEditor.style.height = `${Math.max(92, textInteraction.height + dy)}px`;
  }
  updateTextEditorSize();
});
textEditor.addEventListener("pointerup", () => { textInteraction = null; });
textEditor.addEventListener("pointercancel", () => { textInteraction = null; });
const files = setupFileManager({ paintCanvas: canvas, input: $("#file-input"), onLoaded: () => { history.undoStack = []; history.redoStack = []; updateCanvasStatus(); }, getCanvasName: () => "bit-paint" });
async function action(name) {
  if (name === "new") { if (window.confirm("Create a new blank canvas?")) { before = canvas.snapshot(); canvas.resize(1000, 700, false); history.commit(before); } }
  if (name === "open") files.open();
  if (name === "save") {
    const format = (window.prompt("Formato de exportação: png, jpg ou webp", "png") || "png").toLowerCase();
    const type = format === "jpg" || format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
    await files.save(type);
  }
  if (name === "undo") history.undo(); if (name === "redo") history.redo();
  if (name === "save-as") {
    const format = (window.prompt("Formato de exportação: png, jpg ou webp", "png") || "png").toLowerCase();
    const type = format === "jpg" || format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
    await files.save(type);
  }
  if (name === "print") {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`<img src="${canvas.element.toDataURL("image/png")}" onload="window.print()">`);
      printWindow.document.close();
    }
  }
  if (name === "properties") {
    window.alert(`Tamanho da imagem: ${canvas.element.width} × ${canvas.element.height} pixels`);
  }
  if (name === "about") {
    window.alert("Bit Paint\nEditor de imagens leve para o navegador.");
  }
  if (name === "exit") {
    window.close();
  }
  if (name === "select-all") {
    setTool("select");
    selected = { x: 0, y: 0, width: canvas.element.width, height: canvas.element.height };
    renderSelection();
  }
  if (name === "fit") {
    const workspace = document.querySelector(".workspace");
    const availableWidth = workspace.clientWidth - 48;
    const availableHeight = workspace.clientHeight - 48;
    setZoom(Math.min(100, availableWidth / canvas.element.width * 100, availableHeight / canvas.element.height * 100));
  }
  if (name === "clear") { before = canvas.snapshot(); canvas.context.fillStyle = "#ffffff"; canvas.context.fillRect(0, 0, canvas.element.width, canvas.element.height); canvas.notify(); commit(); }
  if (name === "swap-colors") colors.swap(); if (name === "zoom-in") setZoom(zoom + 25); if (name === "zoom-out") setZoom(zoom - 25); if (name === "zoom-reset") setZoom(100);
  if (name === "flip-h" || name === "flip-v" || name === "rotate") { before = canvas.snapshot(); const copy = document.createElement("canvas"); copy.width = canvas.element.width; copy.height = canvas.element.height; copy.getContext("2d").drawImage(canvas.element, 0, 0); const ctx = canvas.context; ctx.save(); ctx.clearRect(0, 0, canvas.element.width, canvas.element.height); if (name === "rotate") { canvas.resize(canvas.element.height, canvas.element.width, false); ctx.translate(canvas.element.width, 0); ctx.rotate(Math.PI / 2); } else { ctx.translate(name === "flip-h" ? canvas.element.width : 0, name === "flip-v" ? canvas.element.height : 0); ctx.scale(name === "flip-h" ? -1 : 1, name === "flip-v" ? -1 : 1); } ctx.drawImage(copy, 0, 0); ctx.restore(); canvas.notify(); commit(); }
  if (name === "resize") { const width = Number(window.prompt("Nova largura:", canvas.element.width)); const height = Number(window.prompt("Nova altura:", canvas.element.height)); if (width > 0 && height > 0) { before = canvas.snapshot(); canvas.resize(width, height); commit(); } }
  if (name === "crop" && selected && selected.width > 0 && selected.height > 0) { before = canvas.snapshot(); const crop = canvas.context.getImageData(selected.x, selected.y, selected.width, selected.height); canvas.resize(selected.width, selected.height, false); canvas.context.putImageData(crop, 0, 0); canvas.notify(); commit(); selected = null; renderSelection(); }
  if (["grayscale", "invert-colors", "sepia", "brightness", "contrast"].includes(name)) {
    let amount = 0;
    if (name === "brightness") amount = Number(window.prompt("Intensidade do brilho (-255 a 255):", "20"));
    if (name === "contrast") amount = Number(window.prompt("Intensidade do contraste (-255 a 255):", "20"));
    if ((name === "brightness" || name === "contrast") && (!Number.isFinite(amount) || amount < -255 || amount > 255)) return;
    before = canvas.snapshot();
    applyFilter(name === "invert-colors" ? "invert" : name, amount);
    commit();
  }
  if ((name === "copy" || name === "delete") && selected) { clipboard = canvas.context.getImageData(selected.x, selected.y, selected.width, selected.height); if (name === "delete") { before = canvas.snapshot(); canvas.context.fillStyle = "#ffffff"; canvas.context.fillRect(selected.x, selected.y, selected.width, selected.height); canvas.notify(); commit(); } }
  if (name === "cut" && selected) { clipboard = canvas.context.getImageData(selected.x, selected.y, selected.width, selected.height); before = canvas.snapshot(); canvas.context.fillStyle = "#ffffff"; canvas.context.fillRect(selected.x, selected.y, selected.width, selected.height); canvas.notify(); commit(); }
  if (name === "paste" && clipboard) { before = canvas.snapshot(); const x = selected ? selected.x : 0; const y = selected ? selected.y : 0; canvas.context.putImageData(clipboard, x, y); selected = { x, y, width: clipboard.width, height: clipboard.height }; canvas.notify(); renderSelection(); commit(); }
}
document.querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", () => action(button.dataset.action)));
document.querySelectorAll(".menu-trigger").forEach((trigger) => {
  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    const item = trigger.closest(".menu-item");
    const willOpen = !item.classList.contains("is-open");
    document.querySelectorAll(".menu-item.is-open").forEach((openItem) => {
      openItem.classList.remove("is-open");
      openItem.querySelector(".menu-trigger").setAttribute("aria-expanded", "false");
    });
    item.classList.toggle("is-open", willOpen);
    trigger.setAttribute("aria-expanded", String(willOpen));
  });
});
document.addEventListener("click", () => {
  document.querySelectorAll(".menu-item.is-open").forEach((item) => {
    item.classList.remove("is-open");
    item.querySelector(".menu-trigger").setAttribute("aria-expanded", "false");
  });
});
document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (!event.ctrlKey && event.key === "Escape") {
    document.querySelectorAll(".menu-item.is-open").forEach((item) => item.classList.remove("is-open"));
    return;
  }
  if (event.ctrlKey && key === "z") { event.preventDefault(); action("undo"); }
  else if (event.ctrlKey && key === "y") { event.preventDefault(); action("redo"); }
  else if (event.ctrlKey && key === "s") { event.preventDefault(); action("save"); }
  else if (event.ctrlKey && key === "o") { event.preventDefault(); action("open"); }
  else if (event.ctrlKey && key === "n") { event.preventDefault(); action("new"); }
  else if (event.ctrlKey && key === "p") { event.preventDefault(); action("print"); }
  else if (event.ctrlKey && key === "c") { event.preventDefault(); action("copy"); }
  else if (event.ctrlKey && key === "v") { event.preventDefault(); action("paste"); }
  else if (event.ctrlKey && key === "a") { event.preventDefault(); action("select-all"); }
  else if (event.key === "Delete") action("delete");
});
$("#brush-size").dispatchEvent(new Event("input")); updateCanvasStatus();
