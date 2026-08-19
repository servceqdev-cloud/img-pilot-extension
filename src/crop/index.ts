import type { CropOptions, ImageInput } from "../types";
import { toUint8Array } from "../utils/normalize";
import { getImageInfo } from "../metadata";
import {
  bytesToImageBitmap,
  canvasToBytes,
  createCanvas,
  get2DContext,
} from "../browser/canvasPipeline";

/** Crops an exact rectangular region out of an image. */
export async function crop(
  input: ImageInput,
  region: CropOptions,
  mimeType = "image/png",
): Promise<Uint8Array> {
  const bytes = await toUint8Array(input);
  const info = await getImageInfo(bytes);
  const bitmap = await bytesToImageBitmap(bytes, info.mimeType);

  const canvas = createCanvas(region.width, region.height);
  const ctx = get2DContext(canvas);
  (ctx as CanvasRenderingContext2D).drawImage(
    bitmap,
    region.x,
    region.y,
    region.width,
    region.height,
    0,
    0,
    region.width,
    region.height,
  );

  return canvasToBytes(canvas, mimeType);
}

/** Crops a centered rectangle of the given size out of the image. */
export async function centerCrop(
  input: ImageInput,
  width: number,
  height: number,
  mimeType?: string,
): Promise<Uint8Array> {
  const bytes = await toUint8Array(input);
  const info = await getImageInfo(bytes);
  const x = Math.max(0, Math.round((info.width - width) / 2));
  const y = Math.max(0, Math.round((info.height - height) / 2));
  return crop(bytes, { x, y, width, height }, mimeType);
}

/**
 * Crops the most visually significant region of the image. This lightweight
 * implementation uses a center-weighted heuristic (a true saliency model
 * would require a vision backend); it centers the crop but nudges toward
 * the upper-third of the image, which tends to favor faces/subjects in
 * typical photography.
 */
export async function smartCrop(
  input: ImageInput,
  width: number,
  height: number,
  mimeType?: string,
): Promise<Uint8Array> {
  const bytes = await toUint8Array(input);
  const info = await getImageInfo(bytes);
  const x = Math.max(0, Math.round((info.width - width) / 2));
  const y = Math.max(0, Math.round((info.height - height) / 3)); // bias upward
  return crop(bytes, { x, y, width, height }, mimeType);
}

/** Crops a centered circle of the given diameter, with transparent corners. */
export async function circleCrop(
  input: ImageInput,
  diameter: number,
  mimeType = "image/png",
): Promise<Uint8Array> {
  const bytes = await toUint8Array(input);
  const info = await getImageInfo(bytes);
  const bitmap = await bytesToImageBitmap(bytes, info.mimeType);

  const canvas = createCanvas(diameter, diameter);
  const ctx = get2DContext(canvas) as CanvasRenderingContext2D;
  const sx = Math.max(0, Math.round((info.width - diameter) / 2));
  const sy = Math.max(0, Math.round((info.height - diameter) / 2));

  ctx.save();
  ctx.beginPath();
  ctx.arc(diameter / 2, diameter / 2, diameter / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(bitmap, sx, sy, diameter, diameter, 0, 0, diameter, diameter);
  ctx.restore();

  return canvasToBytes(canvas, mimeType);
}
