export class ImageSelectionItem {
  file?: File;
  dataUrl: string;

  private constructor() {}

  static async create(
    input: File | string
  ): Promise<ImageSelectionItem | null> {
    const instance = new ImageSelectionItem();
    if (typeof input == 'string') {
      instance.dataUrl = input;
    } else {
      instance.file = input;
      try {
        instance.dataUrl = await ImageSelectionItem.readAsDataUrl(input);
      } catch {
        return null;
      }
    }
    return instance;
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
