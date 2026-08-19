import type { ImageInput, ResizeOptions } from "../types";
import { toUint8Array } from "../utils/normalize";
import { getImageInfo } from "../metadata";
import { bytesToImageBitmap, canvasToBytes, createCanvas, get2DContext } from "../browser/canvasPipeline";
import { invalidInput } from "../errors";

function computeTargetSize(
  srcWidth: number,
  srcHeight: number,
  opts: ResizeOptions
): { width: number; height: number; drawWidth: number; drawHeight: number; dx: number; dy: number } {
  const fit = opts.fit ?? "contain";
  const maintain = opts.maintainAspectRatio ?? true;

  let targetWidth = opts.width ?? srcWidth;
  let targetHeight = opts.height ?? srcHeight;

  if (!opts.width && opts.height) {
    targetWidth = maintain ? Math.round((opts.height / srcHeight) * srcWidth) : srcWidth;
  }
  if (!opts.height && opts.width) {
    targetHeight = maintain ? Math.round((opts.width / srcWidth) * srcHeight) : srcHeight;
  }

  if (fit === "fill" || !maintain) {
    return { width: targetWidth, height: targetHeight, drawWidth: targetWidth, drawHeight: targetHeight, dx: 0, dy: 0 };
  }

  const srcRatio = srcWidth / srcHeight;
  const targetRatio = targetWidth / targetHeight;

  if (fit === "contain") {
    let drawWidth = targetWidth;
    let drawHeight = targetHeight;
    if (srcRatio > targetRatio) {
      drawHeight = Math.round(targetWidth / srcRatio);
    } else {
      drawWidth = Math.round(targetHeight * srcRatio);
    }
    return {
      width: targetWidth,
      height: targetHeight,
      drawWidth,
      drawHeight,
      dx: Math.round((targetWidth - drawWidth) / 2),
      dy: Math.round((targetHeight - drawHeight) / 2),
    };
  }

  // cover: canvas is fully filled, image is cropped
  return { width: targetWidth, height: targetHeight, drawWidth: targetWidth, drawHeight: targetHeight, dx: 0, dy: 0 };
}

/**
 * Resizes an image according to `fit` semantics ("contain" | "cover" | "fill").
 * Runs on the browser Canvas/OffscreenCanvas backend.
 */
export async function resize(input: ImageInput, options: ResizeOptions, mimeType = "image/png"): Promise<Uint8Array> {
  if (!options.width && !options.height) {
    throw invalidInput("resize() requires at least a width or a height.", "Pass { width } and/or { height }.");
  }

  const bytes = await toUint8Array(input);
  const info = await getImageInfo(bytes);
  const bitmap = await bytesToImageBitmap(bytes, info.mimeType);

  const { width, height, drawWidth, drawHeight, dx, dy } = computeTargetSize(info.width, info.height, options);
  const canvas = createCanvas(width, height);
  const ctx = get2DContext(canvas);

  if (options.fit === "cover" && (options.maintainAspectRatio ?? true)) {
    const srcRatio = info.width / info.height;
    const targetRatio = width / height;
    let sx = 0,
      sy = 0,
      sw = info.width,
      sh = info.height;
    if (srcRatio > targetRatio) {
      sw = Math.round(info.height * targetRatio);
      sx = Math.round((info.width - sw) / 2);
    } else {
      sh = Math.round(info.width / targetRatio);
      sy = Math.round((info.height - sh) / 2);
    }
    (ctx as CanvasRenderingContext2D).drawImage(bitmap, sx, sy, sw, sh, 0, 0, width, height);
  } else {
    (ctx as CanvasRenderingContext2D).drawImage(bitmap, dx, dy, drawWidth, drawHeight);
  }

  return canvasToBytes(canvas, mimeType);
}

export async function resizeWidth(input: ImageInput, width: number, mimeType?: string): Promise<Uint8Array> {
  return resize(input, { width, maintainAspectRatio: true }, mimeType);
}

export async function resizeHeight(input: ImageInput, height: number, mimeType?: string): Promise<Uint8Array> {
  return resize(input, { height, maintainAspectRatio: true }, mimeType);
}

export async function resizeContain(input: ImageInput, width: number, height: number, mimeType?: string): Promise<Uint8Array> {
  return resize(input, { width, height, fit: "contain" }, mimeType);
}

export async function resizeCover(input: ImageInput, width: number, height: number, mimeType?: string): Promise<Uint8Array> {
  return resize(input, { width, height, fit: "cover" }, mimeType);
}

export async function resizeFill(input: ImageInput, width: number, height: number, mimeType?: string): Promise<Uint8Array> {
  return resize(input, { width, height, fit: "fill", maintainAspectRatio: false }, mimeType);
}
