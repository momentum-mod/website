import {Component, ViewChild} from '@angular/core';

@Component({
  selector: 'app-map-queue',
  templateUrl: './uploads.component.html',
  styleUrls: ['./uploads.component.scss'],
})

export class UploadsComponent {
  @ViewChild('uploadFile') uploadFile;

  fileToUpload: File;
  onFileSelected(event) {
    this.fileToUpload = event.target.files[0];
  }
}

