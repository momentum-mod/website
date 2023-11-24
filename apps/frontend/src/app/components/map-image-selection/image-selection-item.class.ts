export class ImageSelectionItem {
  file: File;
  dataUrl: string;

  private constructor() {}

  static async create(file: File): Promise<ImageSelectionItem> {
    const instance = new ImageSelectionItem();
    instance.file = file;
    instance.dataUrl = await ImageSelectionItem.readAsDataUrl(file);
    return instance;
  }

  private static async readAsDataUrl(image: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener('loadend', () =>
        resolve(reader.result as string)
      );
      reader.addEventListener('error', () =>
        reject(new Error('Error parsing file'))
      );
      reader.readAsDataURL(image);
    });
  }
}
