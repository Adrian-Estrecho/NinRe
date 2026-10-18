export interface PreparedPhoto {
  blob: Blob;
  width: number;
  height: number;
  preview: string;
}

/**
 * Resizes a picked photo to at most 1600px on its long side and re-encodes it as JPEG.
 * Browsers apply EXIF rotation when decoding, so the result is upright.
 */
export async function preparePhoto(file: File, max = 1600, quality = 0.82): Promise<PreparedPhoto> {
  const src = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("decode"));
      i.src = src;
    });
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * k));
    const height = Math.max(1, Math.round(img.naturalHeight * k));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const g = canvas.getContext("2d")!;
    g.fillStyle = "#fff";
    g.fillRect(0, 0, width, height);
    g.drawImage(img, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (!blob) throw new Error("encode");
    return { blob, width, height, preview: URL.createObjectURL(blob) };
  } finally {
    URL.revokeObjectURL(src);
  }
}

export const isImageFile = (f: File) => f.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(f.name);
