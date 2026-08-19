import type { ImageInfo, ImageInput, ValidationIssue, ValidationResult, ValidationRules } from "../types";
import { getImageInfo } from "../metadata";
import { parseSize, formatBytes } from "../utils/units";

/**
 * Validates an image against a set of rules and returns a structured result
 * (never a plain boolean) describing every error, warning, and the image's
 * detected info.
 *
 * @example
 * const result = await validateImage(file, {
 *   maxSize: "5MB",
 *   formats: ["png", "jpg", "webp"],
 *   minWidth: 800,
 *   maxWidth: 5000,
 * });
 */
export async function validateImage(input: ImageInput, rules: ValidationRules = {}): Promise<ValidationResult> {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  let info: ImageInfo;
  try {
    info = await getImageInfo(input);
  } catch (err) {
    return {
      valid: false,
      errors: [
        {
          code: "CORRUPTED_IMAGE",
          message: err instanceof Error ? err.message : "Failed to read image data.",
        },
      ],
      warnings: [],
      info: {},
    };
  }

  if (info.sizeBytes === 0) {
    errors.push({ code: "EMPTY_FILE", message: "The provided file is empty." });
  }

  if (info.format === "unknown") {
    errors.push({
      code: "CORRUPTED_IMAGE",
      message: "The file could not be recognized as a supported image format (it may be corrupted or an unsupported type).",
    });
  }

  if (rules.maxSize !== undefined) {
    const max = parseSize(rules.maxSize);
    if (info.sizeBytes > max) {
      errors.push({
        code: "SIZE_EXCEEDED",
        message: `Maximum allowed size is ${formatBytes(max)}.`,
      });
    }
  }

  if (rules.minSize !== undefined) {
    const min = parseSize(rules.minSize);
    if (info.sizeBytes < min) {
      errors.push({
        code: "SIZE_TOO_SMALL",
        message: `Minimum required size is ${formatBytes(min)}.`,
      });
    }
  }

  if (rules.formats && rules.formats.length > 0) {
    const normalizedFormats = rules.formats.map((f) => (f === ("jpg" as never) ? "jpeg" : f));
    if (info.format === "unknown" || !normalizedFormats.includes(info.format)) {
      errors.push({
        code: "MIME_NOT_ALLOWED",
        message: `Format "${info.format}" is not allowed. Allowed formats: ${rules.formats.join(", ")}.`,
      });
    }
  }

  if (rules.extensions && rules.extensions.length > 0) {
    const normalized = rules.extensions.map((e) => e.replace(/^\./, "").toLowerCase());
    if (!normalized.includes(info.extension)) {
      errors.push({
        code: "EXTENSION_NOT_ALLOWED",
        message: `Extension ".${info.extension}" is not allowed. Allowed: ${normalized.map((e) => "." + e).join(", ")}.`,
      });
    }
  }

  if (rules.width !== undefined && info.width !== rules.width) {
    errors.push({
      code: "DIMENSION_MISMATCH",
      message: `Expected width ${rules.width}px, got ${info.width}px.`,
    });
  }

  if (rules.height !== undefined && info.height !== rules.height) {
    errors.push({
      code: "DIMENSION_MISMATCH",
      message: `Expected height ${rules.height}px, got ${info.height}px.`,
    });
  }

  if (rules.minWidth !== undefined && info.width < rules.minWidth) {
    errors.push({
      code: "DIMENSION_TOO_SMALL",
      message: `Minimum width is ${rules.minWidth}px, got ${info.width}px.`,
    });
  }

  if (rules.maxWidth !== undefined && info.width > rules.maxWidth) {
    errors.push({
      code: "DIMENSION_TOO_LARGE",
      message: `Maximum width is ${rules.maxWidth}px, got ${info.width}px.`,
    });
  }

  if (rules.minHeight !== undefined && info.height < rules.minHeight) {
    errors.push({
      code: "DIMENSION_TOO_SMALL",
      message: `Minimum height is ${rules.minHeight}px, got ${info.height}px.`,
    });
  }

  if (rules.maxHeight !== undefined && info.height > rules.maxHeight) {
    errors.push({
      code: "DIMENSION_TOO_LARGE",
      message: `Maximum height is ${rules.maxHeight}px, got ${info.height}px.`,
    });
  }

  if (rules.aspectRatio !== undefined) {
    const tolerance = rules.aspectRatioTolerance ?? 0.02;
    if (Math.abs(info.aspectRatio - rules.aspectRatio) > tolerance) {
      errors.push({
        code: "ASPECT_RATIO_MISMATCH",
        message: `Expected aspect ratio ~${rules.aspectRatio}, got ${info.aspectRatio}.`,
      });
    }
  }

  if (rules.allowAnimated === false && info.isAnimated) {
    errors.push({ code: "ANIMATED_NOT_ALLOWED", message: "Animated images are not allowed." });
  }

  if (rules.allowTransparency === false && info.hasTransparency) {
    warnings.push({ code: "TRANSPARENCY_DETECTED", message: "Image has transparency, which is discouraged by policy." });
  }

  if (rules.custom) {
    for (const rule of rules.custom) {
      const issue = rule(info);
      if (issue) errors.push(issue);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    info: {
      ...info,
      size: formatBytes(info.sizeBytes),
      format: info.format,
    },
  };
}
