/** Reads a Blob's bytes into a Uint8Array. */
export async function fromBlob(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

/** Wraps a Blob as a File, preserving its type unless overridden. */
export function blobToFile(blob: Blob, filename: string, mimeType?: string): File {
  if (typeof File === "undefined") {
    throw new Error("blobToFile() requires a browser environment.");
  }
  return new File([blob], filename, { type: mimeType ?? blob.type });
}

/** A File already satisfies the Blob interface; returned as-is for API symmetry. */
export function fileToBlob(file: File): Blob {
  return file;
}

/** Creates an object URL for a Blob. Remember to call revokeBlobURL() when done. */
export function blobToURL(blob: Blob): string {
  if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
    throw new Error("blobToURL() requires a browser environment with URL.createObjectURL.");
  }
  return URL.createObjectURL(blob);
}

/** Revokes a previously created object URL to free memory. */
export function revokeBlobURL(url: string): void {
  if (typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
    URL.revokeObjectURL(url);
  }
}
