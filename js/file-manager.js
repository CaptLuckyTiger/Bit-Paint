export function setupFileManager({ paintCanvas, input, onLoaded, onError, getCanvasName }) {
  const open = () => input.click();
  input.addEventListener("change", () => {
    const file = input.files[0]; if (!file) return; const image = new Image();
    image.onload = () => { paintCanvas.resize(image.naturalWidth, image.naturalHeight, false); paintCanvas.context.drawImage(image, 0, 0); paintCanvas.notify(); onLoaded(); input.value = ""; };
    image.onerror = () => onError("Não foi possível abrir esta imagem."); image.src = URL.createObjectURL(file);
  });
  const save = async (type = "image/png", name = getCanvasName()) => { const blob = await new Promise((resolve) => paintCanvas.element.toBlob(resolve, type, .92)); if (!blob) throw new Error("Could not export the canvas."); const extension = type.split("/")[1].replace("jpeg", "jpg"); const baseName = name.trim().replace(/[\\/:*?"<>|]+/g, "-").replace(/\.+$/, "") || getCanvasName(); const link = document.createElement("a"); link.download = `${baseName}.${extension}`; link.href = URL.createObjectURL(blob); link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000); };
  return { open, save };
}
