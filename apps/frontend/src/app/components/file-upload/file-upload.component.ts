import { Component, forwardRef, HostListener } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { AbstractFileUploadComponent } from './abstract-file-upload.component';
import { IconComponent } from '../../icons';

/**
 * A form control for file selection/uploading with support for drag and drop
 * and fetching from clipboard.
 */
@Component({
  selector: 'm-file-upload',
  templateUrl: 'file-upload.component.html',
  imports: [IconComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FileUploadComponent),
      multi: true
    }
  ]
})
export class FileUploadComponent extends AbstractFileUploadComponent<File | null> {
  public value: File | null = null;
  protected readonly multiple = false;
  protected readonly max = null;

  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent) {
    // Prevent default behavior (Prevent file from being opened)
    event.preventDefault();
    this.removeDragData(event);

    if (this.disabled) return;
    if (!event.dataTransfer) return;

    // `.items` seems to be the correct approach but try files if missing
    const useItems = !!event.dataTransfer.items;
    const items = event.dataTransfer.items ?? event.dataTransfer.files;
    if (!items || items.length === 0) return;

    const item = items[0];
    if (useItems && (item as DataTransferItem).kind !== 'file') return;

    const file = useItems
      ? (item as DataTransferItem).getAsFile()
      : item instanceof File
        ? item
        : null;

    if (!file) return;

    if (
      this.acceptMimeTypes?.length > 0 &&
      !this.acceptMimeTypes.includes(file.type)
    )
      return;

    this.value = file;
    this.onChange(this.value);
  }

  onFilesSelected(event: Event) {
    const files = (event.target as HTMLInputElement).files;
    if (!files || files.length === 0) return;
    this.value = files[0];

    this.onChange(this.value);

    (event.target as HTMLInputElement).value = '';
  }

  async addFromClipboard(event: Event) {
    event.stopPropagation();

    if (!this.enableClipboard) return;

    this.onTouched();

    let items: ClipboardItems;
    try {
      items = await navigator.clipboard.read();
    } catch {
      return;
    }

    for (const clipboardItem of items) {
      const matchingType = clipboardItem.types.find((type) =>
        this.acceptMimeTypes?.includes(type)
      );

      if (!matchingType) continue;

      const blob = await clipboardItem.getType(matchingType);
      this.value = new File(
        [blob],
        `ClipboardItem.${matchingType.split('/').at(-1)}`
      );

      this.onChange(this.value);
      return;
    }
  }

  writeValue(value: File | null): void {
    this.value = value == null || (value as any) === '' ? null : value;
  }

  hasSelection(): boolean {
    return !!this.value;
  }

  getIterableFiles(): File[] {
    return this.value ? [this.value] : [];
  }

  removeFile(_file: File, event?: Event): void {
    event?.stopPropagation();
    this.value = null;
    this.onChange(this.value);
  }
}
