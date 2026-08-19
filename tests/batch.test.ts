import { describe, it, expect } from "vitest";
import { validateMany } from "../src/optimize";
import { PNG_1x1_BASE64, JPEG_1x1_BASE64 } from "./fixtures";

describe("validateMany", () => {
  it("validates every item and preserves input order", async () => {
    const inputs = [PNG_1x1_BASE64, JPEG_1x1_BASE64, PNG_1x1_BASE64];
    const results = await validateMany(inputs, {}, 2);

    expect(results).toHaveLength(3);
    expect(results[0].info.format).toBe("png");
    expect(results[1].info.format).toBe("jpeg");
    expect(results[2].info.format).toBe("png");
  });

  it("applies the same rules to every item", async () => {
    const inputs = [PNG_1x1_BASE64, JPEG_1x1_BASE64];
    const results = await validateMany(inputs, { formats: ["jpeg"] }, 4);

    expect(results[0].valid).toBe(false); // png rejected
    expect(results[1].valid).toBe(true); // jpeg accepted
  });
});
