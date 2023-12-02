import { Component, forwardRef, HostListener } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { AbstractFileUploadComponent } from './abstract-file-upload.component';
import { NgClass, NgIf, NgFor } from '@angular/common';
import { IconComponent } from '@momentum/frontend/icons';

/**
 * A form control for file selection/uploading with support for drag and drop.
 */
@Component({
  selector: 'm-file-upload',
  templateUrl: 'file-upload.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FileUploadComponent),
      multi: true
    }
  ],
  standalone: true,
  imports: [NgClass, NgIf, NgFor, IconComponent]
})
export class FileUploadComponent extends AbstractFileUploadComponent<File> {
  public value: File = null;
  protected readonly multiple = false;
  protected readonly max = null;

  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent) {
    // Prevent default behavior (Prevent file from being opened)
    event.preventDefault();
    this.removeDragData(event);

    if (this.disabled) return;

    // `.items` seems to be the correct approach but try files if missing
    const useItems = !!event.dataTransfer.items;
    const items = event.dataTransfer.items ?? event.dataTransfer.files;

    const item = items[0];
    // Ignore anything that isn't a file. We could keep this method in abstract
    // class to handle cases where first item isn't a file but others are, but I
    // don't think that could ever actually happen
    if (useItems && (item as DataTransferItem).kind !== 'file') return;

    this.value = useItems
      ? (item as DataTransferItem).getAsFile()
      : (item as File);

    this.onChange(this.value);
  }

  onFilesSelected(event: Event) {
    this.value = (event.target as HTMLInputElement).files[0];

    this.onChange(this.value);

    (event.target as HTMLInputElement).value = '';
  }

  writeValue(value: File): void {
    this.value = value == null || (value as any) === '' ? null : value;
  }

  hasSelection(): boolean {
    return !!this.value;
  }

  getIterableFiles(): File[] {
    return [this.value];
  }

  removeFile(file: File, event?: Event): void {
    event?.stopPropagation();
    this.value = null;
    this.onChange(this.value);
  }
}
