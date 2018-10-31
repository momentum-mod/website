import {AfterViewInit, Component, ViewChild} from '@angular/core';
import {HttpEvent, HttpEventType} from '@angular/common/http';
import {Router} from '@angular/router';
import {ToasterService} from 'angular2-toaster';
import {MapsService} from '../../../../@core/data/maps.service';
import 'rxjs/add/operator/mergeMap';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {User} from '../../../../@core/models/user.model';

@Component({
  selector: 'map-upload-form',
  templateUrl: './map-upload-form.component.html',
  styleUrls: ['./map-upload-form.component.scss'],
})
export class MapUploadFormComponent implements AfterViewInit {
  @ViewChild('uploadFile') uploadFile;
  @ViewChild('datepicker') datePicker;

  mapFile: File;
  avatarFile: File;
  mapUploadPercentage: number;
  isUploadingMap: boolean;
  authors: User[];
  testers: User[];
  specialThanks: User[];

  mapUploadFormGroup: FormGroup = this.fb.group({
    'name': ['', Validators.required],
    'info': this.fb.group({
      'description': ['', [Validators.required, Validators.maxLength(1000)]],
      'numBonuses': [0, [Validators.required, Validators.min(0), Validators.max(64)]],
      'numCheckpoints': [0, [Validators.required, Validators.min(0), Validators.max(64)]],
      'numStages': [0, [Validators.required, Validators.min(0), Validators.max(64)]],
      'difficulty': [0, [Validators.required, Validators.min(0), Validators.max(6)]],
      'created': [new Date(), [Validators.required, Validators.max(Date.now())]],
    }),
  });
  get name() { return this.mapUploadFormGroup.get('name'); }
  get info() { return this.mapUploadFormGroup.get('info'); }
  get description() { return this.info.get('description'); }
  get numBonuses() { return this.info.get('numBonuses'); }
  get numCheckpoints() { return this.info.get('numCheckpoints'); }
  get numStages() { return this.info.get('numStages'); }
  get difficulty() { return this.info.get('difficulty'); }
  get created() { return this.info.get('created'); }

  constructor(private mapsService: MapsService,
              private router: Router,
              private toasterService: ToasterService,
              private fb: FormBuilder) {
    this.isUploadingMap = false;
    this.mapUploadPercentage = 0;
    this.authors = [];
    this.testers = [];
    this.specialThanks = [];
  }
  ngAfterViewInit() {
    this.datePicker.max = new Date();
    this.datePicker.date = new Date();
  }

  onMapFileSelected(event) {
    this.mapFile = event.target.files[0];
    this.mapUploadFormGroup.patchValue({
      name: this.mapFile.name.replace(/.bsp/g, ''),
    });
  }

  onAvatarFileSelected(event) {
    this.avatarFile = event.target.files[0];
  }

  onSubmit() {
    if (!this.mapUploadFormGroup.valid)
      return;
    let mapCreated = false;
    let mapID = '';
    let uploadLocation = '';
    this.mapsService.createMap(this.mapUploadFormGroup.value)
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
          this.isUploadingMap = true;
          break;
        case HttpEventType.Response:
          this.onSubmitSuccess();
          break;
        case 1: {
          const calc: number = Math.round(event['loaded'] / event['total'] * 100);
          if (this.mapUploadPercentage !== calc) {
            this.mapUploadPercentage = calc;
            break;
          }
        }
      }
    }, err => {
      const errorMessage = err.error.error ?
        err.error.error.message
        : 'Something went wrong!';
      console.error(errorMessage);
      this.isUploadingMap = false;
      if (mapCreated) {
        this.onSubmitSuccess();
      }
      this.toasterService.popAsync('error', 'Failed to create map', errorMessage);
    });
  }

  private onSubmitSuccess() {
    this.resetForm();
    this.isUploadingMap = false;
    this.router.navigate(['/dashboard/maps/uploads']);
  }

  private resetForm() {
    this.mapUploadFormGroup.reset();
    this.mapFile = null;
    this.avatarFile = null;
    this.mapUploadPercentage = 0;
  }
}
