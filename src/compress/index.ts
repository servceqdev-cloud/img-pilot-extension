import type { CompressOptions, ImageInput } from "../types";
import { toUint8Array } from "../utils/normalize";
import { getImageInfo } from "../metadata";
import { parseSize } from "../utils/units";
import { isNodeEnvironment, withSharp } from "../node/sharpAdapter";
import { bytesToImageBitmap, canvasToBytes, createCanvas, get2DContext } from "../browser/canvasPipeline";

/** Re-encodes image bytes at a given quality (0-100), same format in, same format out. */
async function reencode(bytes: Uint8Array, mimeType: string, quality: number): Promise<Uint8Array> {
  if (isNodeEnvironment()) {
    const format = mimeType.split("/")[1]?.replace("jpeg", "jpg") as "jpg" | "png" | "webp";
    return withSharp(bytes, (img) =>
      format === "png" ? img.png({ quality }) : format === "webp" ? img.webp({ quality }) : img.jpeg({ quality })
    );
  }
  const bitmap = await bytesToImageBitmap(bytes, mimeType);
  const canvas = createCanvas(bitmap.width, bitmap.height);
  const ctx = get2DContext(canvas) as CanvasRenderingContext2D;
  ctx.drawImage(bitmap, 0, 0);
  return canvasToBytes(canvas, mimeType, quality / 100);
}

/** Compresses an image at a fixed quality level (default 80). */
export async function compressImage(input: ImageInput, options: CompressOptions = {}): Promise<Uint8Array> {
  const bytes = await toUint8Array(input);
  const info = await getImageInfo(bytes);
  const quality = options.quality ?? 80;
  return reencode(bytes, info.mimeType, quality);
}

/** Re-encodes at a high, visually-lossless quality (95). PNG stays untouched since it's already lossless. */
export async function losslessCompress(input: ImageInput): Promise<Uint8Array> {
  const bytes = await toUint8Array(input);
  const info = await getImageInfo(bytes);
  if (info.format === "png") return bytes;
  return reencode(bytes, info.mimeType, 100);
}

/** Re-encodes at a lower quality favoring smaller file size over fidelity. */
export async function lossyCompress(input: ImageInput, quality = 60): Promise<Uint8Array> {
  const bytes = await toUint8Array(input);
  const info = await getImageInfo(bytes);
  return reencode(bytes, info.mimeType, quality);
}

/**
 * Binary-searches the quality parameter until the encoded output fits under
 * `maxSize`, or the search bottoms out at quality 1.
 */
export async function targetSizeCompress(input: ImageInput, maxSize: string | number): Promise<Uint8Array> {
  const bytes = await toUint8Array(input);
  const info = await getImageInfo(bytes);
  const targetBytes = parseSize(maxSize);

  if (bytes.byteLength <= targetBytes) return bytes;

  let low = 1;
  let high = 95;
  let best: Uint8Array = bytes;

  for (let i = 0; i < 6; i++) {
    const mid = Math.round((low + high) / 2);
    const candidate = await reencode(bytes, info.mimeType, mid);
    if (candidate.byteLength <= targetBytes) {
      best = candidate;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
    if (low > high) break;
  }

  return best;
}

/**
 * Picks a sensible strategy automatically: if a `maxSize` is given it targets
 * that size; otherwise it applies a balanced default compression (quality 75).
 */
export async function smartCompress(input: ImageInput, options: CompressOptions = {}): Promise<Uint8Array> {
  if (options.maxSize !== undefined) {
    return targetSizeCompress(input, options.maxSize);
  }
  return compressImage(input, { quality: options.quality ?? 75 });
}
