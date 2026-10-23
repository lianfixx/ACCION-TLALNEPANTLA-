import { imageBytesMatchMime } from "@/lib/security";

const MAX_PIXELS = 40_000_000;
const MAX_DIMENSION = 16_384;

export class UnsafeRasterImageError extends Error {
  constructor(message = "The raster image cannot be safely normalized.") {
    super(message);
    this.name = "UnsafeRasterImageError";
  }
}

function byteStream(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy]).stream();
}

async function readOutputWithinLimit(stream: ReadableStream<Uint8Array>, maxBytes: number) {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel("normalized-image-too-large").catch(() => undefined);
        throw new UnsafeRasterImageError("The normalized image exceeds the byte limit.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function normalizeRasterImage(bytes: Uint8Array, mimeType: "image/jpeg" | "image/png" | "image/webp", images: ImagesBinding, maxBytes: number) {
  let info: Awaited<ReturnType<ImagesBinding["info"]>>;
  try {
    info = await images.info(byteStream(bytes));
  } catch {
    throw new UnsafeRasterImageError("The image decoder rejected the input.");
  }
  if (info.format === "image/svg+xml" || !("width" in info) || info.width < 1 || info.height < 1 || info.width > MAX_DIMENSION || info.height > MAX_DIMENSION || info.width * info.height > MAX_PIXELS) {
    throw new UnsafeRasterImageError("The image dimensions are not allowed.");
  }

  let result: ImageTransformationResult;
  try {
    result = await images.input(byteStream(bytes)).transform({ rotate: 0 }).output({
      format: mimeType,
      ...(mimeType === "image/png" ? {} : { quality: 90 }),
      anim: false,
    });
  } catch {
    throw new UnsafeRasterImageError("The image could not be decoded and re-encoded.");
  }
  if (result.contentType().toLowerCase() !== mimeType) throw new UnsafeRasterImageError("The normalized image type changed unexpectedly.");
  const normalized = await readOutputWithinLimit(result.image(), maxBytes);
  if (!imageBytesMatchMime(normalized, mimeType)) throw new UnsafeRasterImageError("The normalized image signature is invalid.");
  return { bytes: normalized, width: info.width, height: info.height };
}
