import { Component, forwardRef, HostListener, Input } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { AbstractFileUploadComponent } from './abstract-file-upload.component';
import { NgClass, NgIf, NgFor } from '@angular/common';
import { IconComponent } from '@momentum/frontend/icons';

/**
 * A form control for multiple file selection/uploading with support for drag
 * and drop.
 */
@Component({
  selector: 'mom-multi-file-upload',
  templateUrl: 'file-upload.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MultiFileUploadComponent),
      multi: true
    }
  ],
  standalone: true,
  imports: [NgClass, NgIf, NgFor, IconComponent]
})
export class MultiFileUploadComponent extends AbstractFileUploadComponent<
  File[]
> {
  public value: File[] = [];
  protected readonly multiple = true;
  @Input() max: number | null;

  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent) {
    // Keeping this method in the abstract class as allows single file component
    // to handle case

    // Prevent default behavior (Prevent file from being opened)
    event.preventDefault();
    this.removeDragData(event);

    if (this.disabled) return;

    // `.items` seems to be the correct approach but try files if missing
    const useItems = !!event.dataTransfer.items;
    const items = event.dataTransfer.items ?? event.dataTransfer.files;
    // DataTransferList doesn't have an iterator symbol on it according to
    // TypeScript (???)
    // eslint-disable-next-line unicorn/no-for-loop
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      // Ignore anything that isn't a file
      if (useItems && (item as DataTransferItem).kind !== 'file') continue;

      const file = useItems
        ? (item as DataTransferItem).getAsFile()
        : (item as File);

      this.value.push(file);

      if (this.value.length === this.max) {
        // TODO: This sucks when multiple=false (try with single bsp)
        this.disabled = true;
        this.disabledBecauseReachedMax = true;
        break;
      }
    }

    this.onChange(this.value);
    this.onTouched();
  }

  onFilesSelected(event: Event) {
    const elementFiles = (event.target as HTMLInputElement).files;

    // eslint-disable-next-line unicorn/no-for-loop
    for (let i = 0; i < elementFiles.length; i++) {
      const file = elementFiles[i];

      // Always ignore duplicates - can't imagine where we'd ever want this.
      if (
        !(this.value as File[]).some((f) =>
          AbstractFileUploadComponent.isIdenticalFile(f, file)
        )
      )
        this.value.push(file);

      if (this.value.length === this.max) {
        this.disabled = true;
        this.disabledBecauseReachedMax = true;
        break;
      }
    }

    this.onChange(this.value);
    this.onTouched();

    (event.target as HTMLInputElement).value = '';
  }

  writeValue(value: File[]): void {
    this.value = value == null || (value as any) === '' ? [] : value;
    if (this.disabledBecauseReachedMax && value.length < this.max) {
      this.disabledBecauseReachedMax = false;
      this.disabled = false;
    }
  }

  removeFile(file: File, event?: Event) {
    event?.stopPropagation();

    this.value.splice(
      this.value.findIndex(({ name }) => name === file.name),
      1
    );

    if (this.disabledBecauseReachedMax) {
      this.disabled = false;
      this.disabledBecauseReachedMax = false;
    }

    this.onChange(this.value);
  }

  hasSelection(): boolean {
    return this.value.length > 0;
  }

  getIterableFiles(): File[] {
    return this.value;
  }
}
