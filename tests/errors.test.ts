import { describe, it, expect } from "vitest";
import { ImageSDKError, invalidInput, environmentUnsupported } from "../src/errors";

describe("ImageSDKError", () => {
  it("carries code, message, and solution", () => {
    const err = new ImageSDKError({ code: "INVALID_INPUT", message: "bad input", solution: "fix it" });
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe("INVALID_INPUT");
    expect(err.message).toBe("bad input");
    expect(err.solution).toBe("fix it");
  });

  it("invalidInput() helper builds an INVALID_INPUT error", () => {
    const err = invalidInput("nope");
    expect(err.code).toBe("INVALID_INPUT");
  });

  it("environmentUnsupported() helper explains the fix", () => {
    const err = environmentUnsupported("resize");
    expect(err.code).toBe("ENVIRONMENT_UNSUPPORTED");
    expect(err.solution).toMatch(/sharp/i);
  });

  it("serializes to JSON without leaking internal fields", () => {
    const err = new ImageSDKError({ code: "SIZE_EXCEEDED", message: "too big" });
    const json = err.toJSON();
    expect(json).toEqual({ name: "ImageSDKError", code: "SIZE_EXCEEDED", message: "too big", solution: undefined });
  });
});
