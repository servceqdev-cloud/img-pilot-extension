import { environmentUnsupported } from "../errors";

export function isNodeEnvironment(): boolean {
  return typeof process !== "undefined" && !!process.versions?.node;
}

let cachedSharp: unknown | null = null;

/**
 * Lazily loads the optional 'sharp' peer dependency. Sharp is never bundled
 * or required unless the consumer is running in Node and actually calls a
 * pixel-processing function — keeping the browser bundle and the base
 * install free of native dependencies.
 */
export async function loadSharp(): Promise<any> {
  if (cachedSharp) return cachedSharp;
  try {
    // Using a dynamic, non-literal-adjacent import so bundlers targeting the
    // browser don't try to resolve 'sharp' at build time.
    const specifier = "sharp";
    const mod = await import(/* webpackIgnore: true */ specifier);
    cachedSharp = (mod as any).default ?? mod;
    return cachedSharp;
  } catch (err) {
    throw environmentUnsupported("Sharp-backed Node.js image processing");
  }
}

/**
 * Runs a Sharp pipeline over raw image bytes. `configure` receives the Sharp
 * instance to chain `.resize()`, `.rotate()`, `.toFormat()`, etc.
 */
export async function withSharp(
  bytes: Uint8Array,
  configure: (sharpInstance: any) => any
): Promise<Uint8Array> {
  const sharp = await loadSharp();
  const instance = configure(sharp(Buffer.from(bytes)));
  const buffer: Buffer = await instance.toBuffer();
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}
