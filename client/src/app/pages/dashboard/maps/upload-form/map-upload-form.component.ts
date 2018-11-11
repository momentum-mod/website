import {AfterViewInit, Component, ViewChild} from '@angular/core';
import {HttpEvent, HttpEventType} from '@angular/common/http';
import {Router} from '@angular/router';
import {ToasterService} from 'angular2-toaster';
import {MapsService} from '../../../../@core/data/maps.service';
import 'rxjs/add/operator/mergeMap';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {User} from '../../../../@core/models/user.model';

export interface ImageFilePreview {
  dataBlobURL: string;
  file: File;
}

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
  extraImages: ImageFilePreview[];
  mapUploadPercentage: number;
  isUploadingMap: boolean;
  authors: User[];
  testers: User[];
  specialThanks: User[];

  filesForm: FormGroup = this.fb.group({
    'map': ['', Validators.required],
    'avatar': ['', Validators.required],
    // TODO: the 5 optional image files
  });
  infoForm: FormGroup = this.fb.group( {
    'name': ['', Validators.required],
    'description': ['', [Validators.required, Validators.maxLength(1000)]],
    'numBonuses': [0, [Validators.required, Validators.min(0), Validators.max(64)]],
    'numCheckpoints': [0, [Validators.required, Validators.min(0), Validators.max(64)]],
    'numStages': [0, [Validators.required, Validators.min(0), Validators.max(64)]],
    'difficulty': [0, [Validators.required, Validators.min(0), Validators.max(6)]],
    'created': [new Date(), [Validators.required, Validators.max(Date.now())]],
  });
  creditsForm: FormGroup = this.fb.group({
    'authors': [[], Validators.required],
    'testers': this.fb.array([]),
    'specialThanks': this.fb.array([]),
  });
  forms: FormGroup[] = [this.filesForm, this.infoForm, this.creditsForm];

  get map() { return this.filesForm.get('map'); }
  get avatar() { return this.filesForm.get('avatar'); }
  get name() { return this.infoForm.get('name'); }
  get description() { return this.infoForm.get('description'); }
  get numBonuses() { return this.infoForm.get('numBonuses'); }
  get numCheckpoints() { return this.infoForm.get('numCheckpoints'); }
  get numStages() { return this.infoForm.get('numStages'); }
  get difficulty() { return this.infoForm.get('difficulty'); }
  get created() { return this.infoForm.get('created'); }

  constructor(private mapsService: MapsService,
              private router: Router,
              private toasterService: ToasterService,
              private fb: FormBuilder) {
    this.isUploadingMap = false;
    this.mapUploadPercentage = 0;
    this.authors = [];
    this.testers = [];
    this.specialThanks = [];
    this.extraImages = [];
  }
  ngAfterViewInit() {
    this.datePicker.max = new Date();
    this.datePicker.date = new Date();
  }

  onMapFileSelected(event) {
    this.mapFile = event.target.files[0];
    this.filesForm.patchValue({
      map: this.mapFile.name,
    });
    const nameVal = this.mapFile.name.replace(/.bsp/g, '');
    this.name.patchValue(nameVal);
  }

  onAvatarFileSelected(event) {
    this.avatarFile = event.target.files[0];
    this.filesForm.patchValue({
      avatar: this.avatarFile.name,
    });
  }

  onSubmit() {
    if (!(this.filesForm.valid || this.infoForm.valid || this.creditsForm.valid))
      return;
    let mapCreated = false;
    let mapID = '';
    let uploadLocation = '';
    this.mapsService.createMap(this.infoForm.value)
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
    this.filesForm.reset();
    this.infoForm.reset();
    this.creditsForm.reset();
    this.mapFile = null;
    this.avatarFile = null;
    this.mapUploadPercentage = 0;
  }

  markFormAsDirty(formG: FormGroup) {
    for (const i in formG.controls)
      formG.controls[i].markAsTouched();
  }

  touchForm(selected: number) {
    if (selected >= 0 && selected < this.forms.length )
      this.markFormAsDirty(this.forms[selected]);
  }

  onAuthorChange($event) {
    if ($event.added) {
      this.creditsForm.patchValue({
        authors: this.authors,
      });
    } else {
      this.creditsForm.setValue({
        authors: this.authors,
        testers: this.testers,
        specialThanks: this.specialThanks,
      });
    }
  }

  onTesterAdd($event) {
    // TODO: implement
  }

  onSTAdd($event) {
    // TODO: implement
  }

  getFileSource(img: File) {
    let reader = new FileReader();
    const handler = (e) => {
      this.extraImages.push({
        dataBlobURL: e.target.result,
        file: img,
      });
      reader.removeEventListener('load', handler, false);
      reader = null;
    };
    reader.addEventListener('load', handler, false);
    reader.readAsDataURL(img);
  }

  onExtraImageSelected($event) {
    this.getFileSource($event.target.files[0]);
  }
}
