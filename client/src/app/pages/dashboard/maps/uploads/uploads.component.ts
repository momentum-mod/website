import {Component, ViewChild} from '@angular/core';
import {HttpEvent, HttpEventType} from '@angular/common/http';
import {Router} from '@angular/router';
import {ToasterService} from 'angular2-toaster';
import {MapsService} from '../../../../@core/data/maps.service';
import 'rxjs/add/operator/mergeMap';

@Component({
  selector: 'app-map-queue',
  templateUrl: './uploads.component.html',
  styleUrls: ['./uploads.component.scss'],
})

export class UploadsComponent {
  @ViewChild('uploadFile') uploadFile;

  mapFile: File;
  avatarFile: File;
  mapUploadPercentage: number;
  formData = {
    name: '',
    info: {
      description: '',
      numBonuses: 0,
      numCheckpoints: 0,
      numStages: 0,
      difficulty: 0,
    },
  };

  constructor(private mapsService: MapsService,
              private router: Router,
              private toasterService: ToasterService) {
  }

  onMapFileSelected(event) {
    this.mapFile = event.target.files[0];
  }

  onAvatarFileSelected(event) {
    this.avatarFile = event.target.files[0];
  }

  onSubmit() {
    if (!this.isFormDataValid()) return;
    let mapCreated = false;
    let mapID = '';
    let uploadLocation = '';
    this.mapsService.createMap(this.formData)
    .mergeMap(res => {
      mapID = res.body.id;
      uploadLocation = res.headers.get('Location');
      mapCreated = true;
      this.toasterService.popAsync('success', 'Map successfully created', 'Please wait for the map file to upload');
      return this.mapsService.updateMapAvatar(mapID, this.avatarFile);
    }).mergeMap(() => {
      return this.mapsService.uploadMapFile(uploadLocation, this.mapFile);
    }).subscribe((event: HttpEvent<any>) => {
      switch (event.type) {
        case HttpEventType.Sent:
          // upload started
          break;
        case HttpEventType.Response:
          this.onSubmitSuccess();
          break;
        case 1: {
          if (Math.round(this.mapUploadPercentage) !== Math.round(event['loaded'] / event['total'] * 100)) {
            this.mapUploadPercentage = event['loaded'] / event['total'] * 100;
            this.mapUploadPercentage = Math.round(this.mapUploadPercentage);
            break;
          }
        }
      }
    }, err => {
      const errorMessage = err.error.error ?
        err.error.error.message
        : 'Something went wrong!';
      console.error(errorMessage);
      if (mapCreated) {
        this.onSubmitSuccess();
      }
      this.toasterService.popAsync('error', 'Failed to create map', errorMessage);
    });
  }

  private onSubmitSuccess() {
    this.resetForm();
    this.router.navigate(['/dashboard/maps/uploads']);
  }

  private resetForm() {
    this.formData = {
      name: '',
      info: {
        description: '',
        numBonuses: 0,
        numCheckpoints: 0,
        numStages: 0,
        difficulty: 0,
      },
    };
    this.mapFile = null;
    this.avatarFile = null;
    this.mapUploadPercentage = 0;
  }

  private isFormDataValid(): boolean {
    // TODO: there a more 'angular' way to do this?
    let invalidMessage = '';
    if (!this.formData.name) {
      invalidMessage = 'Please provide a map name';
    } else if (!this.mapFile) {
      invalidMessage = 'Please choose a map file to upload';
    } else if (!this.avatarFile) {
      invalidMessage = 'Please choose an avatar file to upload';
    } else {
      return true;
    }
    this.toasterService.popAsync('error', invalidMessage, '');
    return false;
  }
}
