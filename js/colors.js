const PALETTE = ["#000000", "#ffffff", "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#6366f1", "#a855f7", "#ec4899", "#92400e", "#374151", "#9ca3af", "#fecaca", "#fed7aa", "#fef08a", "#bbf7d0"];

export function setupColors({ picker, palette, primaryPreview, secondaryPreview }) {
  let primary = picker.value;
  let secondary = "#ffffff";
  const render = () => { picker.value = primary; primaryPreview.style.backgroundColor = primary; secondaryPreview.style.backgroundColor = secondary; };
  PALETTE.forEach((color) => {
    const button = document.createElement("button");
    button.type = "button"; button.title = `Usar ${color}`; button.setAttribute("aria-label", `Usar a cor ${color}`); button.style.backgroundColor = color;
    button.addEventListener("click", () => { primary = color; render(); }); palette.append(button);
  });
  picker.addEventListener("input", () => { primary = picker.value; render(); });
  return { getPrimaryColor: () => primary, getSecondaryColor: () => secondary, swap: () => { [primary, secondary] = [secondary, primary]; render(); }, setPrimary: (value) => { primary = value; render(); } };
}
