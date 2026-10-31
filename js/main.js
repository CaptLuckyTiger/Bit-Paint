import { PaintCanvas, MAX_CANVAS_DIMENSION } from "./canvas.js";
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
const saveQuality = $("#save-quality");
const appDialog = $("#app-dialog");
const appDialogForm = $("#app-dialog-form");
const appDialogTitle = $("#app-dialog-title");
const appDialogMessage = $("#app-dialog-message");
const appDialogFields = $("#app-dialog-fields");
const appDialogConfirm = $("#app-dialog-confirm");
const canvasFrame = $(".canvas-frame");
const brushCursor = $("#brush-cursor");
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
let isDirty = false;
let gridVisible = false;
const workspace = $(".workspace");
let spacePressed = false;
let panSession = null;
workspace.addEventListener("wheel", (event) => {
  if (!event.ctrlKey) return;
  event.preventDefault();
  setZoom(zoom + (event.deltaY < 0 ? 25 : -25));
}, { passive: false });
workspace.addEventListener("pointerdown", (event) => {
  if (!spacePressed || event.button !== 0) return;
  event.preventDefault(); event.stopPropagation();
  panSession = { x: event.clientX, y: event.clientY, left: workspace.scrollLeft, top: workspace.scrollTop };
  workspace.classList.add("is-panning");
  workspace.setPointerCapture(event.pointerId);
}, true);
workspace.addEventListener("pointermove", (event) => {
  if (!panSession) return;
  event.preventDefault(); event.stopPropagation();
  workspace.scrollLeft = panSession.left - (event.clientX - panSession.x);
  workspace.scrollTop = panSession.top - (event.clientY - panSession.y);
}, true);
const stopPan = (event) => {
  if (!panSession) return;
  panSession = null;
  workspace.classList.remove("is-panning");
  if (workspace.hasPointerCapture(event.pointerId)) workspace.releasePointerCapture(event.pointerId);
};
workspace.addEventListener("pointerup", stopPan, true);
workspace.addEventListener("pointercancel", stopPan, true);
const toolShortcuts = { p: "pencil", b: "brush", e: "eraser", g: "fill", i: "picker", t: "text", m: "select", z: "magnifier" };
const mobileGroupTabs = [...document.querySelectorAll("[data-mobile-group]")].filter((element) => element.matches("button"));
const mobileSections = [...document.querySelectorAll(".toolbar > .tool-section")];
["tools", "tools", "tools", "forms", "tools", "text", "colors"].forEach((group, index) => {
  if (mobileSections[index]) mobileSections[index].dataset.mobileGroup = group;
});
function setMobileGroup(group) {
  document.querySelector(".toolbar").dataset.activeMobileGroup = group;
  mobileGroupTabs.forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.mobileGroup === group)));
}
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("bit-paint-theme", theme);
}
setTheme(localStorage.getItem("bit-paint-theme") || "light");
mobileGroupTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => setMobileGroup(tab.dataset.mobileGroup));
  tab.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const next = (index + direction + mobileGroupTabs.length) % mobileGroupTabs.length;
    mobileGroupTabs[next].focus();
    setMobileGroup(mobileGroupTabs[next].dataset.mobileGroup);
  });
});
setMobileGroup("tools");
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
function refreshView() { updateCanvasDisplaySize(); renderGrid(); renderSelection(); updateCanvasStatus(); $("#zoom-value").textContent = `${zoom}%`; }
function updateCanvasDisplaySize() { canvas.element.style.width = `${canvas.element.width * zoom / 100}px`; }
function setZoom(value) { zoom = Math.max(25, Math.min(3200, value)); refreshView(); }
function setTool(value) { tool = value; document.documentElement.dataset.activeTool = value; if (value === "text") setMobileGroup("text"); else if (document.querySelector(".shape-grid [data-tool='" + value + "']")) setMobileGroup("forms"); else setMobileGroup("tools"); $("#current-tool").textContent = toolNames[value]; document.querySelectorAll(".tool-button, .ribbon-action[data-tool]").forEach((button) => { const active = button.dataset.tool === value; button.classList.toggle("is-selected", active); button.setAttribute("aria-pressed", String(active)); }); canvas.element.style.cursor = ["pencil", "brush", "eraser"].includes(value) ? "none" : (value === "text" ? "text" : "crosshair"); if (!["pencil", "brush", "eraser"].includes(value)) brushCursor.style.display = "none"; }
setTool(tool);
function options() { return { filled: $("#shape-fill").checked, brushType: $("#brush-type").value, fillTolerance: Number($("#fill-tolerance")?.value || 18), fontFamily: $("#font-family").value, fontSize: Math.max(8, Number($("#font-size").value) || 16), bold: $("#font-bold").checked, italic: $("#font-italic").checked }; }
function recordHistory(state) { history.commit(state); isDirty = true; }
function commit() { recordHistory(before); before = null; pendingPaste = false; }
function chooseSaveDetails() {
  saveName.value = localStorage.getItem("bit-paint-save-name") || "bit-paint";
  saveFormat.value = localStorage.getItem("bit-paint-save-format") || "image/png";
  saveQuality.value = localStorage.getItem("bit-paint-save-quality") || "92";
  $("#save-quality-value").textContent = `${saveQuality.value}%`;
  saveQuality.disabled = saveFormat.value === "image/png";
  saveDialog.showModal();
  saveName.select();
  return new Promise((resolve) => { saveDialogResolve = resolve; });
}
saveForm.addEventListener("submit", (event) => {
  event.preventDefault();
  saveDialog.close("save");
  const name = saveName.value.trim() || "bit-paint";
  const details = { name, type: saveFormat.value, quality: Number(saveQuality.value) / 100 };
  localStorage.setItem("bit-paint-save-name", name);
  localStorage.setItem("bit-paint-save-format", details.type);
  localStorage.setItem("bit-paint-save-quality", saveQuality.value);
  saveDialogResolve?.(details);
  saveDialogResolve = null;
});
saveFormat.addEventListener("change", () => { saveQuality.disabled = saveFormat.value === "image/png"; });
saveQuality.addEventListener("input", () => { $("#save-quality-value").textContent = `${saveQuality.value}%`; });
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
function showAppDialog({ title, message = "", fields = [], confirmLabel = "Confirmar", cancelLabel = "Cancelar", onInput = null }) {
  appDialogTitle.textContent = title;
  appDialogMessage.textContent = message;
  appDialogConfirm.textContent = confirmLabel;
  const cancelButton = appDialog.querySelector("[data-app-dialog-cancel]");
  cancelButton.textContent = cancelLabel;
  cancelButton.hidden = !cancelLabel;
  appDialogFields.replaceChildren();
  fields.forEach((field) => {
    const label = document.createElement("label");
    label.className = "app-dialog-field";
    label.htmlFor = `app-dialog-${field.name}`;
    const caption = document.createElement("span");
    caption.textContent = field.label;
    const control = field.options ? document.createElement("select") : document.createElement("input");
    control.id = `app-dialog-${field.name}`;
    control.name = field.name;
    if (field.options) {
      field.options.forEach(({ label: optionLabel, value }) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = optionLabel;
        control.append(option);
      });
    } else {
      control.type = field.type || "text";
      control.value = field.value ?? "";
      if (field.min !== undefined) control.min = field.min;
      if (field.max !== undefined) control.max = field.max;
      control.required = true;
      control.addEventListener("input", () => {
        if (field.type === "range") output.textContent = control.value;
        onInput?.(Object.fromEntries(new FormData(appDialogForm).entries()));
      });
    }
    const output = document.createElement("output");
    if (field.type === "range") { output.textContent = field.value; caption.append(" ", output); }
    if (field.value !== undefined) control.value = field.value;
    label.append(caption, control);
    appDialogFields.append(label);
  });
  appDialog.showModal();
  appDialog.querySelector("input, select")?.focus();
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
          canvas.resize(proposal.width, proposal.height, true, proposal.offsetX, proposal.offsetY, null);
          updateCanvasDisplaySize();
          renderGrid();
          renderSelection();
          recordHistory(beforeState);
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
    canvas.resize(targetWidth, targetHeight, true, 0, 0, null);
  }
  const x = Math.round((canvas.element.width - width) / 2);
  const y = Math.round((canvas.element.height - height) / 2);
  canvas.context.drawImage(image, x, y, width, height);
  canvas.notify();
  recordHistory(beforeState);
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
  const area = selected && selected.width > 0 && selected.height > 0
    ? {
      x: Math.max(0, Math.floor(selected.x)), y: Math.max(0, Math.floor(selected.y)),
      width: Math.min(canvas.element.width - Math.max(0, Math.floor(selected.x)), Math.ceil(selected.width)),
      height: Math.min(canvas.element.height - Math.max(0, Math.floor(selected.y)), Math.ceil(selected.height))
    }
    : { x: 0, y: 0, width: canvas.element.width, height: canvas.element.height };
  if (area.width < 1 || area.height < 1) return;
  const image = canvas.context.getImageData(area.x, area.y, area.width, area.height);
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
  canvas.context.putImageData(image, area.x, area.y);
  canvas.notify();
}
let before = null;
const iconArtwork = {
  line: ["M5 27 27 5", "M21 5h6v6", "#0e7490"],
  rectangle: ["M6 6h20v20H6z", "M10 10h12v12H10z", "#7c3aed"],
  "round-rectangle": ["M11 5h10a6 6 0 0 1 6 6v10a6 6 0 0 1-6 6H11a6 6 0 0 1-6-6V11a6 6 0 0 1 6-6z", "M11 11h10v10H11z", "#7c3aed"],
  ellipse: ["M16 5a11 11 0 1 0 0 22a11 11 0 1 0 0-22z", "M11 16h10", "#7c3aed"],
  triangle: ["M16 5 28 27H4z", "M16 12v7", "#7c3aed"],
  diamond: ["M16 4 28 16 16 28 4 16z", "M16 10v12", "#7c3aed"],
  star: ["M16 3 19.8 11.5 29 12.4 22 18.6 24 28 16 23 8 28 10 18.6 3 12.4 12.2 11.5z", "M16 9v8", "#7c3aed"],
  arrow: ["M4 12h13V5l11 11-11 11v-7H4z", "M7 15h8", "#ea580c"],
  speech: ["M5 6h22v14H16l-7 6v-6H5z", "M10 11h12", "#0f766e"],
  pentagon: ["M16 4 28 13 23 27H9L4 13z", "M11 16h10", "#7c3aed"],
  hexagon: ["M10 5h12l7 11-7 11H10L3 16z", "M11 16h10", "#7c3aed"],
  parallelogram: ["M10 5h19L22 27H3z", "M12 11h10", "#7c3aed"],
  trapezoid: ["M10 5h12l7 22H3z", "M12 12h8", "#7c3aed"],
  "right-triangle": ["M5 5v22h22z", "M10 21h6v-6", "#7c3aed"],
  heart: ["M16 27S3 19 4 11C5 4 13 4 16 10c3-6 11-6 12 1 1 8-12 16-12 16z", "M10 13c1-2 3-2 4 0", "#e11d48"],
  cloud: ["M8 25a6 6 0 0 1-1-12 9 9 0 0 1 17-2 7 7 0 0 1 0 14z", "M10 20h12", "#0f766e"],
  lightning: ["M18 3 6 18h8l-1 11 13-17h-9z", "M16 10l-3 5h5l-2 5", "#ca8a04"],
  cylinder: ["M5 8a11 4 0 1 0 22 0a11 4 0 1 0-22 0v16a11 4 0 0 0 22 0V8", "M5 16a11 4 0 0 0 22 0", "#0284c7"],
  select: ["M5 5h20v20H5z", "M18 18 26 27l-1-5 5 1-8-8z", "#16a34a"],
  "select-all": ["M5 5h22v22H5z", "M10 10h12v12H10z M2 8V2h6M24 2h6v6M30 24v6h-6M8 30H2v-6", "#16a34a"],
  text: ["M6 6h20M16 6v21M11 27h10", "M10 11h4M18 11h4", "#dc2626"]
};
function installToolIcon(button, name) {
  const art = iconArtwork[name];
  if (!art) return;
  const wrapper = document.createElement("span");
  wrapper.className = "tool-icon generated-tool-icon";
  wrapper.dataset.toolIcon = name;
  wrapper.setAttribute("aria-hidden", "true");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 32 32");
  svg.setAttribute("focusable", "false");
  const body = document.createElementNS("http://www.w3.org/2000/svg", "path");
  body.setAttribute("class", "icon-body");
  body.setAttribute("d", art[0]);
  svg.append(body);
  if (art[1]) {
    const detail = document.createElementNS("http://www.w3.org/2000/svg", "path");
    detail.setAttribute("class", "icon-detail");
    detail.setAttribute("d", art[1]);
    svg.append(detail);
  }
  wrapper.style.setProperty("--tool-icon-fill", art[2]);
  wrapper.style.setProperty("--tool-icon-stroke", art[2]);
  wrapper.append(svg);
  button.querySelector("span:first-child")?.replaceWith(wrapper);
}
document.querySelectorAll(".shape-grid [data-tool]").forEach((button) => installToolIcon(button, button.dataset.tool));
document.querySelectorAll('[data-tool="select"], [data-tool="text"]').forEach((button) => installToolIcon(button, button.dataset.tool));
const selectAllButton = document.querySelector('[data-action="select-all"].ribbon-action');
if (selectAllButton) installToolIcon(selectAllButton, "select-all");
document.querySelectorAll(".tool-button, .ribbon-action[data-tool]").forEach((button) => {
  const label = button.querySelector("span:last-child")?.textContent.trim();
  if (label) {
    const shortcut = Object.entries(toolShortcuts).find(([, toolName]) => toolName === button.dataset.tool)?.[0]?.toUpperCase();
    button.title = shortcut ? label + " (" + shortcut + ")" : label;
    button.setAttribute("aria-label", label);
  }
  button.addEventListener("click", () => setTool(button.dataset.tool));
});
$("#brush-size").addEventListener("input", () => { const text = `${$("#brush-size").value} px`; $("#brush-size-value").textContent = text; $("#current-size").textContent = text; });
const drawingController = setupDrawing({ paintCanvas: canvas, getTool: () => tool, getColor: colors.getPrimaryColor, getSecondaryColor: colors.getSecondaryColor, getSize: () => Number($("#brush-size").value), getOptions: options, onCursorMove: (point) => { $("#cursor-position").textContent = point ? `${Math.round(point.x)}, ${Math.round(point.y)}` : "—"; }, onCursorStyle: (value) => { canvas.element.style.cursor = value; }, onBegin: () => { before = canvas.snapshot(); }, onCommit: commit, onPickColor: (data) => colors.setPrimary(`#${[data[0], data[1], data[2]].map((value) => value.toString(16).padStart(2, "0")).join("")}`), onSelection: (value) => { selected = value; renderSelection(); }, onTextStart: openTextEditor, onMagnify: (direction) => setZoom(zoom + direction * 25) });
$("#brush-size").addEventListener("input", () => {
  if (brushCursor.style.display === "none") return;
  const scale = canvas.element.getBoundingClientRect().width / canvas.element.width;
  const diameter = Math.max(2, Number($("#brush-size").value) * scale);
  brushCursor.style.width = diameter + "px"; brushCursor.style.height = diameter + "px";
});
setupCanvasResizeHandles();
canvas.element.addEventListener("pointermove", (event) => {
  if (!["pencil", "brush", "eraser"].includes(tool)) { brushCursor.style.display = "none"; return; }
  const rect = canvas.element.getBoundingClientRect(); const frame = canvasFrame.getBoundingClientRect();
  const scale = rect.width / canvas.element.width; const diameter = Math.max(2, Number($("#brush-size").value) * scale);
  brushCursor.style.width = diameter + "px"; brushCursor.style.height = diameter + "px";
  brushCursor.style.left = (event.clientX - frame.left) + "px";
  brushCursor.style.top = (event.clientY - frame.top) + "px";
  brushCursor.style.display = "block";
});
canvas.element.addEventListener("pointerleave", () => { brushCursor.style.display = "none"; });
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
const files = setupFileManager({ paintCanvas: canvas, input: $("#file-input"), onBeforeLoad: () => { before = history.captureState(); }, onLoaded: () => { recordHistory(before); before = null; selected = null; drawingController.setSelection(null); refreshView(); }, onError: showAppMessage, getCanvasName: () => "bit-paint" });
async function action(name) {
  if (name === "new") {
    if (isDirty) {
      const discard = await showAppDialog({ title: "Alteracoes nao salvas", message: "Criar uma nova imagem? A imagem atual continuara disponivel em Desfazer.", confirmLabel: "Continuar" });
      if (!discard.confirmed) return;
    }
    const result = await showAppDialog({ title: "Novo desenho", message: "Informe as dimensÃµes e o fundo da imagem.", fields: [
      { name: "width", label: "Largura (px)", type: "number", value: 1000, min: 1, max: MAX_CANVAS_DIMENSION },
      { name: "height", label: "Altura (px)", type: "number", value: 700, min: 1, max: MAX_CANVAS_DIMENSION },
      { name: "background", label: "Fundo", value: "#ffffff", options: [
        { label: "Branco", value: "#ffffff" }, { label: "Transparente", value: "transparent" }
      ] }
    ], confirmLabel: "Criar" });
    if (result.confirmed) {
      const width = Number(result.values.width); const height = Number(result.values.height);
      if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > MAX_CANVAS_DIMENSION || height > MAX_CANVAS_DIMENSION) {
        await showAppMessage(`Informe dimensÃµes entre 1 e ${MAX_CANVAS_DIMENSION} pixels.`);
        return;
      }
      const previous = history.captureState();
      canvas.resize(width, height, false, 0, 0, result.values.background === "transparent" ? null : result.values.background);
      selected = null; drawingController.setSelection(null); refreshView(); recordHistory(previous);
    }
  }
  if (name === "open") {
    if (isDirty) {
      const proceed = await showAppDialog({ title: "Alteracoes nao salvas", message: "Abrir outra imagem? A imagem atual continuara disponivel em Desfazer.", confirmLabel: "Abrir" });
      if (!proceed.confirmed) return;
    }
    files.open();
  }
  if (name === "save") {
    const details = await chooseSaveDetails();
    if (details) {
      try { await files.save(details.type, details.name, details.quality); isDirty = false; }
      catch (error) { await showAppMessage(error.message || "NÃ£o foi possÃ­vel salvar a imagem."); }
    }
  }
  if (name === "undo" || name === "redo") {
    if (name === "undo") history.undo(); else history.redo();
    selected = null; drawingController.setSelection(null); refreshView();
  }
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
  if (name === "toggle-theme") setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  if (name === "clear") { before = canvas.snapshot(); canvas.context.fillStyle = "#ffffff"; canvas.context.fillRect(0, 0, canvas.element.width, canvas.element.height); canvas.notify(); commit(); }
  if (name === "swap-colors") colors.swap(); if (name === "zoom-in") setZoom(zoom + 25); if (name === "zoom-out") setZoom(zoom - 25); if (name === "zoom-reset") setZoom(100);
  if (name === "flip-h" || name === "flip-v" || name === "rotate") {
    const beforeState = history.captureState();
    const copy = document.createElement("canvas");
    copy.width = canvas.element.width; copy.height = canvas.element.height;
    copy.getContext("2d").drawImage(canvas.element, 0, 0);
    if (name === "rotate") canvas.resize(canvas.element.height, canvas.element.width, false, 0, 0, null);
    const ctx = canvas.context;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.element.width, canvas.element.height);
    ctx.save();
    if (name === "rotate") { ctx.translate(canvas.element.width, 0); ctx.rotate(Math.PI / 2); }
    else { ctx.translate(name === "flip-h" ? canvas.element.width : 0, name === "flip-v" ? canvas.element.height : 0); ctx.scale(name === "flip-h" ? -1 : 1, name === "flip-v" ? -1 : 1); }
    ctx.drawImage(copy, 0, 0); ctx.restore(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    selected = null; drawingController.setSelection(null); canvas.notify(); recordHistory(beforeState); refreshView();
  }
  if (name === "resize") {
    const result = await showAppDialog({ title: "Redimensionar imagem", message: "Informe as novas dimensões.", fields: [
      { name: "width", label: "Largura (px)", type: "number", value: canvas.element.width, min: 1 },
      { name: "height", label: "Altura (px)", type: "number", value: canvas.element.height, min: 1 }
    ], confirmLabel: "Redimensionar" });
    if (!result.confirmed) return;
    const width = Number(result.values.width);
    const height = Number(result.values.height);
    if (width > 0 && height > 0 && width <= MAX_CANVAS_DIMENSION && height <= MAX_CANVAS_DIMENSION && Number.isFinite(width) && Number.isFinite(height)) {
      const beforeState = history.captureState();
      const source = document.createElement("canvas");
      source.width = canvas.element.width;
      source.height = canvas.element.height;
      source.getContext("2d").drawImage(canvas.element, 0, 0);
      canvas.resize(width, height, false, 0, 0, null);
      canvas.context.imageSmoothingEnabled = true;
      canvas.context.imageSmoothingQuality = "high";
      canvas.context.drawImage(source, 0, 0, source.width, source.height, 0, 0, canvas.element.width, canvas.element.height);
      canvas.notify();
      selected = null;
      drawingController.setSelection(null);
      refreshView();
      recordHistory(beforeState);
    }
  }
  if (name === "crop" && selected && selected.width > 0 && selected.height > 0) {
    const area = { x: Math.max(0, Math.round(selected.x)), y: Math.max(0, Math.round(selected.y)), width: Math.min(canvas.element.width - Math.max(0, Math.round(selected.x)), Math.round(selected.width)), height: Math.min(canvas.element.height - Math.max(0, Math.round(selected.y)), Math.round(selected.height)) };
    if (area.width > 0 && area.height > 0) {
      const beforeState = history.captureState();
      const crop = canvas.context.getImageData(area.x, area.y, area.width, area.height);
      canvas.resize(area.width, area.height, false);
      canvas.context.putImageData(crop, 0, 0);
      canvas.notify();
      recordHistory(beforeState);
      selected = null;
      drawingController.setSelection(null);
      refreshView();
    }
  }
  if (["grayscale", "invert-colors", "sepia", "brightness", "contrast"].includes(name)) {
    let amount = 0;
    const filterName = name === "invert-colors" ? "invert" : name;
    if (name === "brightness" || name === "contrast") {
      const original = canvas.snapshot();
      const title = name === "brightness" ? "Brilho" : "Contraste";
      const result = await showAppDialog({
        title,
        message: "Ajuste o controle para visualizar o resultado antes de aplicar.",
        fields: [{ name: "amount", label: "Intensidade", type: "range", value: 20, min: -255, max: 255 }],
        confirmLabel: "Aplicar",
        onInput: (values) => { canvas.restore(original); applyFilter(filterName, Number(values.amount)); }
      });
      if (!result.confirmed) { canvas.restore(original); return; }
      amount = Number(result.values.amount);
      before = original;
    } else {
      before = canvas.snapshot();
    }
    if ((name === "brightness" || name === "contrast") && (!Number.isFinite(amount) || amount < -255 || amount > 255)) return;
    if (name === "brightness" || name === "contrast") canvas.restore(before);
    applyFilter(filterName, amount);
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
      recordHistory(cutBefore);
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
  trigger.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!trigger.closest(".menu-item").classList.contains("is-open")) trigger.click();
      trigger.closest(".menu-item").querySelector(".dropdown-menu button")?.focus();
    }
  });
});
document.querySelectorAll(".dropdown-menu").forEach((menu, index) => {
  const trigger = menu.closest(".menu-item").querySelector(".menu-trigger");
  menu.id = "app-menu-" + index;
  menu.setAttribute("role", "menu");
  trigger.setAttribute("aria-controls", menu.id);
  const items = [...menu.querySelectorAll("button")];
  items.forEach((item) => item.setAttribute("role", "menuitem"));
  menu.addEventListener("keydown", (event) => {
    const current = items.indexOf(event.target);
    let next = null;
    if (event.key === "ArrowDown") next = (current + 1) % items.length;
    else if (event.key === "ArrowUp") next = (current - 1 + items.length) % items.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      menu.closest(".menu-item").classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
      trigger.focus();
    }
    if (next !== null) { event.preventDefault(); items[next]?.focus(); }
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
  pasteImageBlob(imageFile).catch((error) => showAppMessage(error.message || "Não foi possível colar a imagem."));
});
document.addEventListener("keydown", (event) => {
  if (event.target.closest("textarea, input, select, [contenteditable='true']") || appDialog.open || saveDialog.open) return;
  const key = event.key.toLowerCase();
  if (event.code === "Space" && !event.repeat && !event.target.closest("button, a, select")) { spacePressed = true; event.preventDefault(); return; }
  if (!event.ctrlKey && !event.altKey && !event.metaKey && toolShortcuts[key]) {
    setTool(toolShortcuts[key]);
    return;
  }
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
    document.querySelectorAll(".menu-item.is-open").forEach((item) => {
      item.classList.remove("is-open");
      item.querySelector(".menu-trigger")?.setAttribute("aria-expanded", "false");
    });
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
  // Ctrl+V must reach the browser's paste event so clipboard images can be read.
  else if (event.ctrlKey && key === "a") { event.preventDefault(); action("select-all"); }
  else if (event.key === "Delete") action("delete");
});
document.addEventListener("keyup", (event) => { if (event.code === "Space") spacePressed = false; });
$("#brush-size").dispatchEvent(new Event("input")); updateCanvasStatus();
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(() => {}));
}
window.addEventListener("beforeunload", (event) => {
  if (!isDirty) return;
  event.preventDefault();
  event.returnValue = "";
});
