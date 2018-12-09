import {AfterViewInit, Component, ViewChild} from '@angular/core';
import {HttpEvent, HttpEventType} from '@angular/common/http';
import {Router} from '@angular/router';
import {ToasterService} from 'angular2-toaster';
import {MapsService} from '../../../../@core/data/maps.service';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/observable/forkJoin';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {User} from '../../../../@core/models/user.model';
import {MapCreditType} from '../../../../@core/models/map-credit-type.model';
import {Observable, of} from 'rxjs';
import {MomentumMapType} from '../../../../@core/models/map-type.model';
import {MomentumMap} from '../../../../@core/models/momentum-map.model';
import {LocalUserService} from '../../../../@core/data/local-user.service';

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
  @ViewChild('datepicker') datePicker;

  mapFile: File;
  avatarFile: File;
  avatarFilePreview: ImageFilePreview;
  extraImages: ImageFilePreview[];
  mapUploadPercentage: number;
  isUploadingMap: boolean;
  authors: User[];
  testers: User[];
  specialThanks: User[];
  inferredMapType: boolean;
  MapTypes: typeof MomentumMapType = MomentumMapType;

  filesForm: FormGroup = this.fb.group({
    'map': ['', [Validators.required, Validators.pattern('.+(\\.bsp)')]],
    'avatar': ['', [Validators.required, Validators.pattern(/.+(\.(pn|jpe?)g)/i)]],
    // 'images': new FormArray()
    // TODO: the 5 optional image files
  });
  infoForm: FormGroup = this.fb.group( {
    'name': ['', [Validators.required, Validators.maxLength(32)]],
    'type': [this.MapTypes.UNKNOWN, Validators.required],
    'description': ['', [Validators.required, Validators.maxLength(1000)]],
    'numBonuses': [0, [Validators.required, Validators.min(0), Validators.max(255)]],
    'numZones': [1, [Validators.required, Validators.min(1), Validators.max(255)]],
    'isLinear': [false, [Validators.required]],
    'difficulty': [0, [Validators.required, Validators.min(0), Validators.max(6)]],
    'creationDate': [new Date(), [Validators.required, Validators.max(Date.now())]],
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
  get type() { return this.infoForm.get('type'); }
  get description() { return this.infoForm.get('description'); }
  get numBonuses() { return this.infoForm.get('numBonuses'); }
  get numZones() { return this.infoForm.get('numZones'); }
  get isLinear() { return this.infoForm.get('isLinear'); }
  get difficulty() { return this.infoForm.get('difficulty'); }
  get creationDate() { return this.infoForm.get('creationDate'); }

  constructor(private mapsService: MapsService,
              private router: Router,
              private localUsrService: LocalUserService,
              private toasterService: ToasterService,
              private fb: FormBuilder) {
    this.isUploadingMap = false;
    this.mapUploadPercentage = 0;
    this.authors = [];
    this.testers = [];
    this.specialThanks = [];
    this.extraImages = [];
    this.inferredMapType = false;
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
    const nameVal = this.mapFile.name.replace(/.bsp/g, '').toLowerCase();
    this.name.patchValue(nameVal);
    // Infer type from name
    let type = MomentumMapType.UNKNOWN;
    if (nameVal.startsWith('surf_'))
      type = MomentumMapType.SURF;
    else if (nameVal.startsWith('bhop_'))
      type = MomentumMapType.BHOP;
    else if (nameVal.startsWith('kz_'))
      type = MomentumMapType.KZ;
    else if (nameVal.startsWith('trikz_'))
      type = MomentumMapType.TRIKZ;
    else if (nameVal.startsWith('jump_'))
      type = MomentumMapType.RJ;
    this.type.patchValue(type);
    this.inferredMapType = type !== MomentumMapType.UNKNOWN;
  }

  onAvatarFileSelected(file: File) {
    this.avatarFile = file;
    this.getFileSource(file, ((blobURL, img) => {
      this.avatarFilePreview = {
        dataBlobURL: blobURL,
        file: img,
      };
    }));
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
      type: this.type.value,
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
    this.inferredMapType = false;
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

  getFileSource(img: File, callback: (blobURL, img: File) => void) {
    let reader = new FileReader();
    const handler = (e) => {
      callback(e.target.result, img);
      reader.removeEventListener('load', handler, false);
      reader = null;
    };
    reader.addEventListener('load', handler, false);
    reader.readAsDataURL(img);
  }

  onExtraImageSelected(file: File) {
    this.getFileSource(file, (blobURL, img) => {
      this.extraImages.push({
        dataBlobURL: blobURL,
        file: img,
      });
    });
  }

  removeExtraImage(img: ImageFilePreview) {
    this.extraImages.splice(this.extraImages.findIndex(i => i === img), 1);
  }

  getAllCredits() {
    const credits = [];
    for (let i = 0; i < this.authors.length; i++)
      credits.push({userID: this.authors[i].id, user: this.authors[i], type: MapCreditType.AUTHOR });
    for (let i = 0; i < this.testers.length; i++)
      credits.push({userID: this.testers[i].id, user: this.testers[i], type: MapCreditType.TESTER });
    for (let i = 0; i < this.specialThanks.length; i++)
      credits.push({userID: this.specialThanks[i].id, user: this.specialThanks[i], type: MapCreditType.SPECIAL_THANKS});
    return credits;
  }

  getMapPreview(): MomentumMap {
    return {
      id: 0,
      name: this.name.value,
      type: this.type.value,
      hash: 'not-important-yet',
      statusFlag: 0,
      info: {
        id: '0',
        mapID: 0,
        avatarURL: 'not-important-yet',
        description: this.description.value,
        numBonuses: this.numBonuses.value,
        numZones: this.numZones.value,
        isLinear: this.isLinear.value,
        difficulty: this.difficulty.value,
        creationDate: this.creationDate.value,
      },
      credits: this.getAllCredits(),
      submitter: this.localUsrService.localUser,
    };
  }
}
