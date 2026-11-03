import { Component, forwardRef, HostListener, signal } from '@angular/core';
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
export class FileUploadComponent extends AbstractFileUploadComponent<File> {
  public readonly value = signal<File | null>(null);
  protected readonly multiple = false;

  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent) {
    // Prevent default behavior (Prevent file from being opened)
    event.preventDefault();
    this.removeDragData(event);

    if (this.disabled()) return;

    // `.items` seems to be the correct approach but try files if missing
    const useItems = !!event.dataTransfer.items;
    const items = event.dataTransfer.items ?? event.dataTransfer.files;

    const item = items[0];
    // Ignore anything that isn't a file. We could keep this method in abstract
    // class to handle cases where first item isn't a file but others are, but I
    // don't think that could ever actually happen
    if (useItems && (item as DataTransferItem).kind !== 'file') return;

    const file = useItems
      ? (item as DataTransferItem).getAsFile()
      : (item as File);

    const acceptMimeTypes = this.acceptMimeTypes();
    if (acceptMimeTypes?.length > 0 && !acceptMimeTypes.includes(file.type))
      return;

    this.select(file);
  }

  onFilesSelected(event: Event) {
    this.select((event.target as HTMLInputElement).files[0]);

    (event.target as HTMLInputElement).value = '';
  }

  async addFromClipboard(event: Event) {
    event.stopPropagation();

    if (!this.enableClipboard()) return;

    this.onTouched();

    let items: ClipboardItems;
    try {
      items = await navigator.clipboard.read();
    } catch {
      return;
    }

    for (const clipboardItem of items) {
      const matchingType = clipboardItem.types.find((type) =>
        this.acceptMimeTypes()?.includes(type)
      );

      if (!matchingType) continue;

      const blob = await clipboardItem.getType(matchingType);
      this.select(
        new File([blob], `ClipboardItem.${matchingType.split('/').at(-1)}`)
      );
      return;
    }
  }

  writeValue(value: File): void {
    this.value.set(value == null || (value as any) === '' ? null : value);
  }

  hasSelection(): boolean {
    return !!this.value();
  }

  getIterableFiles(): File[] {
    return [this.value()];
  }

  removeFile(_file: File, event?: Event): void {
    event?.stopPropagation();
    this.select(null);
  }

  private select(file: File | null) {
    this.value.set(file);
    this.onChange(file);
  }
}
