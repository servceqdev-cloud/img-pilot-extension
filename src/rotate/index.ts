import type { ImageInput } from "../types";
import { toUint8Array } from "../utils/normalize";
import { getImageInfo } from "../metadata";
import { bytesToImageBitmap, canvasToBytes, createCanvas, get2DContext } from "../browser/canvasPipeline";

/** Rotates an image clockwise by an arbitrary number of degrees. */
export async function rotate(input: ImageInput, degrees: number, mimeType = "image/png"): Promise<Uint8Array> {
  const bytes = await toUint8Array(input);
  const info = await getImageInfo(bytes);
  const bitmap = await bytesToImageBitmap(bytes, info.mimeType);

  const radians = (degrees * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));
  const width = Math.round(info.width * cos + info.height * sin);
  const height = Math.round(info.width * sin + info.height * cos);

  const canvas = createCanvas(width, height);
  const ctx = get2DContext(canvas) as CanvasRenderingContext2D;
  ctx.translate(width / 2, height / 2);
  ctx.rotate(radians);
  ctx.drawImage(bitmap, -info.width / 2, -info.height / 2);

  return canvasToBytes(canvas, mimeType);
}
