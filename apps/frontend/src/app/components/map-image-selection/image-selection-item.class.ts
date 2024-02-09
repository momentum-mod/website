export class ImageSelectionItem {
  file: File;
  dataUrl: string;

  private constructor() {}

  static async create(file: File): Promise<ImageSelectionItem | null> {
    const instance = new ImageSelectionItem();
    instance.file = file;
    try {
      instance.dataUrl = await ImageSelectionItem.readAsDataUrl(file);
      return instance;
    } catch {
      return null;
    }
  }

  private static async readAsDataUrl(image: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener('loadend', () =>
        resolve(reader.result as string)
      );
      reader.addEventListener('error', reject);
      reader.readAsDataURL(image);
    });
  }
}
