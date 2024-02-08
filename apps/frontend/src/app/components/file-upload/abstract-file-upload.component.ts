import {
  Directive,
  ElementRef,
  HostBinding,
  HostListener,
  Input,
  ViewChild
} from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';
import { Icon } from '../../icons';

/**
 * Abstract class providing core implementation for FileUploadComponent and
 * MultiFileUploadComponent.
 *
 * I split these up into two implemenations because I got annoyed with
 * accessing the 0th value of `value` constantly for instances with `multiple`
 * set to false.
 */
@Directive()
export abstract class AbstractFileUploadComponent<T extends File | File[]>
  implements ControlValueAccessor
{
  protected abstract value: T;
  protected abstract readonly multiple: boolean;
  protected abstract readonly max: number | null;

  // Uses a numeric counter to handle dragging over child elements
  // https://stackoverflow.com/a/21002544
  protected dragOverCounter = 0;

  /**
   * Extensions that file select dialog will accept
   * (use comma separation for multiple)
   */
  @Input({ required: true }) acceptExtensions = '';

  /**
   * Mimetypes that the addFromClipboard feature will accept.
   *
   * 'Add from clipboard' button will be disabled if this is not provided.
   */
  @Input() acceptMimeTypes: string[];

  @Input() enableClipboard = false;

  /**
   * Name of the file type to use in "select a <type> string"
   */
  @Input() typeName = '';

  protected disabled = false;
  protected disabledBecauseReachedMax = false;

  /**
   * Whether to show a list of selected files within the component. If false,
   * the "Select a file" stuff is always shown.
   */
  @Input() showSelected = true;

  /**
   * Icon to use, uses generic file icon if not given.
   * Only supports MDI currently
   */
  @Input() icon: Icon = 'file-upload';

  @HostBinding('class.dragging')
  private get isDragging() {
    return this.dragOverCounter > 0;
  }

  @HostBinding('class.hasSelection')
  get getHasSelection() {
    return this.hasSelection();
  }

  @ViewChild('fileInput') private input: ElementRef<HTMLInputElement>;

  abstract onDrop(event: DragEvent): void;

  abstract onFilesSelected(event: Event): void;

  abstract hasSelection(): boolean;

  abstract getIterableFiles(): File[];

  abstract removeFile(file: File, event?: Event): void;

  @HostListener('click')
  onClick() {
    if (!this.disabled) {
      this.input.nativeElement.click();
    }
  }

  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  @HostListener('dragenter')
  onDragEnter() {
    if (this.disabled) return;

    this.dragOverCounter++;
  }

  @HostListener('dragleave')
  onDragLeave() {
    if (this.disabled) return;

    this.dragOverCounter--;
  }

  abstract addFromClipboard(event: Event): Promise<void>;

  removeDragData(event: DragEvent) {
    this.dragOverCounter = 0;

    if (event.dataTransfer.items) {
      event.dataTransfer.items.clear();
    } else {
      event.dataTransfer.clearData();
    }
  }

  size(file: File): string {
    const size = file.size;
    const KiB = size < 1024 ** 2;
    return `${(file.size / (KiB ? 1024 : 1024 * 1024)).toPrecision(3)} ${
      KiB ? 'KiB' : 'MiB'
    }`;
  }

  onChange: (value: T) => void = () => void 0;
  registerOnChange(fn: () => void): void {
    this.onChange = fn;
  }

  onTouched = () => void 0;
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.dragOverCounter = 0;
    if (isDisabled === false) {
      this.disabledBecauseReachedMax = false;
    }
  }

  abstract writeValue(value: T): void;

  // This definitely isn't perfect but good enough for filtering out duplicates
  // and in various bits of logic where I need this. Don't want the perf hit of
  // comparing whole buffers!
  static isIdenticalFile(file1: File, file2: File) {
    return (
      file1.name === file2.name &&
      file1.lastModified === file2.lastModified &&
      file1.size === file2.size &&
      file1.type === file2.type
    );
  }
}
