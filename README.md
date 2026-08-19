# img-pilot

A modern, isomorphic image toolkit for JavaScript & TypeScript validate, optimize, convert, compress, resize, crop, and inspect images across the **Browser** and **Node.js**, with one API. Visit the official website: img-pilot.vercel.app. It includes all the examples, API usage, and code snippets you need to get started.

```bash
npm install img-pilot
```

Works with React, Next.js, Vite, Svelte, Vue, Nuxt, Astro, Express, and vanilla JS/TS. `npm install img-pilot` alone is enough in Node.js — the package ships pre-built ESM, CJS, and type declarations, so there's no build step on your side.

---

## Features

- Isomorphic — same API in the browser and in Node.js
- TypeScript-first, fully typed public API
- Framework-agnostic, tree-shakeable, zero required dependencies
- Structured image validation (never a plain `true`/`false`)
- Metadata extraction without decoding pixels (fast)
- Resize, crop, rotate, flip (Canvas-backed in the browser)
- Compression, including "hit this exact file size" mode
- Blob / File / Base64 / data-URL conversions
- Concurrency-capped batch processing
- Structured errors with a `code` and a suggested fix

---

## Installation

```bash
npm install img-pilot
```

Pixel operations in **Node.js** (`resize`, `crop`, `rotate`, `flip`, `compressImage`, and anything `optimizeImage` does under the hood) use the optional [`sharp`](https://www.npmjs.com/package/sharp) peer dependency:

```bash
npm install sharp
```

You don't need `sharp` at all if you're only using `img-pilot` in the browser, or only using `getImageInfo`/`validateImage`/conversion/blob/base64 utilities (those work everywhere with zero native dependencies).

---

## Quick Start

```ts
import { validateImage, optimizeImage } from "img-pilot";

const validation = await validateImage(file, {
  maxSize: "5MB",
  formats: ["png", "jpeg", "webp"],
  minWidth: 800,
});

if (!validation.valid) {
  console.log(validation.errors); // structured: [{ code, message }, ...]
}

const { data, info } = await optimizeImage(file, {
  format: "webp",
  quality: 80,
  width: 1200,
  maxSize: "500KB",
});
```

---

## API

Every function below is a **named export from `img-pilot`** — this list matches the actual published API exactly. Anything not on this list (like `toWebP()`, `toPNG()`, per-format converters, or React hooks) isn't implemented yet — see [Roadmap](#roadmap).

### Metadata

```ts
getImageInfo(input): Promise<ImageInfo>
```

Reads width, height, aspect ratio, format, mime type, extension, size, transparency, and animation flags directly from the file header — works in Node and the browser without any native dependency.

### Validation

```ts
validateImage(input, rules?): Promise<ValidationResult>
```

Returns `{ valid, errors, warnings, info }` — never a bare boolean. Supports `maxSize`, `minSize`, `formats`, `extensions`, `width`/`height`, `minWidth`/`maxWidth`, `minHeight`/`maxHeight`, `aspectRatio` (+ tolerance), `allowAnimated`, `allowTransparency`, and arbitrary `custom` rules.

### Format conversion

There's no `toWebP()`/`toPNG()`/`toJPEG()`/`toAVIF()` — instead, pass the target format to `resize()` or `optimizeImage()`:

```ts
// Convert to WebP at native size:
const webpBytes = await resize(
  input,
  { width: info.width, fit: "fill" },
  "image/webp",
);

// Convert + resize + compress in one call:
const { data } = await optimizeImage(input, { format: "webp", quality: 80 });
```

`AVIF` and `TIFF` are detected by `getImageInfo`, but there's no encode path for them yet (see Roadmap).

### Resize

```ts
resize(input, options, mimeType?)
resizeWidth(input, width, mimeType?)
resizeHeight(input, height, mimeType?)
resizeContain(input, width, height, mimeType?)
resizeCover(input, width, height, mimeType?)
resizeFill(input, width, height, mimeType?)
```

### Crop

```ts
crop(input, { x, y, width, height }, mimeType?)
centerCrop(input, width, height, mimeType?)
smartCrop(input, width, height, mimeType?)   // heuristic, not real saliency detection — see caveats
circleCrop(input, diameter, mimeType?)
```

### Rotate / Flip

```ts
rotate(input, degrees, mimeType?)
flip(input, axis?, mimeType?)   // axis: "horizontal" | "vertical"
mirror(input, mimeType?)
```

### Compression

```ts
compressImage(input, options?)        // quality, default 80
smartCompress(input, options?)        // targets maxSize if given, else balanced default
losslessCompress(input)
lossyCompress(input, quality?)
targetSizeCompress(input, maxSize)    // binary-searches quality to hit a byte target
```

### Conversion (containers)

```ts
toUint8Array(input)
toArrayBuffer(input)
toBuffer(input)          // Node.js only
toBlob(input, mimeType?) // browser only
toFile(input, filename, mimeType?) // browser only
toBase64(input)
fromBase64(base64)
toDataURL(input, format?)
```

### Blob utilities

```ts
fromBlob(blob)
blobToFile(blob, filename, mimeType?)
fileToBlob(file)
blobToURL(blob)
revokeBlobURL(url)
```

### Optimize & batch

```ts
optimizeImage(input, options): Promise<{ data, info }>
optimizeMany(inputs, options?, concurrency?)
validateMany(inputs, rules?, concurrency?)
compressMany(inputs, options?, concurrency?)
```

Batch functions run concurrently with a concurrency cap (default `4`) so processing many images doesn't blow up memory.

### Errors

Every thrown error is an `ImageSDKError` with a machine-readable `.code`, a human `.message`, and a `.solution` string suggesting the fix.

### Utils & constants

```ts
parseSize("5MB"); // -> 5242880
formatBytes(5242880); // -> "5.0MB"
SUPPORTED_FORMATS;
DEFAULT_JPEG_QUALITY;
DEFAULT_COMPRESS_QUALITY;
DEFAULT_BATCH_CONCURRENCY;
```

---

## Environment notes (please read before shipping)

- **Metadata, validation, base64/blob/buffer conversions, and batch helpers** work identically and reliably in Node and the browser — no caveats.
- **Resize / Crop / Rotate / Flip / Compress** run on the browser's Canvas/OffscreenCanvas API in the browser, and on `sharp` in Node.js. If `sharp` isn't installed, calling these in Node throws a clear `ENVIRONMENT_UNSUPPORTED` error telling you to `npm install sharp`.
- **`smartCrop()`** is a documented heuristic (a centered crop biased toward the upper third of the image) — not real subject/saliency detection. Treat it as a sensible default, not a computer-vision feature.
- **AVIF / TIFF**: format is detected, but there's no encoder yet.

---

## Browser Support

Chrome, Firefox, Safari, and Edge — anywhere `Canvas`/`OffscreenCanvas`, `Blob`, and `createImageBitmap` are available.

---

## Roadmap

- React hooks (`useImageOptimizer`, `useImageValidation`, `useImageCompression`) and components (`<ImageOptimizer/>`, `<ImagePreview/>`, `<ImageDropzone/>`)
- Next.js helpers
- AVIF / TIFF encoding
- Dominant color / color space extraction
- Blur placeholder generation
- CLI
- Documentation website

---

## Contributing

Contributions, issues, and feature requests are welcome. Please open an issue before submitting large changes.

---

## License

MIT © Muhammad Luqman Khan
