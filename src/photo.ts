// Small square portraits for people's cards, stored in the team file as data URLs.
import { isPhoto } from "./model";

/** Centre-crop to a square and scale to `size` px; JPEG, so a photo is about 10 to 20 kB. */
export async function photoFromFile(file: File, size = 192): Promise<string> {
  if (!/^image\//.test(file.type)) throw new Error("Choose an image file (JPEG, PNG, WebP or HEIC).");
  if (file.size > 25 * 1024 * 1024) throw new Error("Choose an image smaller than 25 MB.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("This browser cannot read that image. Try a JPEG or PNG."));
      i.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    if (!side) throw new Error("The image is empty.");
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
    for (const q of [0.82, 0.7, 0.55]) {
      const data = canvas.toDataURL("image/jpeg", q);
      if (isPhoto(data) && data.length < 60_000) return data;
    }
    throw new Error("The photo could not be made small enough.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
