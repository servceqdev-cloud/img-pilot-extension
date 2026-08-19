import type { ImageInput } from "../types";
import { invalidInput } from "../errors";

const DATA_URL_RE = /^data:([\w/+.-]+);base64,(.*)$/s;

function base64ToBytes(base64: string): Uint8Array {
  if (typeof atob === "function") {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  // Node.js fallback
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const buf = Buffer.from(base64, "base64");
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

/**
 * Converts any supported ImageInput (ArrayBuffer, Uint8Array, Blob, File,
 * base64 string, or data URL string) into a plain Uint8Array of bytes.
 */
export async function toUint8Array(input: ImageInput): Promise<Uint8Array> {
  if (input instanceof Uint8Array) return input;

  if (input instanceof ArrayBuffer) return new Uint8Array(input);

  if (typeof Blob !== "undefined" && input instanceof Blob) {
    const buf = await input.arrayBuffer();
    return new Uint8Array(buf);
  }

  if (typeof input === "string") {
    const dataUrlMatch = DATA_URL_RE.exec(input);
    if (dataUrlMatch) return base64ToBytes(dataUrlMatch[2]);

    // Assume raw base64 if it looks like one.
    if (/^[A-Za-z0-9+/]+={0,2}$/.test(input.trim()) && input.length % 4 === 0) {
      return base64ToBytes(input.trim());
    }

    throw invalidInput(
      "String input must be a data URL or base64-encoded image.",
      "Pass a data URL like 'data:image/png;base64,...' or raw base64 text."
    );
  }

  throw invalidInput(
    "Unsupported image input type.",
    "Pass an ArrayBuffer, Uint8Array, Blob, File, base64 string, or data URL."
  );
}
