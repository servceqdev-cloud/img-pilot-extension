import { invalidInput } from "../errors";

const UNIT_MULTIPLIERS: Record<string, number> = {
  B: 1,
  KB: 1024,
  MB: 1024 ** 2,
  GB: 1024 ** 3,
};

/**
 * Parses a human size string ("5MB", "500 KB", "1.5GB") or a raw byte
 * number into a byte count.
 */
export function parseSize(input: string | number): number {
  if (typeof input === "number") {
    if (!Number.isFinite(input) || input < 0) {
      throw invalidInput(`Invalid size value: ${input}`, "Provide a non-negative number of bytes or a string like '5MB'.");
    }
    return input;
  }

  const match = /^\s*([\d.]+)\s*(B|KB|MB|GB)?\s*$/i.exec(input);
  if (!match) {
    throw invalidInput(
      `Could not parse size string: "${input}"`,
      "Use a format like '500KB', '5MB', '1.2GB', or a plain byte number."
    );
  }

  const value = parseFloat(match[1]);
  const unit = (match[2] ?? "B").toUpperCase();
  const multiplier = UNIT_MULTIPLIERS[unit];

  if (multiplier === undefined) {
    throw invalidInput(`Unknown size unit: "${unit}"`, "Use one of B, KB, MB, GB.");
  }

  return Math.round(value * multiplier);
}

/**
 * Formats a byte count into a human-readable string, e.g. 6_300_000 -> "6.3MB".
 */
export function formatBytes(bytes: number, precision = 1): string {
  if (bytes < 1024) return `${bytes}B`;
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(precision)}${units[unitIndex]}`;
}
