import { toUint8Array } from "../utils/normalize";
import type { ImageInput, ImageFormat } from "../types";
import { getImageInfo } from "../metadata";

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof btoa === "function") {
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }
  return Buffer.from(bytes).toString("base64");
}

/** Converts image bytes to a raw base64 string (no data URL prefix). */
export async function toBase64(input: ImageInput): Promise<string> {
  const bytes = await toUint8Array(input);
  return bytesToBase64(bytes);
}

/** Converts a base64 (or data URL) string back into raw bytes. */
export async function fromBase64(base64: string): Promise<Uint8Array> {
  return toUint8Array(base64);
}

/** Converts image bytes into a `data:<mime>;base64,...` data URL. */
export async function toDataURL(input: ImageInput, mimeType?: ImageFormat | string): Promise<string> {
  const bytes = await toUint8Array(input);
  const base64 = bytesToBase64(bytes);
  let mime = mimeType;
  if (!mime) {
    const info = await getImageInfo(bytes);
    mime = info.mimeType;
  } else if (!mime.includes("/")) {
    mime = `image/${mime === "jpg" ? "jpeg" : mime}`;
  }
  return `data:${mime};base64,${base64}`;
}
