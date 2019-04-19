import {AfterViewInit, Component, OnInit, ViewChild} from '@angular/core';
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
import {MapTrack} from '../../../../@core/models/map-track.model';
import * as VDF from '@node-steam/vdf';
import {MapZone} from '../../../../@core/models/map-zone.model';
import {CreditChangeEvent} from '../map-credits/map-credit/map-credit.component';

export interface ImageFilePreview {
  dataBlobURL: string;
  file: File;
}

@Component({
  selector: 'map-upload-form',
  templateUrl: './map-upload-form.component.html',
  styleUrls: ['./map-upload-form.component.scss'],
})
export class MapUploadFormComponent implements OnInit, AfterViewInit {
  @ViewChild('datepicker') datePicker;
  @ViewChild('stepper') stepper;

  mapFile: File;
  avatarFile: File;
  zoneFile: File;
  avatarFilePreview: ImageFilePreview;
  extraImages: ImageFilePreview[];
  mapUploadPercentage: number;
  isUploadingMap: boolean;
  creditArr: User[][];
  inferredMapType: boolean;
  MapTypes = MomentumMapType;
  mapPreview: MomentumMap;
  tracks: MapTrack[];

  filesForm: FormGroup = this.fb.group({
    'map': ['', [Validators.required, Validators.pattern('.+(\\.bsp)')]],
    'avatar': ['', [Validators.required, Validators.pattern(/.+(\.(pn|jpe?)g)/i)]],
    // 'images': new FormArray()
    // TODO: the 5 optional image files
  });
  infoForm: FormGroup = this.fb.group( {
    'name': ['', [Validators.required, Validators.maxLength(32)]],
    'type': [ MomentumMapType.UNKNOWN, Validators.required],
    'description': ['', [Validators.required, Validators.maxLength(1000)]],
    'creationDate': [new Date(), [Validators.required, Validators.max(Date.now())]],
  });
  creditsForm: FormGroup = this.fb.group({
    'authors': [[], Validators.required],
    'coauthors': [[]],
    'testers': [[]],
    'specialThanks': [[]],
  });
  forms: FormGroup[] = [this.filesForm, this.infoForm, this.creditsForm];

  get map() { return this.filesForm.get('map'); }
  get avatar() { return this.filesForm.get('avatar'); }
  get name() { return this.infoForm.get('name'); }
  get type() { return this.infoForm.get('type'); }
  get description() { return this.infoForm.get('description'); }
  get creationDate() { return this.infoForm.get('creationDate'); }

  constructor(private mapsService: MapsService,
              private router: Router,
              private localUsrService: LocalUserService,
              private toasterService: ToasterService,
              private fb: FormBuilder) {
    this.stepper = null;
    this.isUploadingMap = false;
    this.mapUploadPercentage = 0;
    this.creditArr = [[], [], [], []];
    this.extraImages = [];
    this.tracks = [];
    this.inferredMapType = false;
    this.zoneFile = null;
    this.avatarFile = null;
    this.mapFile = null;
  }
  ngAfterViewInit() {
    this.datePicker.max = new Date();
    this.datePicker.date = new Date();
  }
  ngOnInit(): void {
    this.creditsForm.valueChanges.subscribe(() => this.generatePreviewMap());
    this.infoForm.valueChanges.subscribe(() => this.generatePreviewMap());
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
    this.getFileSource(file, true, ((blobURL, img) => {
      this.avatarFilePreview = {
        dataBlobURL: blobURL,
        file: img,
      };
    }));
    this.filesForm.patchValue({
      avatar: this.avatarFile.name,
    });
  }

  parseTrack(trackNum: number, track: Object): MapTrack {
    const trackReturn: MapTrack = {
      trackNum: trackNum,
      numZones: 0,
      isLinear: false,
      difficulty: 1,
      zones: [],
      stats: {
        baseStats: {},
      },
    };
    for (const zone in track) {
      if (track.hasOwnProperty(zone)) {
        const zoneNum = Number(zone);
        trackReturn.numZones = Math.max(trackReturn.numZones, zoneNum);
        trackReturn.isLinear = track[zone].zone_type === 3;

        const zoneMdl: MapZone = {
          zoneNum: zoneNum,
          zoneType: track[zone].zoneType,
          geometry: track[zone].geometry,
          stats: {
            baseStats: {},
          },
        };
        if (track[zone].zoneProps)
          zoneMdl.zoneProps = {properties: track[zone].zoneProps};
        if (zoneNum === 0)
          delete zoneMdl.stats;
        trackReturn.zones.push(zoneMdl);
      }
    }
    return trackReturn;
  }

  onZoneFileSelected(file: File) {
    this.tracks = [];
    this.zoneFile = file;
    this.getFileSource(file, false, (result, originalFile) => {
      const zoneFile = VDF.parse(result);
      const tracks = zoneFile.tracks;
      for (const trackNum in tracks) {
        if (tracks.hasOwnProperty(trackNum)) {
          this.tracks.push(this.parseTrack(Number(trackNum), tracks[trackNum]));
        }
      }
      this.generatePreviewMap();
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
      tracks: this.tracks,
      credits: this.getAllCredits(),
      stats: {baseStats: {}},
    };
    mapObject.info.numTracks = this.tracks.length;
    delete mapObject.info.name;
    delete mapObject.info.type;
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
        case HttpEventType.UploadProgress: {
          const calc: number = Math.round(event['loaded'] / event['total'] * 100);
          if (this.mapUploadPercentage !== calc) {
            this.mapUploadPercentage = calc;
          }
          break;
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

  onCreditChanged($event: CreditChangeEvent) {
    if ($event.added) {
      const types = ['authors', 'coauthors', 'tester', 'specialThanks'];
      this.creditsForm.get(types[$event.type]).patchValue($event.user);
    } else {
      this.creditsForm.setValue({
        authors: this.creditArr[MapCreditType.AUTHOR],
        coauthors: this.creditArr[MapCreditType.COAUTHOR],
        testers: this.creditArr[MapCreditType.TESTER],
        specialThanks: this.creditArr[MapCreditType.SPECIAL_THANKS],
      });
    }
  }

  getFileSource(img: File, isImage: boolean, callback: (result: any, originalFile: File) => void) {
    let reader = new FileReader();
    const handler = (e) => {
      callback(e.target.result, img);
      reader.removeEventListener('load', handler, false);
      reader = null;
    };
    reader.addEventListener('load', handler, false);
    if (isImage)
      reader.readAsDataURL(img);
    else
      reader.readAsText(img);
  }

  onExtraImageSelected(file: File) {
    this.getFileSource(file, true, (blobURL, img) => {
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
    for (let credType = 0; credType < MapCreditType.LENGTH; credType++) {
      for (const usr of this.creditArr[credType]) {
        credits.push({userID: usr.id, user: usr, type: credType});
      }
    }
    return credits;
  }
  generatePreviewMap(): void {
    this.mapPreview = {
      id: 0,
      name: this.name.value,
      type: this.type.value,
      hash: 'not-important-yet',
      statusFlag: 0,
      info: {
        id: '0',
        mapID: 0,
        description: this.description.value,
        numTracks: this.tracks.length,
        creationDate: this.creationDate.value,
      },
      mainTrack: this.tracks.length > 0 ? this.tracks[0] : null,
      tracks: this.tracks,
      credits: this.getAllCredits(),
      submitter: this.localUsrService.localUser,
    };
  }

  onRemoveZones() {
    this.tracks = [];
    this.zoneFile = null;
  }
}
