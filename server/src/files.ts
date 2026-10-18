import { open, rm, unlink } from "node:fs/promises";
import { basename, join } from "node:path";

export const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const BOOK_ID = /^b_[a-f0-9]{18}$/;
export const PHOTO_FILE = /^[a-f0-9]{24}\.(jpg|png|webp)$/;

/** Confirms the bytes on disk really are the image type the browser claimed. */
export async function looksLikeImage(path: string, mime: string): Promise<boolean> {
  const fh = await open(path, "r");
  try {
    const { buffer, bytesRead } = await fh.read(Buffer.alloc(12), 0, 12, 0);
    if (bytesRead < 12) return false;
    if (mime === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (mime === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (mime === "image/webp") return buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
    return false;
  } finally {
    await fh.close();
  }
}

/** Each book keeps its photos in its own folder. */
export const bookDir = (uploadsDir: string, bookId: string) => join(uploadsDir, basename(bookId));

/** Deletes stored photo files of one book. Only bare file names inside that book's folder are touched. */
export async function removeFiles(uploadsDir: string, bookId: string, files: string[]): Promise<void> {
  const dir = bookDir(uploadsDir, bookId);
  await Promise.all(files.map((f) => unlink(join(dir, basename(f))).catch(() => {})));
}

/** Deletes a whole book's photo folder. */
export async function removeBookFiles(uploadsDir: string, bookId: string): Promise<void> {
  if (!BOOK_ID.test(bookId)) return;
  await rm(bookDir(uploadsDir, bookId), { recursive: true, force: true });
}
