import { describe, it, expect } from "vitest";
import { toUint8Array } from "../src/utils/normalize";
import { toBase64, fromBase64, toDataURL } from "../src/base64";
import { PNG_1x1_BASE64 } from "./fixtures";

describe("toUint8Array", () => {
  it("passes through an existing Uint8Array", async () => {
    const input = new Uint8Array([1, 2, 3]);
    const result = await toUint8Array(input);
    expect(result).toBe(input);
  });

  it("converts an ArrayBuffer", async () => {
    const buf = new Uint8Array([1, 2, 3]).buffer;
    const result = await toUint8Array(buf);
    expect(Array.from(result)).toEqual([1, 2, 3]);
  });

  it("decodes a raw base64 string", async () => {
    const result = await toUint8Array(PNG_1x1_BASE64);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toBe(0x89); // PNG magic byte
  });

  it("decodes a data URL", async () => {
    const dataUrl = `data:image/png;base64,${PNG_1x1_BASE64}`;
    const result = await toUint8Array(dataUrl);
    expect(result[0]).toBe(0x89);
  });

  it("throws a helpful error for garbage strings", async () => {
    await expect(toUint8Array("not an image at all!!")).rejects.toThrow();
  });
});

describe("base64 round-trip", () => {
  it("toBase64 -> fromBase64 preserves bytes", async () => {
    const original = new Uint8Array([137, 80, 78, 71, 1, 2, 3, 255]);
    const base64 = await toBase64(original);
    const roundTripped = await fromBase64(base64);
    expect(Array.from(roundTripped)).toEqual(Array.from(original));
  });

  it("toDataURL produces a well-formed data URL", async () => {
    const url = await toDataURL(PNG_1x1_BASE64);
    expect(url.startsWith("data:image/png;base64,")).toBe(true);
  });

  it("toDataURL respects an explicit format override", async () => {
    const url = await toDataURL(PNG_1x1_BASE64, "webp");
    expect(url.startsWith("data:image/webp;base64,")).toBe(true);
  });
});
