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
const gridOverlay = $("#grid-overlay");
const gridContext = gridOverlay.getContext("2d");
const textEditor = $("#text-editor");
const textInput = textEditor.querySelector("textarea");
const textGrip = textEditor.querySelector(".text-editor-grip");
const textResize = textEditor.querySelector(".text-editor-resize");
const saveDialog = $("#save-dialog");
const saveForm = $("#save-form");
const saveName = $("#save-name");
const saveFormat = $("#save-format");
const appDialog = $("#app-dialog");
const appDialogForm = $("#app-dialog-form");
const appDialogTitle = $("#app-dialog-title");
const appDialogMessage = $("#app-dialog-message");
const appDialogFields = $("#app-dialog-fields");
const appDialogConfirm = $("#app-dialog-confirm");
const canvasFrame = $(".canvas-frame");
const canvasResizePreview = $("#canvas-resize-preview");
const canvasResizeHandles = [
  $("#canvas-resize-top-left"),
  $("#canvas-resize-top"),
  $("#canvas-resize-top-right"),
  $("#canvas-resize-right"),
  $("#canvas-resize-bottom-left"),
  $("#canvas-resize-bottom"),
  $("#canvas-resize-bottom-right"),
  $("#canvas-resize-left")
];
const history = new History(canvas);
const colors = setupColors({ picker: $("#primary-color"), palette: $("#palette"), primaryPreview: $("#primary-color-preview"), secondaryPreview: $("#secondary-color-preview") });
let tool = "pencil"; let zoom = 100; let selected = null; let clipboard = null; let pendingPaste = false;
let gridVisible = false;
let textState = null;
let textInteraction = null;
let saveDialogResolve = null;
let appDialogResolve = null;
const toolNames = { pencil: "Lápis", brush: "Pincel", eraser: "Borracha", line: "Linha", rectangle: "Retângulo", "round-rectangle": "Retângulo arredondado", ellipse: "Elipse", triangle: "Triângulo", diamond: "Losango", star: "Estrela", arrow: "Seta", speech: "Balão", pentagon: "Pentágono", hexagon: "Hexágono", parallelogram: "Paralelogramo", trapezoid: "Trapézio", "right-triangle": "Triângulo retângulo", heart: "Coração", cloud: "Nuvem", lightning: "Relâmpago", cylinder: "Cilindro", fill: "Preencher", picker: "Conta-gotas", text: "Texto", select: "Selecionar", magnifier: "Lupa" };
function updateCanvasStatus() { $("#canvas-size").textContent = `${canvas.element.width} × ${canvas.element.height}`; }
function renderSelection(value = selected) {
  if (overlay.width !== canvas.element.width) overlay.width = canvas.element.width;
  if (overlay.height !== canvas.element.height) overlay.height = canvas.element.height;
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
function renderGrid() {
  gridOverlay.width = canvas.element.width;
  gridOverlay.height = canvas.element.height;
  gridContext.clearRect(0, 0, gridOverlay.width, gridOverlay.height);
  if (!gridVisible) return;
  gridContext.save();
  gridContext.strokeStyle = "rgba(71, 85, 105, .22)";
  gridContext.lineWidth = 1;
  for (let x = 20; x < gridOverlay.width; x += 20) {
    gridContext.beginPath(); gridContext.moveTo(x + .5, 0); gridContext.lineTo(x + .5, gridOverlay.height); gridContext.stroke();
  }
  for (let y = 20; y < gridOverlay.height; y += 20) {
    gridContext.beginPath(); gridContext.moveTo(0, y + .5); gridContext.lineTo(gridOverlay.width, y + .5); gridContext.stroke();
  }
  gridContext.restore();
}
function updateCanvasDisplaySize() { canvas.element.style.width = `${canvas.element.width * zoom / 100}px`; }
function setZoom(value) { zoom = Math.max(25, Math.min(300, value)); updateCanvasDisplaySize(); $("#zoom-value").textContent = `${zoom}%`; }
function setTool(value) { tool = value; $("#current-tool").textContent = toolNames[value]; document.querySelectorAll(".tool-button, .ribbon-action[data-tool]").forEach((button) => { const active = button.dataset.tool === value; button.classList.toggle("is-selected", active); button.setAttribute("aria-pressed", String(active)); }); canvas.element.style.cursor = value === "text" ? "text" : "crosshair"; }
function options() { return { filled: $("#shape-fill").checked, brushType: $("#brush-type").value, fontFamily: $("#font-family").value, fontSize: Number($("#font-size").value), bold: $("#font-bold").checked, italic: $("#font-italic").checked }; }
function commit() { history.commit(before); before = null; pendingPaste = false; }
function chooseSaveDetails() {
  saveName.value = "bit-paint";
  saveFormat.value = "image/png";
  saveDialog.showModal();
  saveName.select();
  return new Promise((resolve) => { saveDialogResolve = resolve; });
}
saveForm.addEventListener("submit", (event) => {
  event.preventDefault();
  saveDialog.close("save");
  const name = saveName.value.trim() || "bit-paint";
  saveDialogResolve?.({ name, type: saveFormat.value });
  saveDialogResolve = null;
});
saveDialog.querySelector("[data-dialog-cancel]").addEventListener("click", () => {
  saveDialog.close("cancel");
  saveDialogResolve?.(null);
  saveDialogResolve = null;
});
saveDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  saveDialog.close("cancel");
  saveDialogResolve?.(null);
  saveDialogResolve = null;
});
function showAppDialog({ title, message = "", fields = [], confirmLabel = "Confirmar", cancelLabel = "Cancelar" }) {
  appDialogTitle.textContent = title;
  appDialogMessage.textContent = message;
  appDialogConfirm.textContent = confirmLabel;
  const cancelButton = appDialog.querySelector("[data-app-dialog-cancel]");
  cancelButton.textContent = cancelLabel;
  cancelButton.hidden = !cancelLabel;
  appDialogFields.innerHTML = fields.map((field) => `<label class="app-dialog-field" for="app-dialog-${field.name}"><span>${field.label}</span><input id="app-dialog-${field.name}" name="${field.name}" type="${field.type || "text"}" value="${field.value ?? ""}" ${field.min !== undefined ? `min="${field.min}"` : ""} ${field.max !== undefined ? `max="${field.max}"` : ""} required></label>`).join("");
  appDialog.showModal();
  appDialog.querySelector("input")?.select();
  return new Promise((resolve) => { appDialogResolve = resolve; });
}
appDialogForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(appDialogForm).entries());
  appDialog.close("confirm");
  appDialogResolve?.({ confirmed: true, values });
  appDialogResolve = null;
});
appDialog.querySelector("[data-app-dialog-cancel]").addEventListener("click", () => {
  appDialog.close("cancel");
  appDialogResolve?.({ confirmed: false, values: {} });
  appDialogResolve = null;
});
appDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  appDialog.close("cancel");
  appDialogResolve?.({ confirmed: false, values: {} });
  appDialogResolve = null;
});
function showAppMessage(message, title = "Bit Paint") {
  return showAppDialog({ title, message, confirmLabel: "OK", cancelLabel: "" });
}
let resizeSession = null;
function resizeCanvasProposal(handle, event) {
  const deltaX = (event.clientX - handle.startX) * handle.scale;
  const deltaY = (event.clientY - handle.startY) * handle.scale;
  const width = Math.max(1, Math.round(handle.startWidth + deltaX * handle.horizontal));
  const height = Math.max(1, Math.round(handle.startHeight + deltaY * handle.vertical));
  return {
    width,
    height,
    offsetX: handle.horizontal < 0 ? width - handle.startWidth : 0,
    offsetY: handle.vertical < 0 ? height - handle.startHeight : 0
  };
}
function setupCanvasResizeHandles() {
  canvasResizeHandles.forEach((element) => element.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const bounds = canvas.element.getBoundingClientRect();
      const handle = {
        startX: event.clientX,
        startY: event.clientY,
        startWidth: canvas.element.width,
        startHeight: canvas.element.height,
        scale: canvas.element.width / bounds.width,
        horizontal: element.classList.contains("canvas-resize-left") || element.classList.contains("canvas-resize-top-left") || element.classList.contains("canvas-resize-bottom-left")
          ? -1
          : element.classList.contains("canvas-resize-right") || element.classList.contains("canvas-resize-top-right") || element.classList.contains("canvas-resize-bottom-right")
            ? 1
            : 0,
        vertical: element.classList.contains("canvas-resize-top") || element.classList.contains("canvas-resize-top-left") || element.classList.contains("canvas-resize-top-right")
          ? -1
          : element.classList.contains("canvas-resize-bottom") || element.classList.contains("canvas-resize-bottom-left") || element.classList.contains("canvas-resize-bottom-right")
            ? 1
            : 0
      };
      const beforeState = history.captureState();
      resizeSession = { handle, beforeState };
      element.setPointerCapture?.(event.pointerId);
      const move = (moveEvent) => {
        const proposal = resizeCanvasProposal(handle, moveEvent);
        const displayScale = 1 / handle.scale;
        const previewOffsetX = handle.horizontal < 0
          ? -(proposal.width - handle.startWidth) * displayScale
          : 0;
        const previewOffsetY = handle.vertical < 0
          ? -(proposal.height - handle.startHeight) * displayScale
          : 0;
        canvasResizePreview.style.display = "block";
        canvasResizePreview.style.left = `${previewOffsetX}px`;
        canvasResizePreview.style.top = `${previewOffsetY}px`;
        canvasResizePreview.style.width = `${proposal.width * displayScale}px`;
        canvasResizePreview.style.height = `${proposal.height * displayScale}px`;
        canvasResizePreview.querySelector("span").textContent = `${proposal.width} × ${proposal.height}`;
      };
      const stop = (stopEvent) => {
        element.removeEventListener("pointermove", move);
        element.removeEventListener("pointerup", stop);
        element.removeEventListener("pointercancel", stop);
        if (element.hasPointerCapture?.(stopEvent.pointerId)) element.releasePointerCapture(stopEvent.pointerId);
        if (!resizeSession) return;
        const proposal = resizeCanvasProposal(handle, stopEvent);
        if (stopEvent.type === "pointerup" && (proposal.width !== handle.startWidth || proposal.height !== handle.startHeight)) {
          canvas.resize(proposal.width, proposal.height, true, proposal.offsetX, proposal.offsetY);
          updateCanvasDisplaySize();
          renderGrid();
          renderSelection();
          history.commit(beforeState);
        }
        canvasResizePreview.style.display = "none";
        resizeSession = null;
      };
      element.addEventListener("pointermove", move);
      element.addEventListener("pointerup", stop);
      element.addEventListener("pointercancel", stop);
  }));
}
function cancelCanvasResize() {
  if (!resizeSession) return;
  canvasResizePreview.style.display = "none";
  resizeSession = null;
}
function imageFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(blob);
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Não foi possível ler a imagem da área de transferência.")); };
    image.src = url;
  });
}
async function pasteImageBlob(blob) {
  const image = await imageFromBlob(blob);
  const width = Math.max(1, image.naturalWidth);
  const height = Math.max(1, image.naturalHeight);
  const beforeState = history.captureState();
  const targetWidth = Math.max(canvas.element.width, width);
  const targetHeight = Math.max(canvas.element.height, height);
  if (targetWidth !== canvas.element.width || targetHeight !== canvas.element.height) {
    canvas.resize(targetWidth, targetHeight, true);
  }
  const x = Math.round((canvas.element.width - width) / 2);
  const y = Math.round((canvas.element.height - height) / 2);
  canvas.context.drawImage(image, x, y, width, height);
  canvas.notify();
  history.commit(beforeState);
  selected = { x, y, width, height };
  setTool("select");
  drawingController.setSelection(selected);
  renderSelection();
  pendingPaste = true;
}
async function readSystemClipboardImage() {
  if (!navigator.clipboard || typeof navigator.clipboard.read !== "function") return false;
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const type = item.types.find((value) => value.startsWith("image/"));
      if (type) { await pasteImageBlob(await item.getType(type)); return true; }
    }
  } catch (error) {
    console.warn("A área de transferência do sistema não pôde ser lida.", error);
  }
  return false;
}
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
document.querySelectorAll(".tool-button, .ribbon-action[data-tool]").forEach((button) => {
  const label = button.querySelector("span:last-child")?.textContent.trim();
  if (label) {
    button.title = label;
    button.setAttribute("aria-label", label);
  }
  button.addEventListener("click", () => setTool(button.dataset.tool));
});
$("#brush-size").addEventListener("input", () => { const text = `${$("#brush-size").value} px`; $("#brush-size-value").textContent = text; $("#current-size").textContent = text; });
const drawingController = setupDrawing({ paintCanvas: canvas, getTool: () => tool, getColor: colors.getPrimaryColor, getSize: () => Number($("#brush-size").value), getOptions: options, onCursorMove: (point) => { $("#cursor-position").textContent = point ? `${Math.round(point.x)}, ${Math.round(point.y)}` : "—"; }, onCursorStyle: (value) => { canvas.element.style.cursor = value; }, onBegin: () => { before = canvas.snapshot(); }, onCommit: commit, onPickColor: (data) => colors.setPrimary(`#${[data[0], data[1], data[2]].map((value) => value.toString(16).padStart(2, "0")).join("")}`), onSelection: (value) => { selected = value; renderSelection(); }, onTextStart: openTextEditor, onMagnify: (direction) => setZoom(zoom + direction * 25) });
setupCanvasResizeHandles();
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
const files = setupFileManager({ paintCanvas: canvas, input: $("#file-input"), onLoaded: () => { history.undoStack = []; history.redoStack = []; updateCanvasStatus(); }, onError: showAppMessage, getCanvasName: () => "bit-paint" });
async function action(name) {
  if (name === "new") { const result = await showAppDialog({ title: "Novo desenho", message: "Deseja criar um novo canvas?", confirmLabel: "Criar" }); if (result.confirmed) { history.commit(history.captureState()); canvas.resize(1000, 700, false); } }
  if (name === "open") files.open();
  if (name === "save") { const details = await chooseSaveDetails(); if (details) await files.save(details.type, details.name); }
  if (name === "undo") history.undo(); if (name === "redo") history.redo();
  if (name === "print") {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`<img src="${canvas.element.toDataURL("image/png")}" onload="window.print()">`);
      printWindow.document.close();
    }
  }
  if (name === "properties") {
    await showAppMessage(`Tamanho da imagem: ${canvas.element.width} × ${canvas.element.height} pixels`, "Propriedades da imagem");
  }
  if (name === "about") {
    await showAppMessage("Bit Paint\nEditor de imagens leve para o navegador.", "Sobre o Bit Paint");
  }
  if (name === "exit") {
    window.close();
  }
  if (name === "select-all") {
    setTool("select");
    selected = { x: 0, y: 0, width: canvas.element.width, height: canvas.element.height };
    drawingController.setSelection(selected);
    renderSelection();
  }
  if (name === "fit") {
    const workspace = document.querySelector(".workspace");
    const availableWidth = workspace.clientWidth - 48;
    const availableHeight = workspace.clientHeight - 48;
    setZoom(Math.min(100, availableWidth / canvas.element.width * 100, availableHeight / canvas.element.height * 100));
  }
  if (name === "toggle-grid") { gridVisible = !gridVisible; renderGrid(); }
  if (name === "clear") { before = canvas.snapshot(); canvas.context.fillStyle = "#ffffff"; canvas.context.fillRect(0, 0, canvas.element.width, canvas.element.height); canvas.notify(); commit(); }
  if (name === "swap-colors") colors.swap(); if (name === "zoom-in") setZoom(zoom + 25); if (name === "zoom-out") setZoom(zoom - 25); if (name === "zoom-reset") setZoom(100);
  if (name === "flip-h" || name === "flip-v" || name === "rotate") { const beforeState = history.captureState(); const copy = document.createElement("canvas"); copy.width = canvas.element.width; copy.height = canvas.element.height; copy.getContext("2d").drawImage(canvas.element, 0, 0); const ctx = canvas.context; ctx.save(); ctx.clearRect(0, 0, canvas.element.width, canvas.element.height); if (name === "rotate") { canvas.resize(canvas.element.height, canvas.element.width, false); ctx.translate(canvas.element.width, 0); ctx.rotate(Math.PI / 2); } else { ctx.translate(name === "flip-h" ? canvas.element.width : 0, name === "flip-v" ? canvas.element.height : 0); ctx.scale(name === "flip-h" ? -1 : 1, name === "flip-v" ? -1 : 1); } ctx.drawImage(copy, 0, 0); ctx.restore(); canvas.notify(); history.commit(beforeState); }
  if (name === "resize") {
    const result = await showAppDialog({ title: "Redimensionar imagem", message: "Informe as novas dimensões.", fields: [
      { name: "width", label: "Largura (px)", type: "number", value: canvas.element.width, min: 1 },
      { name: "height", label: "Altura (px)", type: "number", value: canvas.element.height, min: 1 }
    ], confirmLabel: "Redimensionar" });
    if (!result.confirmed) return;
    const width = Number(result.values.width);
    const height = Number(result.values.height);
    if (width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height)) {
      const beforeState = history.captureState();
      const source = document.createElement("canvas");
      source.width = canvas.element.width;
      source.height = canvas.element.height;
      source.getContext("2d").drawImage(canvas.element, 0, 0);
      canvas.resize(width, height, false);
      canvas.context.imageSmoothingEnabled = true;
      canvas.context.imageSmoothingQuality = "high";
      canvas.context.drawImage(source, 0, 0, source.width, source.height, 0, 0, canvas.element.width, canvas.element.height);
      canvas.notify();
      selected = null;
      drawingController.setSelection(null);
      renderSelection();
      history.commit(beforeState);
    }
  }
  if (name === "crop" && selected && selected.width > 0 && selected.height > 0) { const beforeState = history.captureState(); const crop = canvas.context.getImageData(selected.x, selected.y, selected.width, selected.height); canvas.resize(selected.width, selected.height, false); canvas.context.putImageData(crop, 0, 0); canvas.notify(); history.commit(beforeState); selected = null; drawingController.setSelection(null); renderSelection(); }
  if (["grayscale", "invert-colors", "sepia", "brightness", "contrast"].includes(name)) {
    let amount = 0;
    if (name === "brightness") {
      const result = await showAppDialog({ title: "Brilho", message: "Escolha uma intensidade entre -255 e 255.", fields: [{ name: "amount", label: "Intensidade", type: "number", value: 20, min: -255, max: 255 }], confirmLabel: "Aplicar" });
      if (!result.confirmed) return;
      amount = Number(result.values.amount);
    }
    if (name === "contrast") {
      const result = await showAppDialog({ title: "Contraste", message: "Escolha uma intensidade entre -255 e 255.", fields: [{ name: "amount", label: "Intensidade", type: "number", value: 20, min: -255, max: 255 }], confirmLabel: "Aplicar" });
      if (!result.confirmed) return;
      amount = Number(result.values.amount);
    }
    if ((name === "brightness" || name === "contrast") && (!Number.isFinite(amount) || amount < -255 || amount > 255)) return;
    before = canvas.snapshot();
    applyFilter(name === "invert-colors" ? "invert" : name, amount);
    commit();
  }
  if ((name === "copy" || name === "delete") && selected) { clipboard = canvas.context.getImageData(selected.x, selected.y, selected.width, selected.height); if (name === "delete") { before = canvas.snapshot(); canvas.context.fillStyle = "#ffffff"; canvas.context.fillRect(selected.x, selected.y, selected.width, selected.height); canvas.notify(); commit(); } }
  if (name === "cut" && selected && selected.width > 0 && selected.height > 0) {
    const area = {
      x: Math.max(0, Math.round(selected.x)),
      y: Math.max(0, Math.round(selected.y)),
      width: Math.min(canvas.element.width - Math.max(0, Math.round(selected.x)), Math.round(selected.width)),
      height: Math.min(canvas.element.height - Math.max(0, Math.round(selected.y)), Math.round(selected.height))
    };
    if (area.width > 0 && area.height > 0) {
      const cutBefore = canvas.snapshot();
      clipboard = canvas.context.getImageData(area.x, area.y, area.width, area.height);
      canvas.context.fillStyle = "#ffffff";
      canvas.context.fillRect(area.x, area.y, area.width, area.height);
      canvas.notify();
      history.commit(cutBefore);
      before = null;
      selected = { ...area };
      drawingController.setSelection(selected);
      renderSelection();
    }
  }
  if (name === "paste") {
    if (await readSystemClipboardImage()) return;
    if (clipboard) {
      before = canvas.snapshot();
      const x = selected ? selected.x : 0; const y = selected ? selected.y : 0;
      canvas.context.putImageData(clipboard, x, y);
      selected = { x, y, width: clipboard.width, height: clipboard.height };
      drawingController.setSelection(selected);
      canvas.notify(); renderSelection(); commit();
      pendingPaste = true;
    }
  }
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
document.addEventListener("paste", (event) => {
  if (event.target.closest("textarea, input, [contenteditable='true']")) return;
  const imageFile = [...(event.clipboardData?.files || [])].find((file) => file.type.startsWith("image/"));
  if (!imageFile) return;
  event.preventDefault();
  pasteImageBlob(imageFile).catch((error) => console.warn(error.message));
});
document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (!event.ctrlKey && event.key === "Escape") {
    if (textState) return;
    cancelCanvasResize();
    if (pendingPaste) {
      history.undo();
      pendingPaste = false;
    }
    drawingController.cancelSelection();
    selected = null;
    renderSelection();
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
  else if (event.ctrlKey && key === "x") { event.preventDefault(); action("cut"); }
  else if (event.ctrlKey && key === "v") { event.preventDefault(); action("paste"); }
  else if (event.ctrlKey && key === "a") { event.preventDefault(); action("select-all"); }
  else if (event.key === "Delete") action("delete");
});
$("#brush-size").dispatchEvent(new Event("input")); updateCanvasStatus();
