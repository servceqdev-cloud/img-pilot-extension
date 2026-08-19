export type ImageFormat =
  | "png"
  | "jpeg"
  | "webp"
  | "gif"
  | "bmp"
  | "avif"
  | "tiff";

export type ImageInput =
  | ArrayBuffer
  | Uint8Array
  | Blob
  | File
  | string; // string = data URL, base64, or (browser) object URL

export interface ImageInfo {
  width: number;
  height: number;
  aspectRatio: number;
  format: ImageFormat | "unknown";
  mimeType: string;
  extension: string;
  sizeBytes: number;
  pixelCount: number;
  hasTransparency: boolean;
  isAnimated: boolean;
  orientation: "landscape" | "portrait" | "square";
}

export interface ValidationIssue {
  code: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  info: Partial<ImageInfo> & { size?: string; format?: string };
}

export interface ValidationRules {
  maxSize?: string | number;
  minSize?: string | number;
  formats?: ImageFormat[];
  extensions?: string[];
  width?: number;
  height?: number;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  aspectRatio?: number;
  aspectRatioTolerance?: number;
  allowAnimated?: boolean;
  allowTransparency?: boolean;
  custom?: Array<(info: ImageInfo) => ValidationIssue | null>;
}

export interface ResizeOptions {
  width?: number;
  height?: number;
  maintainAspectRatio?: boolean;
  fit?: "contain" | "cover" | "fill";
}

export interface CropOptions {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CompressOptions {
  quality?: number; // 0-100
  maxSize?: string | number;
  mode?: "lossy" | "lossless" | "auto";
}

export interface OptimizeOptions {
  format?: ImageFormat;
  quality?: number;
  width?: number;
  height?: number;
  maxSize?: string | number;
}

export interface OptimizeResult {
  data: Uint8Array;
  info: ImageInfo;
}
