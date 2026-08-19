import type { ImageInput } from "../types";
import { toUint8Array } from "../utils/normalize";

/** Normalizes any ImageInput into a Uint8Array. */
export async function toUint8ArrayPublic(input: ImageInput): Promise<Uint8Array> {
  return toUint8Array(input);
}

/** Converts any ImageInput into a Node.js/browser-compatible ArrayBuffer. */
export async function toArrayBuffer(input: ImageInput): Promise<ArrayBuffer> {
  const bytes = await toUint8Array(input);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

/** Converts any ImageInput into a Node.js Buffer. Throws in non-Node environments. */
export async function toBuffer(input: ImageInput): Promise<Buffer> {
  if (typeof Buffer === "undefined") {
    throw new Error("toBuffer() requires a Node.js environment. Use toUint8Array() or toArrayBuffer() in the browser.");
  }
  const bytes = await toUint8Array(input);
  return Buffer.from(bytes);
}

/** Converts any ImageInput into a browser Blob. Throws in non-browser environments. */
export async function toBlob(input: ImageInput, mimeType?: string): Promise<Blob> {
  if (typeof Blob === "undefined") {
    throw new Error("toBlob() requires a browser environment (or a Blob polyfill).");
  }
  const bytes = await toUint8Array(input);
  return new Blob([bytes as BlobPart], mimeType ? { type: mimeType } : undefined);
}

/** Converts any ImageInput into a browser File. Throws in non-browser environments. */
export async function toFile(input: ImageInput, filename: string, mimeType?: string): Promise<File> {
  if (typeof File === "undefined") {
    throw new Error("toFile() requires a browser environment (or a File polyfill).");
  }
  const bytes = await toUint8Array(input);
  return new File([bytes as BlobPart], filename, mimeType ? { type: mimeType } : undefined);
}

export { toBase64, fromBase64, toDataURL } from "../base64";
