import { ActionSheet, ActionSheetButtonStyle } from "@capacitor/action-sheet";
import { Camera } from "@capacitor/camera";

/**
 * Adding photos in the phone app: a native sheet asks whether to take one now or choose some from the phone's photos,
 * then the camera or the system photo picker opens. Photos come back as files, ready to be prepared and uploaded like
 * ones chosen on the website. Resolves to null when the person backs out.
 */
export async function pickPhonePhotos(room: number): Promise<File[] | null> {
  const { index } = await ActionSheet.showActions({
    title: "Add photos",
    options: [{ title: "Take a photo" }, { title: "Choose from your photos" }, { title: "Cancel", style: ActionSheetButtonStyle.Cancel }],
  });
  let paths: string[];
  try {
    if (index === 0) {
      const shot = await Camera.takePhoto({ quality: 92, correctOrientation: true });
      paths = shot.webPath ? [shot.webPath] : [];
    } else if (index === 1) {
      const { results } = await Camera.chooseFromGallery({ allowMultipleSelection: room > 1, limit: room, quality: 92 });
      paths = results.map((r) => r.webPath).filter((p): p is string => Boolean(p));
    } else {
      return null;
    }
  } catch {
    // Closing the camera or the picker without a photo.
    return null;
  }
  return Promise.all(paths.slice(0, room).map(async (p, i) => {
    const blob = await (await fetch(p)).blob();
    return new File([blob], `photo-${i + 1}.jpg`, { type: blob.type || "image/jpeg" });
  }));
}
