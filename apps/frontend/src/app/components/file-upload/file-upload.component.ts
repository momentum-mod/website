import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

export enum FileUploadType {
  ALL = '',
  MAP = 'map',
  IMAGE = 'image',
  ZONES = 'zones'
}

@Component({
  selector: 'mom-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss']
})
export class FileUploadComponent implements OnInit {
  /**
   * The type of files this component allows to be uploaded
   */
  @Input() type: FileUploadType;
  /**
   * The total size, in MB, allowed for the size of the file
   */
  @Input() limitSize: number;
  /**
   * Whether this component should show the selected file's name
   */
  @Input() showSelected: boolean;
  /**
   * Whether allow multiple selections
   */
  @Input() multiple: boolean;
  @Output() fileSelected: EventEmitter<File>;
  dragOver: number;
  invalidSize: boolean;
  invalidType: boolean;
  selectedFile: File;
  acceptString: string;
  matchString: any;
  constructor() {
    this.selectedFile = null;
    this.limitSize = 0;
    this.fileSelected = new EventEmitter<File>();
    this.dragOver = 0;
    this.acceptString = '';
    this.matchString = '';
    this.type = FileUploadType.ALL;
    this.invalidType = false;
    this.invalidSize = false;
    this.showSelected = false;
    this.multiple = false;
  }

  ngOnInit() {
    switch (this.type) {
      case FileUploadType.MAP: {
        this.acceptString = '.bsp';
        this.matchString = /.+(\.bsp)/;
        break;
      }
      case FileUploadType.IMAGE: {
        this.acceptString = 'image/png,image/jpeg';
        this.matchString = /.+(\.(pn|jpe?)g)/i;
        break;
      }
      case FileUploadType.ZONES: {
        this.acceptString = '.zon';
        this.matchString = /.+(\.zon)/;
        break;
      }
      // No default
    }
  }

  validateFile(file: File): boolean {
    const size = file.size / 1048576;
    if (this.limitSize > 0 && size > this.limitSize) {
      this.invalidSize = true;
      return false;
    }
    const match = file.name.match(this.matchString);
    if (!match) {
      this.invalidType = true;
      return false;
    }
    return true;
  }

  dropHandler($event) {
    this.invalidSize = false;
    this.invalidType = false;
    // Prevent default behavior (Prevent file from being opened)
    $event.preventDefault();

    if ($event.dataTransfer.items) {
      // Use DataTransferItemList interface to access the file(s)
      for (const item of $event.dataTransfer.items) {
        // If dropped items aren't files, reject them
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (this.validateFile(file)) {
            this.selectedFile = file;
            this.fileSelected.emit(file);
          }
          if (!this.multiple) break;
        }
      }
    } else {
      // Use DataTransfer interface to access the file(s)
      for (const file of $event.dataTransfer.files) {
        if (this.validateFile(file)) {
          this.selectedFile = file;
          this.fileSelected.emit(file);
        }
        if (!this.multiple) break;
      }
    }

    this.dragOver = 0;

    // Pass event to removeDragData for cleanup
    this.removeDragData($event);
  }

  dragOverHandler($event) {
    // Prevent default behavior (Prevent file from being opened)
    $event.preventDefault();
  }

  removeDragData(ev) {
    if (ev.dataTransfer.items) {
      // Use DataTransferItemList interface to remove the drag data
      ev.dataTransfer.items.clear();
    } else {
      // Use DataTransfer interface to remove the drag data
      ev.dataTransfer.clearData();
    }
  }

  onFileSelected($event) {
    for (const file of $event.target.files) {
      if (this.validateFile(file)) {
        this.selectedFile = file;
        this.fileSelected.emit(file);
      }
    }
    // Clear value to allow same file(s) selected
    $event.target.value = '';
  }
}
