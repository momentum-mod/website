import {AfterViewInit, Component, ViewChild} from '@angular/core';
import {HttpEvent, HttpEventType} from '@angular/common/http';
import {Router} from '@angular/router';
import {ToasterService} from 'angular2-toaster';
import {MapsService} from '../../../../@core/data/maps.service';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/observable/forkJoin';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {User} from '../../../../@core/models/user.model';
import {Map_Credit_Type} from '../../../../@core/models/map-credit-type.model';
import {Observable, of} from 'rxjs';

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
    'map': ['', [Validators.required, Validators.pattern('.+(\\.bsp)')]],
    'avatar': ['', [Validators.required, Validators.pattern(/.+(\.(pn|jpe?)g)/i)]],
    // 'images': new FormArray()
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

  onMapFileSelected(file: File) {
    this.mapFile = file;
    this.filesForm.patchValue({
      map: this.mapFile.name,
    });
    const nameVal = this.mapFile.name.replace(/.bsp/g, '');
    this.name.patchValue(nameVal);
  }

  onAvatarFileSelected(file: File) {
    this.avatarFile = file;
    this.filesForm.patchValue({
      avatar: this.avatarFile.name,
    });
  }

  onSubmit() {
    if (!(this.filesForm.valid && this.infoForm.valid && this.creditsForm.valid))
      return;
    let mapCreated = false;
    let mapID: number = -1;
    let uploadLocation = '';

    const mapObject = {
      name: this.name.value,
      info: this.infoForm.value,
      credits: this.getAllCredits(),
    };
    this.mapsService.createMap(mapObject)
    .mergeMap(res => {
      mapID = res.body.id;
      uploadLocation = res.headers.get('Location');
      mapCreated = true;
      this.toasterService.popAsync('success', 'Map successfully created', 'Please wait for the map file to upload');
      return this.mapsService.updateMapAvatar(mapID, this.avatarFile);
    }).mergeMap(() => {
      const extraImageCreations = [];
      for (let i = 0; i < this.extraImages.length; i++)
        extraImageCreations.push(this.mapsService.createMapImage(mapID, this.extraImages[i].file));
      if (extraImageCreations.length)
        return Observable.forkJoin(extraImageCreations);
      return of({});
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
      console.error(err);
      const errorMessage = err.error.error ?
        err.error.error.message
        : 'Something went wrong!';
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

  onExtraImageSelected(file: File) {
    this.getFileSource(file);
  }

  removeExtraImage(img: ImageFilePreview) {
    this.extraImages.splice(this.extraImages.findIndex(i => i === img), 1);
  }

  getAllCredits() {
    const credits = [];
    for (let i = 0; i < this.authors.length; i++)
      credits.push({ userID: this.authors[i].id, type: Map_Credit_Type.AUTHOR });
    for (let i = 0; i < this.testers.length; i++)
      credits.push({ userID: this.testers[i].id, type: Map_Credit_Type.TESTER });
    for (let i = 0; i < this.specialThanks.length; i++)
      credits.push({ userID: this.specialThanks[i].id, type: Map_Credit_Type.SPECIAL_THANKS });
    return credits;
  }
}
