import { toPng } from "html-to-image";

async function waitForImages(node: HTMLElement) {
  const images = Array.from(node.querySelectorAll("img"));

  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete && image.naturalWidth > 0) {
            resolve();
            return;
          }

          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        }),
    ),
  );
}

export async function captureCardPng(node: HTMLElement) {
  await waitForImages(node);

  return toPng(node, {
    pixelRatio: 2,
    cacheBust: true,
  });
}

export async function downloadCardPng(node: HTMLElement, filename: string) {
  const dataUrl = await captureCardPng(node);
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

export async function copyCardPngToClipboard(node: HTMLElement) {
  const dataUrl = await captureCardPng(node);
  const response = await fetch(dataUrl);
  const blob = await response.blob();

  if (!window.ClipboardItem) {
    throw new Error("Clipboard images are not supported in this browser.");
  }

  await navigator.clipboard.write([
    new ClipboardItem({
      "image/png": blob,
    }),
  ]);
}
