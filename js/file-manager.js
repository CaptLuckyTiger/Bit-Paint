export function setupFileManager({ paintCanvas, input, onLoaded, onBeforeLoad, onError, getCanvasName }) {
  const open = () => input.click();
  input.addEventListener("change", () => {
    const file = input.files[0]; if (!file) return; const image = new Image();
    onBeforeLoad?.();
    const sourceUrl = URL.createObjectURL(file);
    image.onload = () => {
      try {
        paintCanvas.resize(image.naturalWidth, image.naturalHeight, false, 0, 0, null);
        paintCanvas.context.drawImage(image, 0, 0);
        paintCanvas.notify();
        onLoaded();
      } catch (error) {
        onError(error.message || "Não foi possível abrir esta imagem.");
      } finally {
        URL.revokeObjectURL(sourceUrl);
        input.value = "";
      }
    };
    image.onerror = () => { URL.revokeObjectURL(sourceUrl); input.value = ""; onError("Não foi possível abrir esta imagem."); };
    image.src = sourceUrl;
  });
  const save = async (type = "image/png", name = getCanvasName(), quality = .92) => {
    const blob = await new Promise((resolve) => paintCanvas.element.toBlob(resolve, type, quality));
    if (!blob) throw new Error("Falha ao exportar a imagem.");
    const extension = type.split("/")[1].replace("jpeg", "jpg");
    const baseName = name.trim().replace(/[\\/:*?"<>|]+/g, "-").replace(/\.+$/, "") || getCanvasName();
    const link = document.createElement("a");
    link.download = `${baseName}.${extension}`;
    link.href = URL.createObjectURL(blob);
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  };
  return { open, save };
}
