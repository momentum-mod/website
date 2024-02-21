export class ImageSelectionItem {
  file?: File;
  dataUrl: string;
  existingID?: string;

  private constructor() {}

  static async create(
    input: File | string,
    existingID?: string
  ): Promise<ImageSelectionItem | null> {
    const instance = new ImageSelectionItem();
    if (typeof input == 'string') {
      instance.dataUrl = input;
      instance.existingID = existingID;
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
