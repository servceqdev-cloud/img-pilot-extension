import { describe, it, expect } from "vitest";
import { validateImage } from "../src/validation";
import { PNG_1x1_BASE64, JPEG_1x1_BASE64 } from "./fixtures";

function fromBase64(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, "base64"));
}

describe("validateImage", () => {
  it("passes with no rules for a valid PNG", async () => {
    const result = await validateImage(fromBase64(PNG_1x1_BASE64));
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.info.format).toBe("png");
    expect(result.info.width).toBe(1);
  });

  it("rejects a disallowed format", async () => {
    const result = await validateImage(fromBase64(PNG_1x1_BASE64), { formats: ["jpeg", "webp"] });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "MIME_NOT_ALLOWED")).toBe(true);
  });

  it("allows a permitted format", async () => {
    const result = await validateImage(fromBase64(JPEG_1x1_BASE64), { formats: ["jpeg"] });
    expect(result.valid).toBe(true);
  });

  it("rejects when minWidth is not met", async () => {
    const result = await validateImage(fromBase64(PNG_1x1_BASE64), { minWidth: 800 });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "DIMENSION_TOO_SMALL")).toBe(true);
  });

  it("rejects when file exceeds maxSize", async () => {
    const result = await validateImage(fromBase64(PNG_1x1_BASE64), { maxSize: 10 });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "SIZE_EXCEEDED")).toBe(true);
  });

  it("flags empty files", async () => {
    const result = await validateImage(new Uint8Array(0));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "EMPTY_FILE")).toBe(true);
  });

  it("runs custom validation rules", async () => {
    const result = await validateImage(fromBase64(PNG_1x1_BASE64), {
      custom: [(info) => (info.width < 100 ? { code: "TOO_SMALL_CUSTOM", message: "Too small for our custom rule." } : null)],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "TOO_SMALL_CUSTOM")).toBe(true);
  });

  it("never returns a plain boolean — always a structured result", async () => {
    const result = await validateImage(fromBase64(PNG_1x1_BASE64));
    expect(typeof result).toBe("object");
    expect(Array.isArray(result.errors)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
  });
});
