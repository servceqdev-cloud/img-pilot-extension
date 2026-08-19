import { environmentUnsupported } from "../errors";

export function isCanvasEnvironment(): boolean {
  return typeof document !== "undefined" || typeof OffscreenCanvas !== "undefined";
}

export function assertCanvasEnvironment(feature: string): void {
  if (!isCanvasEnvironment()) {
    throw environmentUnsupported(feature);
  }
}

export type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;

export function createCanvas(width: number, height: number): AnyCanvas {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function get2DContext(canvas: AnyCanvas): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to acquire a 2D canvas context.");
  return ctx as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
}

/** Decodes image bytes into a drawable ImageBitmap. */
export async function bytesToImageBitmap(bytes: Uint8Array, mimeType = "image/png"): Promise<ImageBitmap> {
  assertCanvasEnvironment("createImageBitmap");
  const blob = new Blob([bytes as BlobPart], { type: mimeType });
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(blob);
  }
  // Fallback: <img> + drawImage, wrapped in a bitmap-like object via canvas.
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Failed to decode image."));
      el.src = url;
    });
    const canvas = createCanvas(img.naturalWidth, img.naturalHeight);
    const ctx = get2DContext(canvas);
    (ctx as CanvasRenderingContext2D).drawImage(img, 0, 0);
    return createImageBitmap(canvas as unknown as CanvasImageSource);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Reads canvas contents back out as bytes, encoded to the given mime type. */
export async function canvasToBytes(canvas: AnyCanvas, mimeType: string, quality?: number): Promise<Uint8Array> {
  let blob: Blob;
  if ("convertToBlob" in canvas) {
    blob = await (canvas as OffscreenCanvas).convertToBlob({ type: mimeType, quality });
  } else {
    blob = await new Promise<Blob>((resolve, reject) => {
      (canvas as HTMLCanvasElement).toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Canvas encoding failed."))),
        mimeType,
        quality
      );
    });
  }
  return new Uint8Array(await blob.arrayBuffer());
}
