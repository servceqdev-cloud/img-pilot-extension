import { describe, it, expect } from "vitest";
import { decodeImageHeader } from "../src/metadata/decode";
import { PNG_1x1_BASE64, JPEG_1x1_BASE64, GIF_1x1_BASE64 } from "./fixtures";

function fromBase64(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, "base64"));
}

describe("decodeImageHeader", () => {
  it("detects PNG dimensions and mime type", () => {
    const header = decodeImageHeader(fromBase64(PNG_1x1_BASE64));
    expect(header.format).toBe("png");
    expect(header.mimeType).toBe("image/png");
    expect(header.width).toBe(1);
    expect(header.height).toBe(1);
  });

  it("detects JPEG dimensions and mime type", () => {
    const header = decodeImageHeader(fromBase64(JPEG_1x1_BASE64));
    expect(header.format).toBe("jpeg");
    expect(header.mimeType).toBe("image/jpeg");
    expect(header.width).toBe(1);
    expect(header.height).toBe(1);
  });

  it("detects GIF dimensions and mime type", () => {
    const header = decodeImageHeader(fromBase64(GIF_1x1_BASE64));
    expect(header.format).toBe("gif");
    expect(header.mimeType).toBe("image/gif");
    expect(header.width).toBe(1);
    expect(header.height).toBe(1);
    expect(header.isAnimated).toBe(false);
  });

  it("returns 'unknown' for empty input", () => {
    const header = decodeImageHeader(new Uint8Array(0));
    expect(header.format).toBe("unknown");
  });

  it("returns 'unknown' for random non-image bytes", () => {
    const header = decodeImageHeader(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]));
    expect(header.format).toBe("unknown");
  });
});
