import type { ImageInput } from "../types";
import { toUint8Array } from "../utils/normalize";
import { getImageInfo } from "../metadata";
import { bytesToImageBitmap, canvasToBytes, createCanvas, get2DContext } from "../browser/canvasPipeline";

async function flipInternal(input: ImageInput, axis: "horizontal" | "vertical", mimeType: string): Promise<Uint8Array> {
  const bytes = await toUint8Array(input);
  const info = await getImageInfo(bytes);
  const bitmap = await bytesToImageBitmap(bytes, info.mimeType);

  const canvas = createCanvas(info.width, info.height);
  const ctx = get2DContext(canvas) as CanvasRenderingContext2D;
  if (axis === "horizontal") {
    ctx.translate(info.width, 0);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(0, info.height);
    ctx.scale(1, -1);
  }
  ctx.drawImage(bitmap, 0, 0);

  return canvasToBytes(canvas, mimeType);
}

/** Flips an image. Defaults to horizontal (left-right) flip. */
export async function flip(input: ImageInput, axis: "horizontal" | "vertical" = "horizontal", mimeType = "image/png"): Promise<Uint8Array> {
  return flipInternal(input, axis, mimeType);
}

/** Alias for a horizontal flip, matching common naming ("mirror image"). */
export async function mirror(input: ImageInput, mimeType = "image/png"): Promise<Uint8Array> {
  return flipInternal(input, "horizontal", mimeType);
}
