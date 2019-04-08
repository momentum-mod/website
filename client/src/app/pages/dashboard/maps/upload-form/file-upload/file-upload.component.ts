import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';

export enum FileUploadType {
  ALL = '',
  MAP = 'map',
  IMAGE = 'image',
  ZONES = 'zones',
}

@Component({
  selector: 'file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss'],
})
export class FileUploadComponent implements OnInit {

  /**
   * The type of files this component allows to be uploaded
   */
  @Input('type') type: FileUploadType;
  /**
   * The total size, in MB, allowed for the size of the file
   */
  @Input('limit-size') limit_size: number;
  /**
   * Whether this component should show the selected file's name
   */
  @Input('show-selected') showSelected: boolean;
  @Output() fileSelected: EventEmitter<File>;
  dragOver: boolean;
  invalidSize: boolean;
  invalidType: boolean;
  selectedFile: File;
  acceptString: string;
  matchString: any;
  constructor() {
    this.selectedFile = null;
    this.limit_size = 0;
    this.fileSelected = new EventEmitter<File>();
    this.dragOver = false;
    this.acceptString = '';
    this.matchString = '';
    this.type = FileUploadType.ALL;
    this.invalidType = false;
    this.invalidSize = false;
    this.showSelected = false;
  }

  ngOnInit() {
    if (this.type === FileUploadType.MAP) {
      this.acceptString = '.bsp';
      this.matchString = '.+(\\.bsp)';
    } else if (this.type === FileUploadType.IMAGE) {
      this.acceptString = 'image/png,image/jpeg';
      this.matchString = /.+(\.(pn|jpe?)g)/i;
    } else if (this.type === FileUploadType.ZONES) {
      this.acceptString = '.zon';
      this.matchString = '.+(\\.zon)';
    }
  }

  validateFile(file: File): boolean {
    const size = file.size / 1048576;
    if (this.limit_size > 0 && size > this.limit_size) {
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
      for (let i = 0; i < $event.dataTransfer.items.length; i++) {
        // If dropped items aren't files, reject them
        if ($event.dataTransfer.items[i].kind === 'file') {
          const file = $event.dataTransfer.items[i].getAsFile();
          if (this.validateFile(file)) {
            this.selectedFile = file;
            this.fileSelected.emit(file);
          }
          break;
        }
      }
    } else {
      // Use DataTransfer interface to access the file(s)
      if ($event.dataTransfer.files.length > 0) {
        const file = $event.dataTransfer.files[0];
        if (this.validateFile(file)) {
          this.selectedFile = file;
          this.fileSelected.emit(file);
        }
      }
    }

    this.dragOver = false;

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
    this.fileSelected.emit($event.target.files[0]);
  }
}
