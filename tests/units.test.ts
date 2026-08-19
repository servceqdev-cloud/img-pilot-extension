import { describe, it, expect } from "vitest";
import { parseSize, formatBytes } from "../src/utils/units";

describe("parseSize", () => {
  it("parses plain byte numbers", () => {
    expect(parseSize(1024)).toBe(1024);
  });

  it("parses KB/MB/GB strings", () => {
    expect(parseSize("5MB")).toBe(5 * 1024 * 1024);
    expect(parseSize("500KB")).toBe(500 * 1024);
    expect(parseSize("1GB")).toBe(1024 ** 3);
  });

  it("parses decimals and lowercase units", () => {
    expect(parseSize("1.5mb")).toBe(Math.round(1.5 * 1024 * 1024));
  });

  it("defaults to bytes when no unit is given", () => {
    expect(parseSize("2048")).toBe(2048);
  });

  it("throws on garbage input", () => {
    expect(() => parseSize("not-a-size")).toThrow();
  });

  it("throws on negative numbers", () => {
    expect(() => parseSize(-5)).toThrow();
  });
});

describe("formatBytes", () => {
  it("formats bytes under 1KB as-is", () => {
    expect(formatBytes(512)).toBe("512B");
  });

  it("formats megabytes with one decimal by default", () => {
    expect(formatBytes(6_300_000)).toBe("6.0MB");
  });

  it("respects custom precision", () => {
    expect(formatBytes(1_887_436, 2)).toBe("1.80MB");
  });
});
