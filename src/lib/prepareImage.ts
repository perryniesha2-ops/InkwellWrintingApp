/**
 * Get an image ready for upload. Very large screenshots and photos are scaled
 * to MAX_EDGE (still sharp enough to read newsprint) and re-encoded, which
 * typically cuts a 6–10 MB screenshot to well under 1 MB. Small files, GIFs
 * and anything the browser can't decode (e.g. HEIC outside Safari) upload as-is.
 */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const MAX_EDGE = 2400;
const RECOMPRESS_ABOVE_BYTES = 1.5 * 1024 * 1024;

export class ImageRejected extends Error {}

export async function prepareImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) throw new ImageRejected(`${file.name || "That file"} isn't an image.`);
  if (file.size > MAX_UPLOAD_BYTES) throw new ImageRejected(`${file.name || "That image"} is larger than 15 MB.`);
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file; // Can't decode here; let the original through.
  }
  const longest = Math.max(bitmap.width, bitmap.height);
  if (longest <= MAX_EDGE && file.size <= RECOMPRESS_ABOVE_BYTES) {
    bitmap.close();
    return file;
  }

  const scale = Math.min(1, MAX_EDGE / longest);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) { bitmap.close(); return file; }
  // White behind transparent PNGs, since JPEG has no alpha.
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
  if (!blob || blob.size >= file.size) return file;
  const base = (file.name || "clipping").replace(/\.[^.]+$/, "");
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}

/** Image files from a paste or drop, in order. */
export function imageFilesFrom(data: DataTransfer | null): File[] {
  if (!data) return [];
  const fromItems = Array.from(data.items ?? [])
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter((f): f is File => !!f);
  return fromItems.length ? fromItems : Array.from(data.files ?? []).filter((f) => f.type.startsWith("image/"));
}
