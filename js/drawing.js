function sameColor(data, index, color, tolerance) {
  return Math.abs(data[index] - color[0]) <= tolerance && Math.abs(data[index + 1] - color[1]) <= tolerance && Math.abs(data[index + 2] - color[2]) <= tolerance && data[index + 3] === color[3];
}

function hexRgb(hex) {
  const value = hex.replace("#", "");
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16), 255];
}

function floodFill(context, point, color) {
  const width = context.canvas.width; const height = context.canvas.height; const image = context.getImageData(0, 0, width, height); const target = image.data; const start = (Math.floor(point.y) * width + Math.floor(point.x)) * 4; const source = [target[start], target[start + 1], target[start + 2], target[start + 3]]; const replacement = hexRgb(color);
  if (source.every((value, index) => value === replacement[index])) return;
  const queue = [[Math.floor(point.x), Math.floor(point.y)]]; const visited = new Uint8Array(width * height); const tolerance = 18;
  while (queue.length) {
    const [x, y] = queue.pop(); if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const position = y * width + x; if (visited[position]) continue; visited[position] = 1;
    const index = position * 4; if (!sameColor(target, index, source, tolerance)) continue;
    target[index] = replacement[0]; target[index + 1] = replacement[1]; target[index + 2] = replacement[2]; target[index + 3] = 255;
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  context.putImageData(image, 0, 0);
}

function polygonPath(context, points) {
  context.beginPath();
  context.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([x, y]) => context.lineTo(x, y));
  context.closePath();
}

function starPoints(cx, cy, outer, inner, count = 5) {
  return Array.from({ length: count * 2 }, (_, index) => {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + index * Math.PI / count;
    return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
  });
}

function regularPolygonPoints(cx, cy, radius, sides, rotation = 0) {
  return Array.from({ length: sides }, (_, index) => {
    const angle = rotation + index * Math.PI * 2 / sides;
    return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
  });
}

function drawShape(context, tool, start, point, options) {
  const x = Math.min(start.x, point.x); const y = Math.min(start.y, point.y);
  const w = Math.abs(point.x - start.x); const h = Math.abs(point.y - start.y);
  const cx = x + w / 2; const cy = y + h / 2;
  if (tool === "line") { context.beginPath(); context.moveTo(start.x, start.y); context.lineTo(point.x, point.y); }
  else if (tool === "rectangle") { context.beginPath(); context.rect(x, y, w, h); }
  else if (tool === "round-rectangle") { context.beginPath(); context.roundRect(x, y, w, h, Math.min(18, Math.min(w, h) / 4)); }
  else if (tool === "ellipse") { context.beginPath(); context.ellipse(cx, cy, Math.max(w / 2, 1), Math.max(h / 2, 1), 0, 0, Math.PI * 2); }
  else if (tool === "triangle") polygonPath(context, [[cx, y], [x + w, y + h], [x, y + h]]);
  else if (tool === "diamond") polygonPath(context, [[cx, y], [x + w, cy], [cx, y + h], [x, cy]]);
  else if (tool === "star") polygonPath(context, starPoints(cx, cy, Math.max(w, h) / 2, Math.max(w, h) / 4, 5));
  else if (tool === "arrow") polygonPath(context, [[x, cy - h * .18], [x + w * .55, cy - h * .18], [x + w * .55, y], [x + w, cy], [x + w * .55, y + h], [x + w * .55, cy + h * .18], [x, cy + h * .18]]);
  else if (tool === "pentagon") polygonPath(context, regularPolygonPoints(cx, cy, Math.min(w, h) / 2, 5, -Math.PI / 2));
  else if (tool === "hexagon") polygonPath(context, regularPolygonPoints(cx, cy, Math.min(w, h) / 2, 6, Math.PI / 6));
  else if (tool === "parallelogram") polygonPath(context, [[x + w * .2, y], [x + w, y], [x + w * .8, y + h], [x, y + h]]);
  else if (tool === "trapezoid") polygonPath(context, [[x + w * .2, y], [x + w * .8, y], [x + w, y + h], [x, y + h]]);
  else if (tool === "right-triangle") polygonPath(context, [[x, y], [x, y + h], [x + w, y + h]]);
  else if (tool === "heart") {
    context.beginPath();
    context.moveTo(cx, y + h);
    context.bezierCurveTo(x + w * .1, y + h * .65, x + w * .05, y + h * .25, x + w * .28, y + h * .18);
    context.bezierCurveTo(x + w * .4, y + h * .14, cx, y + h * .22, cx, y + h * .34);
    context.bezierCurveTo(cx, y + h * .22, x + w * .6, y + h * .14, x + w * .72, y + h * .18);
    context.bezierCurveTo(x + w * .95, y + h * .25, x + w * .9, y + h * .65, cx, y + h);
  } else if (tool === "cloud") {
    context.beginPath(); context.moveTo(x + w * .15, y + h * .75);
    context.bezierCurveTo(x - w * .02, y + h * .48, x + w * .18, y + h * .2, x + w * .4, y + h * .28);
    context.bezierCurveTo(x + w * .5, y - h * .02, x + w * .82, y + h * .02, x + w * .84, y + h * .3);
    context.bezierCurveTo(x + w * 1.1, y + h * .2, x + w * 1.12, y + h * .75, x + w * .85, y + h * .78);
    context.lineTo(x + w * .15, y + h * .78); context.closePath();
  } else if (tool === "lightning") polygonPath(context, [[x + w * .55, y], [x + w * .18, y + h * .55], [x + w * .45, y + h * .55], [x + w * .3, y + h], [x + w * .82, y + h * .35], [x + w * .53, y + h * .35]]);
  else if (tool === "cylinder") {
    context.beginPath(); context.ellipse(cx, y + h * .16, w / 2, Math.max(1, h * .16), 0, 0, Math.PI * 2);
    context.moveTo(x, y + h * .16); context.lineTo(x, y + h * .82);
    context.ellipse(cx, y + h * .82, w / 2, Math.max(1, h * .16), 0, 0, Math.PI);
    context.lineTo(x, y + h * .16);
  }
  else if (tool === "speech") {
    context.beginPath(); context.roundRect(x, y, w, h * .78, Math.min(14, Math.min(w, h) / 5));
    context.moveTo(x + w * .22, y + h * .78); context.lineTo(x + w * .12, y + h); context.lineTo(x + w * .42, y + h * .78);
  }
  if (options.filled && tool !== "line") { context.fillStyle = options.shapeFill; context.fill(); }
  context.stroke();
}

export function setupDrawing({ paintCanvas, getTool, getColor, getSize, getOptions, onCursorMove, onCommit, onBegin, onPickColor, onSelection, onTextStart, onMagnify, onCursorStyle }) {
  const canvas = paintCanvas.element; const context = paintCanvas.context; let active = false; let moving = false; let resizeMode = null; let start = null; let backup = null; let selection = null; let movingImage = null; let selectionSource = null; let canvasChanged = false;
  const stroke = () => { context.strokeStyle = getColor(); context.lineWidth = getSize(); context.lineCap = getOptions().brushType === "pencil" ? "square" : "round"; context.lineJoin = "round"; };
  const shapeTools = ["line", "rectangle", "round-rectangle", "ellipse", "triangle", "diamond", "star", "arrow", "speech", "pentagon", "hexagon", "parallelogram", "trapezoid", "right-triangle", "heart", "cloud", "lightning", "cylinder"];
  const shape = (point) => drawShape(context, getTool(), start, point, { ...getOptions(), shapeFill: getColor() });
  const spray = (point) => {
    const radius = Math.max(8, getSize() * 2); const dots = Math.max(12, getSize() * 4);
    context.fillStyle = getColor();
    for (let index = 0; index < dots; index += 1) {
      const angle = Math.random() * Math.PI * 2; const distance = Math.sqrt(Math.random()) * radius;
      context.fillRect(point.x + Math.cos(angle) * distance, point.y + Math.sin(angle) * distance, 1, 1);
    }
  };
  const crayon = (point) => {
    const size = Math.max(2, getSize()); const roughness = Math.max(3, Math.round(size / 2));
    context.fillStyle = getColor(); context.globalAlpha = .68;
    for (let index = 0; index < roughness; index += 1) {
      const offsetX = (Math.random() - .5) * size; const offsetY = (Math.random() - .5) * size;
      context.fillRect(point.x + offsetX, point.y + offsetY, Math.max(1, size / 3), Math.max(1, size / 3));
    }
    context.globalAlpha = 1;
  };
  const texturedBrush = (point, type) => {
    const size = Math.max(2, getSize());
    if (type === "oil") {
      context.globalAlpha = .72;
      context.fillStyle = getColor();
      for (let index = 0; index < Math.max(4, size); index += 1) {
        const offset = (Math.random() - .5) * size * .65;
        context.beginPath();
        context.ellipse(point.x + offset, point.y + (Math.random() - .5) * size * .35, size * (.35 + Math.random() * .35), size * (.18 + Math.random() * .2), Math.random() * Math.PI, 0, Math.PI * 2);
        context.fill();
      }
    } else if (type === "watercolor") {
      context.globalAlpha = .1;
      context.fillStyle = getColor();
      context.beginPath();
      context.arc(point.x, point.y, size * (1.1 + Math.random() * .35), 0, Math.PI * 2);
      context.fill();
    } else if (type === "natural") {
      context.globalAlpha = .55;
      context.strokeStyle = getColor();
      context.lineWidth = size * (.7 + Math.random() * .6);
      context.lineCap = "round";
      context.beginPath();
      context.moveTo(point.x - size * .3, point.y + (Math.random() - .5) * size * .5);
      context.lineTo(point.x + size * .3, point.y + (Math.random() - .5) * size * .5);
      context.stroke();
    } else if (type === "calligraphy") {
      context.globalAlpha = .9;
      context.strokeStyle = getColor();
      context.lineWidth = Math.max(1, size * .28);
      context.lineCap = "butt";
      context.beginPath();
      context.moveTo(point.x - size, point.y + size * .55);
      context.lineTo(point.x + size, point.y - size * .55);
      context.stroke();
    }
    context.globalAlpha = 1;
  };
  const selectionHandle = (point) => {
    if (!selection || selection.width < 1 || selection.height < 1) return null;
    const scale = canvas.getBoundingClientRect().width / canvas.width;
    const edge = Math.max(10, getSize() * 2, 10 / Math.max(scale, .1));
    const left = Math.abs(point.x - selection.x) <= edge;
    const right = Math.abs(point.x - (selection.x + selection.width)) <= edge;
    const top = Math.abs(point.y - selection.y) <= edge;
    const bottom = Math.abs(point.y - (selection.y + selection.height)) <= edge;
    const insideX = point.x >= selection.x - edge && point.x <= selection.x + selection.width + edge;
    const insideY = point.y >= selection.y - edge && point.y <= selection.y + selection.height + edge;
    if (!insideX || !insideY) return null;
    if (left && top) return "nw"; if (right && top) return "ne";
    if (left && bottom) return "sw"; if (right && bottom) return "se";
    if (left && point.y >= selection.y && point.y <= selection.y + selection.height) return "w";
    if (right && point.y >= selection.y && point.y <= selection.y + selection.height) return "e";
    if (top && point.x >= selection.x && point.x <= selection.x + selection.width) return "n";
    if (bottom && point.x >= selection.x && point.x <= selection.x + selection.width) return "s";
    return null;
  };
  const resizedSelection = (point) => {
    const original = selection;
    let left = original.x; let top = original.y;
    let right = original.x + original.width; let bottom = original.y + original.height;
    if (resizeMode.includes("w")) left = point.x;
    if (resizeMode.includes("e")) right = point.x;
    if (resizeMode.includes("n")) top = point.y;
    if (resizeMode.includes("s")) bottom = point.y;
    const x = Math.max(0, Math.min(left, right));
    const y = Math.max(0, Math.min(top, bottom));
    const maxX = Math.min(canvas.width, Math.max(left, right));
    const maxY = Math.min(canvas.height, Math.max(top, bottom));
    return { x, y, width: Math.max(1, Math.round(maxX - x)), height: Math.max(1, Math.round(maxY - y)) };
  };
  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return; const point = paintCanvas.getPoint(event); onCursorMove(point);
    if (getTool() === "picker") { onPickColor(context.getImageData(Math.floor(point.x), Math.floor(point.y), 1, 1).data); return; }
    if (getTool() === "magnifier") { onMagnify(event.shiftKey ? -1 : 1); return; }
    if (getTool() === "fill") { onBegin(); floodFill(context, point, getColor()); paintCanvas.notify(); onCommit(); return; }
    if (getTool() === "text") { onTextStart(point); return; }
    active = true; start = point; canvasChanged = getTool() !== "select";
    if (getTool() === "select") {
      if (selection) {
        resizeMode = selectionHandle(point);
        const inside = point.x >= selection.x && point.x <= selection.x + selection.width && point.y >= selection.y && point.y <= selection.y + selection.height;
        if (resizeMode || inside) {
          onBegin(); backup = paintCanvas.snapshot(); canvasChanged = true;
          if (resizeMode) {
            if (!selectionSource) selectionSource = context.getImageData(selection.x, selection.y, selection.width, selection.height);
            movingImage = selectionSource;
          } else {
            moving = true; movingImage = context.getImageData(selection.x, selection.y, selection.width, selection.height);
          }
        } else {
          selection = null; selectionSource = null; onSelection(null);
        }
      }
    } else {
      onBegin(); backup = paintCanvas.snapshot();
    }
    if (canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId); stroke();
    if (getTool() === "pencil" || getTool() === "brush" || getTool() === "eraser") {
      if (getOptions().brushType === "spray") spray(point);
      else if (getOptions().brushType === "crayon") crayon(point);
      else if (["oil", "watercolor", "natural", "calligraphy"].includes(getOptions().brushType)) texturedBrush(point, getOptions().brushType);
      else { context.beginPath(); context.moveTo(point.x, point.y); context.lineTo(point.x + .01, point.y + .01); context.stroke(); }
    }
  });
  canvas.addEventListener("pointermove", (event) => {
    const point = paintCanvas.getPoint(event); onCursorMove(point);
    if (!active) {
      if (getTool() === "select" && selection) {
        const handle = selectionHandle(point);
        onCursorStyle(handle ? `${handle}-resize` : "crosshair");
      }
      return;
    }
    if (shapeTools.includes(getTool())) { paintCanvas.restore(backup); stroke(); shape(point); return; }
    if (getTool() === "select") {
      if (moving && movingImage) {
        paintCanvas.restore(backup);
        const x = Math.round(selection.x + point.x - start.x); const y = Math.round(selection.y + point.y - start.y);
        context.fillStyle = "#ffffff"; context.fillRect(selection.x, selection.y, selection.width, selection.height); context.putImageData(movingImage, x, y);
      } else if (resizeMode && movingImage) {
        paintCanvas.restore(backup);
        const next = resizedSelection(point);
        const temporary = document.createElement("canvas");
        temporary.width = movingImage.width; temporary.height = movingImage.height;
        const temporaryContext = temporary.getContext("2d");
        temporaryContext.imageSmoothingEnabled = false;
        temporaryContext.putImageData(movingImage, 0, 0);
        context.fillStyle = "#ffffff"; context.fillRect(selection.x, selection.y, selection.width, selection.height);
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.drawImage(temporary, next.x, next.y, next.width, next.height);
      } else {
        selection = { x: Math.min(start.x, point.x), y: Math.min(start.y, point.y), width: Math.abs(start.x - point.x), height: Math.abs(start.y - point.y) };
        onSelection(selection);
      }
      return;
    }
    if (getTool() === "eraser") { context.strokeStyle = "#ffffff"; context.lineWidth = getSize() * 2; }
    else stroke();
    if (getOptions().brushType === "spray") spray(point);
    else if (getOptions().brushType === "crayon") crayon(point);
    else if (["oil", "watercolor", "natural", "calligraphy"].includes(getOptions().brushType)) texturedBrush(point, getOptions().brushType);
    else {
      if (getOptions().brushType === "marker") context.globalAlpha = .35;
      context.lineTo(point.x, point.y); context.stroke(); context.globalAlpha = 1;
    }
  });
  const stop = (event) => {
    if (!active) return; const point = paintCanvas.getPoint(event); active = false; if (canvas.hasPointerCapture && canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (getTool() === "select") {
      if (moving && movingImage) {
        selection = { x: Math.round(selection.x + point.x - start.x), y: Math.round(selection.y + point.y - start.y), width: selection.width, height: selection.height };
      } else if (resizeMode && movingImage) {
        selection = resizedSelection(point);
      } else {
        selection = { x: Math.min(start.x, point.x), y: Math.min(start.y, point.y), width: Math.abs(start.x - point.x), height: Math.abs(start.y - point.y) };
        selectionSource = selection.width > 0 && selection.height > 0
          ? context.getImageData(selection.x, selection.y, selection.width, selection.height)
          : null;
      }
      if (moving || resizeMode) {
        selectionSource = selection.width > 0 && selection.height > 0
          ? context.getImageData(selection.x, selection.y, selection.width, selection.height)
          : null;
      }
      onSelection(selection); moving = false; resizeMode = null; movingImage = null; onCursorStyle("crosshair");
    }
    context.closePath();
    if (canvasChanged) { paintCanvas.notify(); onCommit(); }
    backup = null;
  };
  canvas.addEventListener("pointerup", stop); canvas.addEventListener("pointercancel", stop);
  canvas.addEventListener("pointerleave", () => { if (!active) { onCursorMove(null); onCursorStyle("crosshair"); } });
  return {
    setSelection(value) {
      selection = value ? { ...value } : null;
      selectionSource = null;
      moving = false;
      resizeMode = null;
      movingImage = null;
    },
    cancelSelection() {
      if (active && backup) paintCanvas.restore(backup);
      active = false;
      moving = false;
      resizeMode = null;
      start = null;
      backup = null;
      selection = null;
      selectionSource = null;
      movingImage = null;
      canvasChanged = false;
      onSelection(null);
      onCursorStyle("crosshair");
    }
  };
}
