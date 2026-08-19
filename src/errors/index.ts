/**
 * Structured error codes used across the SDK. Keeping these as a union
 * (rather than a loose string) gives consumers exhaustive switch-checking.
 */
export type ImageSDKErrorCode =
  | "INVALID_INPUT"
  | "UNSUPPORTED_FORMAT"
  | "CORRUPTED_IMAGE"
  | "EMPTY_FILE"
  | "SIZE_EXCEEDED"
  | "SIZE_TOO_SMALL"
  | "DIMENSION_TOO_SMALL"
  | "DIMENSION_TOO_LARGE"
  | "ASPECT_RATIO_MISMATCH"
  | "MIME_NOT_ALLOWED"
  | "EXTENSION_NOT_ALLOWED"
  | "ENVIRONMENT_UNSUPPORTED"
  | "BACKEND_UNAVAILABLE"
  | "OPERATION_FAILED";

export interface ImageSDKErrorOptions {
  code: ImageSDKErrorCode;
  message: string;
  cause?: unknown;
  solution?: string;
}

/**
 * The single error type thrown by every public SDK function. Every instance
 * carries a machine-readable `code`, a human `message`, the `cause` (if any),
 * and a `solution` string describing the recommended fix.
 */
export class ImageSDKError extends Error {
  public readonly code: ImageSDKErrorCode;
  public readonly solution?: string;
  public readonly cause?: unknown;

  constructor(options: ImageSDKErrorOptions) {
    super(options.message);
    this.name = "ImageSDKError";
    this.code = options.code;
    this.solution = options.solution;
    this.cause = options.cause;
    Object.setPrototypeOf(this, ImageSDKError.prototype);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      solution: this.solution,
    };
  }
}

export function invalidInput(message: string, solution?: string): ImageSDKError {
  return new ImageSDKError({ code: "INVALID_INPUT", message, solution });
}

export function environmentUnsupported(feature: string): ImageSDKError {
  return new ImageSDKError({
    code: "ENVIRONMENT_UNSUPPORTED",
    message: `"${feature}" is not available in this environment.`,
    solution:
      "In Node.js, install the optional 'sharp' peer dependency (npm i sharp) to enable pixel operations. In the browser, this feature requires Canvas/OffscreenCanvas support.",
  });
}
