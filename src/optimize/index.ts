import type { ImageInput, OptimizeOptions, OptimizeResult, ValidationRules } from "../types";
import { toUint8Array } from "../utils/normalize";
import { getImageInfo } from "../metadata";
import { validateImage } from "../validation";
import { resize } from "../resize";
import { targetSizeCompress, compressImage } from "../compress";

/**
 * The one-stop function: validates, resizes, converts format, compresses,
 * and returns the final bytes plus fresh metadata — in one call.
 *
 * @example
 * const { data, info } = await optimizeImage(file, {
 *   format: "webp",
 *   quality: 80,
 *   width: 1200,
 *   maxSize: "500KB",
 * });
 */
export async function optimizeImage(input: ImageInput, options: OptimizeOptions = {}): Promise<OptimizeResult> {
  let bytes = await toUint8Array(input);
  let info = await getImageInfo(bytes);

  const rules: ValidationRules = {};
  const validation = await validateImage(bytes, rules);
  if (!validation.valid && info.format === "unknown") {
    throw new Error(`Cannot optimize: ${validation.errors.map((e) => e.message).join(" ")}`);
  }

  const targetMime = options.format ? `image/${options.format === "jpeg" ? "jpeg" : options.format}` : info.mimeType;

  if (options.width || options.height) {
    bytes = await resize(
      bytes,
      { width: options.width, height: options.height, maintainAspectRatio: true, fit: "contain" },
      targetMime
    );
    info = await getImageInfo(bytes);
  } else if (options.format) {
    // Format-only conversion: re-encode through the resize pipeline at native size.
    bytes = await resize(bytes, { width: info.width, height: info.height, fit: "fill" }, targetMime);
    info = await getImageInfo(bytes);
  }

  if (options.maxSize !== undefined) {
    bytes = await targetSizeCompress(bytes, options.maxSize);
  } else if (options.quality !== undefined) {
    bytes = await compressImage(bytes, { quality: options.quality });
  }

  info = await getImageInfo(bytes);
  return { data: bytes, info };
}

/** Runs `optimizeImage` over many inputs concurrently, capped at `concurrency` in-flight operations. */
export async function optimizeMany(
  inputs: ImageInput[],
  options: OptimizeOptions = {},
  concurrency = 4
): Promise<OptimizeResult[]> {
  return runWithConcurrency(inputs, concurrency, (input) => optimizeImage(input, options));
}

/** Runs `validateImage` over many inputs concurrently. */
export async function validateMany(inputs: ImageInput[], rules: ValidationRules = {}, concurrency = 4) {
  return runWithConcurrency(inputs, concurrency, (input) => validateImage(input, rules));
}

/** Runs `compressImage` over many inputs concurrently. */
export async function compressMany(
  inputs: ImageInput[],
  options: { quality?: number } = {},
  concurrency = 4
): Promise<Uint8Array[]> {
  return runWithConcurrency(inputs, concurrency, (input) => compressImage(input, options));
}

async function runWithConcurrency<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
