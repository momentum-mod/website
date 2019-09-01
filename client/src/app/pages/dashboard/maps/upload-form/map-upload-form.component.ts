import {AfterViewInit, Component, OnInit, ViewChild} from '@angular/core';
import {HttpEvent, HttpEventType} from '@angular/common/http';
import {Router} from '@angular/router';
import {MapsService} from '../../../../@core/data/maps.service';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {User} from '../../../../@core/models/user.model';
import {MapCreditType} from '../../../../@core/models/map-credit-type.model';
import {MomentumMapType} from '../../../../@core/models/map-type.model';
import {LocalUserService} from '../../../../@core/data/local-user.service';
import {MapTrack} from '../../../../@core/models/map-track.model';
import * as VDF from '@node-steam/vdf';
import {MapZone} from '../../../../@core/models/map-zone.model';
import {CreditChangeEvent} from '../map-credits/map-credit/map-credit.component';
import {MapZoneTrigger} from '../../../../@core/models/map-zone-trigger.model';
import {MapZoneType} from '../../../../@core/models/map-zone-type.model';
import {MomentumMapPreview} from '../../../../@core/models/momentum-map-preview.model';
import {MapImage} from '../../../../@core/models/map-image.model';
import {NbToastrService} from '@nebular/theme';
import {mergeMap} from 'rxjs/operators';
import {forkJoin, of} from 'rxjs';

export interface ImageFilePreview {
  dataBlobURL: string;
  file: File;
}

const youtubeRegex = /[a-zA-Z0-9_-]{11}/;

@Component({
  selector: 'map-upload-form',
  templateUrl: './map-upload-form.component.html',
  styleUrls: ['./map-upload-form.component.scss'],
})
export class MapUploadFormComponent implements OnInit, AfterViewInit {
  @ViewChild('datepicker', {static: false}) datePicker;
  @ViewChild('stepper', {static: false}) stepper;

  mapFile: File;
  avatarFile: File;
  zoneFile: File;
  avatarFilePreview: ImageFilePreview;
  extraImages: ImageFilePreview[];
  extraImagesLimit: number;
  mapUploadPercentage: number;
  isUploadingMap: boolean;
  creditArr: User[][];
  inferredMapType: boolean;
  MapTypes = MomentumMapType;
  mapPreview: MomentumMapPreview;
  tracks: MapTrack[];

  filesForm: FormGroup = this.fb.group({
    'map': ['', [Validators.required, Validators.pattern(/.+(\.bsp)/)]],
    'avatar': ['', [Validators.required, Validators.pattern(/.+(\.(pn|jpe?)g)/i)]],
    'youtubeURL': ['', [Validators.pattern(youtubeRegex)]],
  });
  infoForm: FormGroup = this.fb.group( {
    'name': ['', [Validators.required, Validators.maxLength(32)]],
    'type': [ MomentumMapType.UNKNOWN, Validators.required],
    'description': ['', [Validators.required, Validators.maxLength(1000)]],
    'creationDate': [new Date(), [Validators.required, Validators.max(Date.now())]],
    'zones': ['', [Validators.required, Validators.pattern(/.+(\.zon)/)]],
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
  get youtubeURL() { return this.filesForm.get('youtubeURL'); }
  get name() { return this.infoForm.get('name'); }
  get type() { return this.infoForm.get('type'); }
  get description() { return this.infoForm.get('description'); }
  get creationDate() { return this.infoForm.get('creationDate'); }

  constructor(private mapsService: MapsService,
              private router: Router,
              private localUsrService: LocalUserService,
              private toasterService: NbToastrService,
              private fb: FormBuilder) {
    this.stepper = null;
    this.isUploadingMap = false;
    this.mapUploadPercentage = 0;
    this.extraImagesLimit = 5;
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
    this.youtubeURL.valueChanges.subscribe(() => this.generatePreviewMap());
    this.creditsForm.valueChanges.subscribe(() => this.generatePreviewMap());
    this.infoForm.valueChanges.subscribe(() => this.generatePreviewMap());
  }

  onMapFileSelected(file: File) {
    this.mapFile = file;
    this.map.patchValue(this.mapFile.name);
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
      this.generatePreviewMap();
    }));
    this.avatar.patchValue(this.avatarFile.name);
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

        const zoneMdl: MapZone = {
          zoneNum: zoneNum,
          triggers: [],
          stats: {
            baseStats: {},
          },
        };
        for (const trigger in track[zone].triggers) {
          if (track[zone].triggers.hasOwnProperty(trigger)) {
            const triggerObj = track[zone].triggers[trigger];
            if (!trackReturn.isLinear)
              trackReturn.isLinear = triggerObj.type === MapZoneType.ZONE_CHECKPOINT;
            const zoneMdlTrigger: MapZoneTrigger = {
              type: triggerObj.type,
              points: triggerObj.points,
              pointsZPos: triggerObj.pointsZPos,
              pointsHeight: triggerObj.pointsHeight,
            };
            if (triggerObj.zoneProps)
              zoneMdlTrigger.zoneProps = {properties: triggerObj.zoneProps};
            zoneMdl.triggers.push(zoneMdlTrigger);
          }
        }
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
    this.infoForm.patchValue({zones: this.zoneFile.name});
  }

  onSubmit($event) {
    if (!(this.filesForm.valid && this.infoForm.valid && this.creditsForm.valid))
      return;
    // Prevent from spamming submit button
    $event.target.disabled = true;

    let mapCreated = false;
    let mapID: number = -1;
    let uploadLocation = '';

    const mapObject = {
      name: this.name.value,
      type: this.type.value,
      info: {
        description: this.description.value,
        youtubeID: this.mapPreview.map.info.youtubeID,
        numTracks: this.tracks.length,
        creationDate: this.creationDate.value,
      },
      tracks: this.tracks,
      credits: this.getAllCredits(),
      stats: {baseStats: {}},
    };
    this.mapsService.createMap(mapObject)
      .pipe(
        mergeMap(res => {
          mapID = res.body.id;
          uploadLocation = res.headers.get('Location');
          mapCreated = true;
          this.toasterService.success('Please wait for the map file to upload', 'Map successfully created');
          return this.mapsService.updateMapAvatar(mapID, this.avatarFile);
        }),
        mergeMap(() => {
          const extraImageCreations = [];
          for (let i = 0; i < this.extraImages.length; i++)
            extraImageCreations.push(this.mapsService.createMapImage(mapID, this.extraImages[i].file));
          if (extraImageCreations.length)
            return forkJoin(extraImageCreations);
          return of({});
        }),
        mergeMap(() => {
          return this.mapsService.uploadMapFile(uploadLocation, this.mapFile);
        }),
      ).subscribe((event: HttpEvent<any>) => {
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
      $event.target.disabled = false;
      this.isUploadingMap = false;
      if (mapCreated) {
        this.onSubmitSuccess();
      }
      this.toasterService.danger(errorMessage, 'Failed to create map');
    });
  }

  private onSubmitSuccess() {
    this.isUploadingMap = false;
    this.router.navigate(['/dashboard/maps/uploads']);
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
      const types = ['authors', 'coauthors', 'testers', 'specialThanks'];
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
    if (this.extraImages.length >= this.extraImagesLimit)
      return;
    this.getFileSource(file, true, (blobURL, img) => {
      this.extraImages.push({
        dataBlobURL: blobURL,
        file: img,
      });
      this.generatePreviewMap();
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
    const youtubeIDMatch = this.youtubeURL.value.match(youtubeRegex);
    this.mapPreview = {
      map: {
        id: 0,
        name: this.name.value,
        type: this.type.value,
        hash: 'not-important-yet',
        statusFlag: 0,
        info: {
          id: '0',
          mapID: 0,
          description: this.description.value,
          youtubeID: youtubeIDMatch ? youtubeIDMatch[0] : null,
          numTracks: this.tracks.length,
          creationDate: this.creationDate.value,
        },
        mainTrack: this.tracks.length > 0 ? this.tracks[0] : null,
        tracks: this.tracks,
        credits: this.getAllCredits(),
        submitter: this.localUsrService.localUser,
      },
      images: [],
    };
    if (this.avatarFilePreview) {
      this.mapPreview.images.push({
        id: 0,
        mapID: 0,
        small: this.avatarFilePreview.dataBlobURL,
        medium: this.avatarFilePreview.dataBlobURL,
        large: this.avatarFilePreview.dataBlobURL,
      });
    }
    this.extraImages.map((val: ImageFilePreview) => <MapImage>({
      id: 0,
      mapID: 0,
      small: val.dataBlobURL,
      medium: val.dataBlobURL,
      large: val.dataBlobURL,
    })).forEach((val: MapImage) => this.mapPreview.images.push(val));
  }

  onRemoveZones() {
    this.tracks = [];
    this.zoneFile = null;
    this.infoForm.patchValue({zones: ''});
  }
}
