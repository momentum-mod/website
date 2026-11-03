import { Component, forwardRef, HostListener, signal } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { AbstractFileUploadComponent } from './abstract-file-upload.component';
import { IconComponent } from '../../icons';

/**
 * A form control for multiple file selection/uploading with support for drag
 * and drop and fetching from clipboard
 */
@Component({
  selector: 'm-multi-file-upload',
  templateUrl: 'file-upload.component.html',
  imports: [IconComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MultiFileUploadComponent),
      multi: true
    }
  ]
})
export class MultiFileUploadComponent extends AbstractFileUploadComponent<
  File[]
> {
  public readonly value = signal<File[]>([]);
  protected readonly multiple = true;

  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent) {
    // Keeping this method in the abstract class as allows single file component
    // to handle case

    // Prevent default behavior (Prevent file from being opened)
    event.preventDefault();
    this.removeDragData(event);

    if (this.disabled()) return;

    // `.items` seems to be the correct approach but try files if missing
    const useItems = !!event.dataTransfer.items;
    const items = event.dataTransfer.items ?? event.dataTransfer.files;
    // DataTransferList doesn't have an iterator symbol on it according to
    // TypeScript (???)

    const files = [...this.value()];
    for (const item of items) {
      // Ignore anything that isn't a file
      if (useItems && (item as DataTransferItem).kind !== 'file') continue;

      const file = useItems
        ? (item as DataTransferItem).getAsFile()
        : (item as File);

      const acceptMimeTypes = this.acceptMimeTypes();
      if (acceptMimeTypes?.length > 0 && !acceptMimeTypes.includes(file.type))
        continue;

      files.push(file);

      if (files.length === this.max()) {
        // TODO: This sucks when multiple=false (try with single bsp)
        this.disabled.set(true);
        this.disabledBecauseReachedMax.set(true);
        break;
      }
    }

    this.value.set(files);
    this.onChange(files);
    this.onTouched();
  }

  onFilesSelected(event: Event) {
    const elementFiles = (event.target as HTMLInputElement).files;

    const files = [...this.value()];
    for (const file of elementFiles) {
      // Always ignore duplicates - can't imagine where we'd ever want this.
      if (
        !files.some((f) => AbstractFileUploadComponent.isIdenticalFile(f, file))
      )
        files.push(file);

      if (files.length === this.max()) {
        this.disabled.set(true);
        this.disabledBecauseReachedMax.set(true);
        break;
      }
    }

    this.value.set(files);
    this.onChange(files);
    this.onTouched();

    (event.target as HTMLInputElement).value = '';
  }

  async addFromClipboard(event: Event) {
    event.stopPropagation();

    if (!this.enableClipboard()) return;

    this.onTouched();

    const items = await navigator.clipboard.read();

    const added: File[] = [];
    for (const clipboardItem of items) {
      const matchingType = clipboardItem.types.find((type) =>
        this.acceptMimeTypes()?.includes(type)
      );

      if (!matchingType) continue;

      const blob = await clipboardItem.getType(matchingType);
      added.push(
        new File([blob], `ClipboardItem.${matchingType.split('/').at(-1)}`)
      );
    }

    if (added.length > 0) {
      const files = [...this.value(), ...added];
      this.value.set(files);
      this.onChange(files);
    }
  }

  writeValue(value: File[]): void {
    this.value.set(value == null || (value as any) === '' ? [] : value);
    if (this.disabledBecauseReachedMax() && value?.length < this.max()) {
      this.disabledBecauseReachedMax.set(false);
      this.disabled.set(false);
    }
  }

  removeFile(file: File, event?: Event) {
    event?.stopPropagation();

    const files = [...this.value()];
    files.splice(
      files.findIndex(({ name }) => name === file.name),
      1
    );

    if (this.disabledBecauseReachedMax()) {
      this.disabled.set(false);
      this.disabledBecauseReachedMax.set(false);
    }

    this.value.set(files);
    this.onChange(files);
  }

  hasSelection(): boolean {
    return this.value().length > 0;
  }

  getIterableFiles(): File[] {
    return this.value();
  }
}
