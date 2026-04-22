import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * Capture a DOM node and download it as PNG.
 */
export async function exportNodeAsImage(node: HTMLElement, filename: string) {
  const canvas = await html2canvas(node, {
    backgroundColor: getComputedColor("--background") || "#0a0a0a",
    scale: 2,
    useCORS: true,
    logging: false,
  });
  const dataUrl = canvas.toDataURL("image/png");
  triggerDownload(dataUrl, filename.endsWith(".png") ? filename : `${filename}.png`);
}

/**
 * Capture a DOM node and produce a multi-page A4 PDF (auto-paginated).
 */
export async function exportNodeAsPdf(node: HTMLElement, filename: string) {
  const canvas = await html2canvas(node, {
    backgroundColor: getComputedColor("--background") || "#0a0a0a",
    scale: 2,
    useCORS: true,
    logging: false,
  });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const margin = 24;
  const usableWidth = pageWidth - margin * 2;
  const ratio = canvas.height / canvas.width;
  const imgWidth = usableWidth;
  const imgHeight = imgWidth * ratio;

  if (imgHeight <= pageHeight - margin * 2) {
    pdf.addImage(imgData, "PNG", margin, margin, imgWidth, imgHeight);
  } else {
    // Slice the canvas vertically to paginate
    const pageCanvas = document.createElement("canvas");
    const pageCtx = pageCanvas.getContext("2d")!;
    const sliceHeightPx = (canvas.width * (pageHeight - margin * 2)) / usableWidth;

    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeightPx;

    let yOffset = 0;
    let pageIdx = 0;
    while (yOffset < canvas.height) {
      const remaining = canvas.height - yOffset;
      const sliceH = Math.min(sliceHeightPx, remaining);
      pageCanvas.height = sliceH;
      pageCtx.fillStyle = getComputedColor("--background") || "#0a0a0a";
      pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      pageCtx.drawImage(canvas, 0, yOffset, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
      const pageData = pageCanvas.toDataURL("image/png");
      const renderH = (sliceH / canvas.width) * usableWidth;
      if (pageIdx > 0) pdf.addPage();
      pdf.addImage(pageData, "PNG", margin, margin, imgWidth, renderH);
      yOffset += sliceH;
      pageIdx++;
    }
  }

  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

/**
 * Capture a DOM node and download it as a square PNG sized for social
 * platforms (default 1080×1080). The node is rendered onto a centered
 * canvas with the app background so the resulting image is share-ready.
 */
export async function exportNodeAsSquareImage(
  node: HTMLElement,
  filename: string,
  size = 1080,
) {
  const bg = getComputedColor("--background") || "#0a0a0a";
  const captured = await html2canvas(node, {
    backgroundColor: null,
    scale: 3,
    useCORS: true,
    logging: false,
  });

  const square = document.createElement("canvas");
  square.width = size;
  square.height = size;
  const ctx = square.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // Fit the captured node inside the square with padding
  const padding = Math.round(size * 0.06);
  const maxInner = size - padding * 2;
  const ratio = Math.min(maxInner / captured.width, maxInner / captured.height);
  const drawW = Math.round(captured.width * ratio);
  const drawH = Math.round(captured.height * ratio);
  const dx = Math.round((size - drawW) / 2);
  const dy = Math.round((size - drawH) / 2);
  ctx.drawImage(captured, dx, dy, drawW, drawH);

  const dataUrl = square.toDataURL("image/png");
  triggerDownload(dataUrl, filename.endsWith(".png") ? filename : `${filename}.png`);
}

function triggerDownload(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function getComputedColor(varName: string): string | null {
  if (typeof window === "undefined") return null;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  if (!raw) return null;
  // CSS var stores HSL components like "240 10% 4%"
  return `hsl(${raw})`;
}
