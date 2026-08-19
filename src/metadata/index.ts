import type { ImageInfo, ImageInput } from "../types";
import { toUint8Array } from "../utils/normalize";
import { decodeImageHeader } from "./decode";

/**
 * Reads structural metadata from an image without fully decoding pixels.
 *
 * @example
 * const info = await getImageInfo(file);
 * // { width: 1920, height: 1080, aspectRatio: 1.78, format: "jpeg", ... }
 */
export async function getImageInfo(input: ImageInput): Promise<ImageInfo> {
  const bytes = await toUint8Array(input);
  const header = decodeImageHeader(bytes);

  const width = header.width;
  const height = header.height;
  const aspectRatio = height > 0 ? Number((width / height).toFixed(4)) : 0;

  let orientation: ImageInfo["orientation"] = "square";
  if (width > height) orientation = "landscape";
  else if (height > width) orientation = "portrait";

  return {
    width,
    height,
    aspectRatio,
    format: header.format,
    mimeType: header.mimeType,
    extension: header.extension,
    sizeBytes: bytes.byteLength,
    pixelCount: width * height,
    hasTransparency: header.hasTransparency,
    isAnimated: header.isAnimated,
    orientation,
  };
}
