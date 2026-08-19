import type { ImageFormat } from "../types";

export interface DecodedHeader {
  format: ImageFormat | "unknown";
  mimeType: string;
  extension: string;
  width: number;
  height: number;
  hasTransparency: boolean;
  isAnimated: boolean;
}

const FORMAT_META: Record<ImageFormat, { mime: string; ext: string }> = {
  png: { mime: "image/png", ext: "png" },
  jpeg: { mime: "image/jpeg", ext: "jpg" },
  webp: { mime: "image/webp", ext: "webp" },
  gif: { mime: "image/gif", ext: "gif" },
  bmp: { mime: "image/bmp", ext: "bmp" },
  avif: { mime: "image/avif", ext: "avif" },
  tiff: { mime: "image/tiff", ext: "tiff" },
};

function unknownHeader(): DecodedHeader {
  return {
    format: "unknown",
    mimeType: "application/octet-stream",
    extension: "",
    width: 0,
    height: 0,
    hasTransparency: false,
    isAnimated: false,
  };
}

/**
 * Reads just enough of an image's binary header to determine its format,
 * dimensions, and a few structural flags (transparency / animation), without
 * decoding pixel data. Pure JS, works identically in Node and the browser.
 *
 * Supported: PNG, JPEG, GIF, WEBP (VP8/VP8L/VP8X), BMP.
 * AVIF/TIFF are format-detected but dimensions are left at 0 (would require
 * a full ISOBMFF/IFD parser) — the `format` field is still reliable so
 * validation rules on `formats`/`extensions` still work.
 */
export function decodeImageHeader(bytes: Uint8Array): DecodedHeader {
  if (bytes.length === 0) return unknownHeader();

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 24 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    const width = view.getUint32(16, false);
    const height = view.getUint32(20, false);
    const colorType = bytes[25];
    // Color type 4 (grayscale+alpha) or 6 (RGBA) implies an alpha channel.
    const hasTransparency = colorType === 4 || colorType === 6;
    const isAnimated = containsAscii(bytes, "acTL"); // APNG marker chunk
    return {
      format: "png",
      ...FORMAT_META.png,
      mimeType: FORMAT_META.png.mime,
      extension: FORMAT_META.png.ext,
      width,
      height,
      hasTransparency,
      isAnimated,
    };
  }

  // JPEG: FF D8, then scan markers for SOF0/SOF2 to find dimensions.
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = bytes[offset + 1];
      const isSOF =
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf);
      const segmentLength = view.getUint16(offset + 2, false);
      if (isSOF) {
        const height = view.getUint16(offset + 5, false);
        const width = view.getUint16(offset + 7, false);
        return {
          format: "jpeg",
          mimeType: FORMAT_META.jpeg.mime,
          extension: FORMAT_META.jpeg.ext,
          width,
          height,
          hasTransparency: false,
          isAnimated: false,
        };
      }
      if (marker === 0xd8 || marker === 0xd9) {
        offset += 2;
        continue;
      }
      offset += 2 + segmentLength;
    }
    return {
      format: "jpeg",
      mimeType: FORMAT_META.jpeg.mime,
      extension: FORMAT_META.jpeg.ext,
      width: 0,
      height: 0,
      hasTransparency: false,
      isAnimated: false,
    };
  }

  // GIF: "GIF87a" or "GIF89a"
  if (bytes.length >= 10 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    const width = view.getUint16(6, true);
    const height = view.getUint16(8, true);
    // Multiple image descriptors (0x2C bytes) after the header indicate animation.
    let frameCount = 0;
    for (let i = 13; i < bytes.length - 1 && frameCount < 2; i++) {
      if (bytes[i] === 0x2c) frameCount++;
    }
    return {
      format: "gif",
      mimeType: FORMAT_META.gif.mime,
      extension: FORMAT_META.gif.ext,
      width,
      height,
      hasTransparency: true, // GIF supports 1-bit transparency; treated conservatively as true
      isAnimated: frameCount > 1,
    };
  }

  // WEBP: "RIFF"...."WEBP"
  if (
    bytes.length >= 30 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    const chunk = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
    let width = 0;
    let height = 0;
    let hasTransparency = false;
    let isAnimated = false;

    if (chunk === "VP8X") {
      const flags = bytes[20];
      hasTransparency = !!(flags & 0x10);
      isAnimated = !!(flags & 0x02);
      width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
      height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
    } else if (chunk === "VP8L") {
      const b = bytes;
      const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
      width = (bits & 0x3fff) + 1;
      height = ((bits >> 14) & 0x3fff) + 1;
      hasTransparency = !!((bits >> 28) & 0x1);
    } else if (chunk === "VP8 ") {
      width = view.getUint16(26, true) & 0x3fff;
      height = view.getUint16(28, true) & 0x3fff;
    }

    return {
      format: "webp",
      mimeType: FORMAT_META.webp.mime,
      extension: FORMAT_META.webp.ext,
      width,
      height,
      hasTransparency,
      isAnimated,
    };
  }

  // BMP: "BM"
  if (bytes.length >= 26 && bytes[0] === 0x42 && bytes[1] === 0x4d) {
    const width = view.getInt32(18, true);
    const height = Math.abs(view.getInt32(22, true));
    return {
      format: "bmp",
      mimeType: FORMAT_META.bmp.mime,
      extension: FORMAT_META.bmp.ext,
      width,
      height,
      hasTransparency: false,
      isAnimated: false,
    };
  }

  // AVIF / generic ISOBMFF: "....ftyp" with major brand avif/avis
  if (bytes.length >= 12 && containsAscii(bytes.slice(4, 8), "ftyp")) {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (brand.startsWith("avi")) {
      return {
        format: "avif",
        mimeType: FORMAT_META.avif.mime,
        extension: FORMAT_META.avif.ext,
        width: 0,
        height: 0,
        hasTransparency: false,
        isAnimated: brand === "avis",
      };
    }
  }

  // TIFF: "II*\0" or "MM\0*"
  if (
    bytes.length >= 4 &&
    ((bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2a && bytes[3] === 0x00) ||
      (bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[2] === 0x00 && bytes[3] === 0x2a))
  ) {
    return {
      format: "tiff",
      mimeType: FORMAT_META.tiff.mime,
      extension: FORMAT_META.tiff.ext,
      width: 0,
      height: 0,
      hasTransparency: false,
      isAnimated: false,
    };
  }

  return unknownHeader();
}

function containsAscii(bytes: Uint8Array, needle: string): boolean {
  for (let i = 0; i <= bytes.length - needle.length; i++) {
    let match = true;
    for (let j = 0; j < needle.length; j++) {
      if (bytes[i + j] !== needle.charCodeAt(j)) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }
  return false;
}
