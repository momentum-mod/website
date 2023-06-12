import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { HttpEvent, HttpEventType } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import * as VDF from '@node-steam/vdf';
import { CreditChangeEvent } from '../map-credits/map-credit/map-credit.component';
import { NbToastrService } from '@nebular/theme';
import { mergeMap } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { FileUploadType } from './file-upload/file-upload.component';
import {
  Map,
  MapCredit,
  MapImage,
  MapZoneTrigger,
  CreateMapTrack,
  CreateMapZone,
  CreateMap
} from '@momentum/types';
import { LocalUserService, MapsService } from '@momentum/frontend/data';
import { MapCreditType, MapType, ZoneType } from '@momentum/constants';
import { PartialDeep } from 'type-fest';

export interface ImageFilePreview {
  dataBlobURL: string;
  file: File;
}

const youtubeRegex = /[\w-]{11}/;

@Component({
  selector: 'mom-map-upload-form',
  templateUrl: './map-upload-form.component.html',
  styleUrls: ['./map-upload-form.component.scss']
})
export class MapUploadFormComponent implements OnInit, AfterViewInit {
  protected readonly FileUploadType = FileUploadType;
  protected readonly MapType = MapType;

  @ViewChild('datepicker', { static: false }) datePicker;
  @ViewChild('stepper', { static: false }) stepper;

  mapFile: File;
  avatarFile: File;
  zoneFile: File;
  avatarFilePreview: ImageFilePreview;
  extraImages: ImageFilePreview[];
  extraImagesLimit: number;
  mapUploadPercentage: number;
  isUploadingMap: boolean;
  credits: Record<MapCreditType, MapCredit[]>;
  inferredMapType: boolean;
  mapPreview: PartialDeep<
    { map: Map; images: MapImage[] },
    { recurseIntoArrays: true }
  >;
  tracks: CreateMapTrack[];

  filesForm: FormGroup = this.fb.group({
    map: ['', [Validators.required, Validators.pattern(/.+(\.bsp)/)]],
    avatar: [
      '',
      [Validators.required, Validators.pattern(/.+(\.(pn|jpe?)g)/i)]
    ],
    youtubeURL: ['', [Validators.pattern(youtubeRegex)]]
  });
  infoForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(32)]],
    type: [MapType.UNKNOWN, Validators.required],
    description: ['', [Validators.required, Validators.maxLength(1000)]],
    creationDate: [
      new Date(),
      [Validators.required, Validators.max(Date.now())]
    ],
    zones: ['', [Validators.required, Validators.pattern(/.+(\.zon)/)]]
  });
  creditsForm: FormGroup = this.fb.group({
    authors: [[], Validators.required],
    coauthors: [[]],
    testers: [[]],
    specialThanks: [[]]
  });
  forms: FormGroup[] = [this.filesForm, this.infoForm, this.creditsForm];

  get map() {
    return this.filesForm.get('map');
  }
  get avatar() {
    return this.filesForm.get('avatar');
  }
  get youtubeURL() {
    return this.filesForm.get('youtubeURL');
  }
  get name() {
    return this.infoForm.get('name');
  }
  get type() {
    return this.infoForm.get('type');
  }
  get description() {
    return this.infoForm.get('description');
  }
  get creationDate() {
    return this.infoForm.get('creationDate');
  }

  constructor(
    private mapsService: MapsService,
    private router: Router,
    private localUsrService: LocalUserService,
    private toasterService: NbToastrService,
    private fb: FormBuilder
  ) {
    this.stepper = null;
    this.isUploadingMap = false;
    this.mapUploadPercentage = 0;
    this.extraImagesLimit = 5;
    this.credits = this.credits = {
      [MapCreditType.AUTHOR]: [],
      [MapCreditType.COAUTHOR]: [],
      [MapCreditType.TESTER]: [],
      [MapCreditType.SPECIAL_THANKS]: []
    };
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
    let type = MapType.UNKNOWN;
    if (nameVal.startsWith('surf_')) type = MapType.SURF;
    else if (nameVal.startsWith('bhop_')) type = MapType.BHOP;
    else if (nameVal.startsWith('climb_')) type = MapType.KZ;
    else if (nameVal.startsWith('rj_')) type = MapType.RJ;
    else if (nameVal.startsWith('sj_')) type = MapType.SJ;
    else if (nameVal.startsWith('tricksurf_')) type = MapType.TRICKSURF;
    else if (nameVal.startsWith('ahop_')) type = MapType.AHOP;
    else if (nameVal.startsWith('pk_')) type = MapType.PARKOUR;
    else if (nameVal.startsWith('conc_')) type = MapType.CONC;
    else if (nameVal.startsWith('df_')) type = MapType.DEFRAG;
    this.type.patchValue(type);
    this.inferredMapType = type !== MapType.UNKNOWN;
  }

  onAvatarFileSelected(file: File) {
    this.avatarFile = file;
    this.getFileSource(file, true, (blobURL, img) => {
      this.avatarFilePreview = {
        dataBlobURL: blobURL,
        file: img
      };
      this.generatePreviewMap();
    });
    this.avatar.patchValue(this.avatarFile.name);
  }

  parseTrack(
    trackNum: number,
    // TODO: For 0.10.0 zon files, make types for the parsed kv1/kv3 file
    track: object
  ): CreateMapTrack {
    const trackReturn: CreateMapTrack = {
      trackNum: trackNum,
      numZones: 0,
      isLinear: false,
      difficulty: 1,
      zones: []
    };
    // This code is really ugly but I don't wanna mess with it too much.
    // Will rewrite at 0.10.0. - Tom
    for (const zone in track) {
      if (Object.hasOwn(track, zone)) {
        const zoneNum = Number(zone);
        trackReturn.numZones = Math.max(trackReturn.numZones, zoneNum);

        const zoneMdl: CreateMapZone = {
          zoneNum: zoneNum,
          triggers: []
        };
        for (const trigger in track[zone].triggers) {
          if (Object.hasOwn(track[zone].triggers, trigger)) {
            const triggerObj = track[zone].triggers[trigger];
            if (!trackReturn.isLinear)
              trackReturn.isLinear =
                triggerObj.type === ZoneType.ZONE_CHECKPOINT;
            const zoneMdlTrigger: PartialDeep<MapZoneTrigger> = {
              type: triggerObj.type,
              points: triggerObj.points,
              pointsZPos: triggerObj.pointsZPos,
              pointsHeight: triggerObj.pointsHeight
            };
            if (triggerObj.zoneProps)
              zoneMdlTrigger.properties = {
                properties: triggerObj.zoneProps.properties
              };
            zoneMdl.triggers.push(zoneMdlTrigger as MapZoneTrigger);
          }
        }
        // Old code - wtf is this?
        // if (zoneNum === 0) delete zoneMdl.stats;
        trackReturn.zones.push(zoneMdl);
      }
    }
    return trackReturn;
  }

  onZoneFileSelected(file: File) {
    this.tracks = [];
    this.zoneFile = file;
    this.getFileSource(file, false, (result) => {
      const zoneFile = VDF.parse(result);
      const tracks = zoneFile.tracks;
      for (const trackNum in tracks) {
        if (Object.hasOwn(tracks, trackNum)) {
          this.tracks.push(this.parseTrack(Number(trackNum), tracks[trackNum]));
        }
      }
      this.generatePreviewMap();
    });
    this.infoForm.patchValue({ zones: this.zoneFile.name });
  }

  onSubmit($event) {
    if (
      !(this.filesForm.valid && this.infoForm.valid && this.creditsForm.valid)
    )
      return;
    // Prevent from spamming submit button
    $event.target.disabled = true;

    let mapCreated = false;
    let mapID = -1;
    let uploadLocation = '';

    const mapObject: CreateMap = {
      name: this.name.value,
      type: this.type.value,
      info: {
        description: this.description.value,
        youtubeID: this.mapPreview.map.info.youtubeID,
        numTracks: this.tracks.length,
        creationDate: this.creationDate.value
      },
      tracks: this.tracks,
      credits: this.getAllCredits()
    };
    this.mapsService
      .createMap(mapObject)
      .pipe(
        mergeMap((response) => {
          // TODO: The new API doesn't actually set this, didn't realise it needed to.
          // It's a fucking nasty approach though, lets
          // 1. make this POST include the upload location as a KEY on dto (so extend mapdto)
          // 2. keep the mapfileuploadlocation for now at least since map submission system
          // probs needs it
          mapID = response.body.id;
          uploadLocation = response.headers.get('Location');
          mapCreated = true;
          this.toasterService.success(
            'Please wait for the map file to upload',
            'Map successfully created'
          );
          return this.mapsService.updateMapAvatar(mapID, this.avatarFile);
        }),
        mergeMap(() => {
          const extraImageCreations = [];
          for (let i = 0; i < this.extraImages.length; i++)
            extraImageCreations.push(
              this.mapsService.createMapImage(mapID, this.extraImages[i].file)
            );
          if (extraImageCreations.length > 0)
            return forkJoin(extraImageCreations);
          return of({});
        }),
        mergeMap(() => {
          return this.mapsService.uploadMapFile(uploadLocation, this.mapFile);
        })
      )
      .subscribe({
        next: (event: HttpEvent<any>) => {
          switch (event.type) {
            case HttpEventType.Sent:
              // upload started
              this.isUploadingMap = true;
              break;
            case HttpEventType.Response:
              this.onSubmitSuccess();
              break;
            case HttpEventType.UploadProgress: {
              const calc: number = Math.round(
                (event['loaded'] / event['total']) * 100
              );
              if (this.mapUploadPercentage !== calc)
                this.mapUploadPercentage = calc;
              break;
            }
          }
        },
        error: (error) => {
          console.error(error);
          const errorMessage = error.error.error
            ? error.error.error.message
            : 'Something went wrong!';

          $event.target.disabled = false;
          this.isUploadingMap = false;
          if (mapCreated) this.onSubmitSuccess();

          this.toasterService.danger(errorMessage, 'Failed to create map');
        }
      });
  }

  private onSubmitSuccess() {
    this.isUploadingMap = false;
    this.router.navigate(['/dashboard/maps/uploads']);
  }

  markFormAsDirty(formG: FormGroup) {
    for (const i in formG.controls) formG.controls[i].markAsTouched();
  }

  touchForm(selected: number) {
    if (selected >= 0 && selected < this.forms.length)
      this.markFormAsDirty(this.forms[selected]);
  }

  onCreditChanged($event: CreditChangeEvent) {
    if ($event.added) {
      const types = ['authors', 'coauthors', 'testers', 'specialThanks'];
      this.creditsForm.get(types[$event.type]).patchValue($event.user);
    } else {
      this.creditsForm.setValue({
        authors: this.credits[MapCreditType.AUTHOR],
        coauthors: this.credits[MapCreditType.COAUTHOR],
        testers: this.credits[MapCreditType.TESTER],
        specialThanks: this.credits[MapCreditType.SPECIAL_THANKS]
      });
    }
  }

  getFileSource(
    img: File,
    isImage: boolean,
    callback: (result: any, originalFile: File) => void
  ) {
    let reader = new FileReader();
    const handler = (e) => {
      callback(e.target.result, img);
      reader.removeEventListener('load', handler, false);
      reader = null;
    };
    reader.addEventListener('load', handler, false);
    if (isImage) reader.readAsDataURL(img);
    else reader.readAsText(img);
  }

  onExtraImageSelected(file: File) {
    this.getFileSource(file, true, (blobURL, img) => {
      if (this.extraImages.length >= this.extraImagesLimit) return;
      this.extraImages.push({
        dataBlobURL: blobURL,
        file: img
      });
      this.generatePreviewMap();
    });
  }

  removeExtraImage(img: ImageFilePreview) {
    this.extraImages.splice(this.extraImages.indexOf(img), 1);
  }

  getAllCredits(): { userID: number; type: MapCreditType }[] {
    return Object.values(this.credits)
      .flat()
      .map((credit) => ({ type: credit.type, userID: credit.userID }));
  }

  generatePreviewMap(): void {
    const youtubeIDMatch = this.youtubeURL.value.match(youtubeRegex);
    this.mapPreview = {
      map: {
        id: 0,
        name: this.name.value,
        type: this.type.value,
        hash: 'not-important-yet',
        status: 0,
        info: {
          id: 0,
          description: this.description.value,
          youtubeID: youtubeIDMatch ? youtubeIDMatch[0] : undefined,
          numTracks: this.tracks.length,
          creationDate: this.creationDate.value
        },
        mainTrack: this.tracks.length > 0 ? this.tracks[0] : undefined,
        tracks: this.tracks,
        credits: this.getAllCredits(),
        submitter: this.localUsrService.localUser
      },
      images: []
    };
    if (this.avatarFilePreview) {
      this.mapPreview.images.push({
        id: 0,
        mapID: 0,
        small: this.avatarFilePreview.dataBlobURL,
        medium: this.avatarFilePreview.dataBlobURL,
        large: this.avatarFilePreview.dataBlobURL
      });
    }
    for (const image of this.extraImages)
      this.mapPreview.images.push({
        id: 0,
        mapID: 0,
        small: image.dataBlobURL,
        medium: image.dataBlobURL,
        large: image.dataBlobURL
      });
  }

  onRemoveZones() {
    this.tracks = [];
    this.zoneFile = undefined;
    this.infoForm.patchValue({ zones: '' });
  }
}
