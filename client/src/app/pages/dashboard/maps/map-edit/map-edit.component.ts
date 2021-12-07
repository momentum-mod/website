import {Component, OnDestroy, OnInit} from '@angular/core';
import {MomentumMap} from '../../../../@core/models/momentum-map.model';
import {MapImage} from '../../../../@core/models/map-image.model';
import {User} from '../../../../@core/models/user.model';
import {MapCredit} from '../../../../@core/models/map-credit.model';
import {MapCreditType} from '../../../../@core/models/map-credit-type.model';
import {CreditChangeEvent} from '../map-credits/map-credit/map-credit.component';
import {MapsService} from '../../../../@core/data/maps.service';
import {finalize, switchMap, takeUntil} from 'rxjs/operators';
import {ActivatedRoute, ParamMap, Router} from '@angular/router';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import {Role} from '../../../../@core/models/role.model';
import {LocalUserService} from '../../../../@core/data/local-user.service';
import {AdminService} from '../../../../@core/data/admin.service';
import {NbDialogService, NbToastrService} from '@nebular/theme';
import {ConfirmDialogComponent} from '../../../../@theme/components/confirm-dialog/confirm-dialog.component';
import {forkJoin, Subject} from 'rxjs';
import { MapUploadStatus } from '../../../../@core/models/map-upload-status.model';

const youtubeRegex = /[a-zA-Z0-9_-]{11}/;

@Component({
  selector: 'map-edit',
  templateUrl: './map-edit.component.html',
  styleUrls: ['./map-edit.component.scss'],
})
export class MapEditComponent implements OnInit, OnDestroy {

  private ngUnsub = new Subject();
  map: MomentumMap;
  mapFile: File;
  fileUpdated: boolean;
  thumbnail: MapImage;
  thumbnailUpdated: boolean;
  originalMapImages: MapImage[];
  mapImages: MapImage[];
  mapImagesLimit: number;
  imagesUpdated: boolean;
  mapCredits: User[][];
  mapCreditsIDs: number[];
  isSubmitter: boolean;
  isAdmin: boolean;
  isModerator: boolean;

  mapForm: FormGroup = this.fb.group({
    'mapName': ['', [Validators.required, Validators.maxLength(32)]],
  });

  infoForm: FormGroup = this.fb.group({
    'youtubeID': ['', [Validators.pattern(youtubeRegex)]],
    'description': ['', [Validators.maxLength(1000)]],
  });

  creditsForm: FormGroup = this.fb.group({
    'authors': [[], Validators.required],
  });

  adminForm: FormGroup = this.fb.group({

  });

  get mapName() { return this.mapForm.get('mapName'); }
  get youtubeID() { return this.infoForm.get('youtubeID'); }
  get description() { return this.infoForm.get('description'); }

  constructor(private route: ActivatedRoute,
              private router: Router,
              private mapService: MapsService,
              private localUserService: LocalUserService,
              private adminService: AdminService,
              private dialogService: NbDialogService,
              private toasterService: NbToastrService,
              private fb: FormBuilder) {
    this.mapFile = null;
    this.fileUpdated = false;
    this.thumbnail = null;
    this.thumbnailUpdated = false;
    this.originalMapImages = [];
    this.mapImages = [];
    this.mapImagesLimit = 5;
    this.imagesUpdated = false;
    this.mapCredits = [[], [], [], []];
    this.mapCreditsIDs = [];
  }

  ngOnInit() {
    this.route.paramMap.pipe(
      switchMap((params: ParamMap) =>
        this.mapService.getMap(Number(params.get('id')), {
          params: { expand: 'info,credits,images,thumbnail' },
        }),
      ),
    ).subscribe(map => {
      this.map = map;
      this.localUserService.getLocal().pipe(
        takeUntil(this.ngUnsub),
      ).subscribe(locUser => {
        this.isAdmin = this.localUserService.hasRole(Role.ADMIN, locUser);
        this.isModerator = this.localUserService.hasRole(Role.MODERATOR, locUser);
        if (this.map.submitterID === locUser.id)
          this.isSubmitter = true;
        if (!(this.isSubmitter || this.isAdmin || this.isModerator))
          this.router.navigate(['/dashboard/maps/' + this.map.id]);
        this.infoForm.patchValue(map.info);
        this.mapForm.patchValue({mapName: map.name});
        if (!this.isAdmin && this.map.statusFlag === MapUploadStatus.APPROVED)
          this.infoForm.get('youtubeID').setValidators([Validators.required, this.infoForm.get('youtubeID').validator]);
        this.thumbnail = map.thumbnail;
        this.originalMapImages = map.images.filter(img => img.id !== map.thumbnailID);
        this.mapImages = this.originalMapImages.map(img => ({...img}));
        this.mapCredits = [[], [], [], []];
        this.mapCreditsIDs = map.credits.map(val => +val.id);
        for (const credit of map.credits) {
          this.mapCredits[credit.type].push(credit.user);
        }
        this.creditsForm.get('authors').patchValue(this.mapCredits[MapCreditType.AUTHOR]);
      });
    });
  }

  onFileSubmit() {
    this.mapService.getMapFileUploadLocation(this.map.id).subscribe(res => {
      if (res) {
        this.mapService.uploadMapFile(res.url, this.mapFile).subscribe(() => {
          this.toasterService.success('Updated the map!', 'Success');
        }, error => this.toasterService.danger(error.message, 'Failed to update the map!'));
      }
    }, error => this.toasterService.danger(error.message, 'Failed to find map!'));
    this.fileUpdated = false;
  }

  onNameSubmit() {
    if (this.mapForm.invalid)
      return;
    this.mapService.updateMapName(this.map.id, {name: this.mapName.value}).subscribe(() => {
      this.toasterService.success('Updated the map!', 'Success');
    }, error => this.toasterService.danger(error.message, 'Failed to update the map!'));
  }

  onInfoSubmit() {
    if (this.infoForm.invalid)
      return;
    if (this.youtubeID.value != null) {
      const youtubeIDMatch = this.youtubeID.value.match(youtubeRegex);
      this.youtubeID.patchValue(youtubeIDMatch ? youtubeIDMatch[0] : null);
    }
    this.mapService.updateMapInfo(this.map.id, this.infoForm.value).subscribe(() => {
      this.toasterService.success('Updated the map!', 'Success');
    }, error => this.toasterService.danger(error.message, 'Failed to update the map!'));
  }

  onImagesSubmit() {
    if (this.thumbnailUpdated) {
      this.mapService.updateMapAvatar(this.map.id, this.thumbnail.file).subscribe(() => {
        this.toasterService.success('Updated thumbnail!', 'Success');
      }, error => this.toasterService.danger(error.message, 'Failed to update thumbnail!'));
    }

    let deletes = [];
    let creates = [];

    if (!this.imagesUpdated) {
      return;
    } else if (this.mapImages.length === 0) {
      for (let img of this.originalMapImages) {
        this.mapService.deleteMapImage(this.map.id, img.id).subscribe(() => {
          this.toasterService.success('Deleted the image!', 'Success');
        }, error => this.toasterService.danger(error.message, 'Failed to delete the image!'));
      }
    } else {
      creates = this.mapImages.filter(img => img.id === -1);
      deletes = this.originalMapImages.filter(ogImg => !this.mapImages.some(img => ogImg.id === img.id));

      let maxLength = (creates.length > deletes.length) ? creates.length : deletes.length;
      // TODO get the images in order
      for (let i = 0; i < maxLength; i++) {
        if (deletes.length > 0 && creates.length > 0) {
          this.mapService.updateMapImage(this.map.id, deletes[deletes.length - 1].id, creates[creates.length - 1].file).subscribe(() => {
            this.toasterService.success('Updated the image!', 'Success');
          }, error => this.toasterService.danger(error.message, 'Failed to update the image!'));
          deletes.pop();
          creates.pop();
        } else if (deletes.length > 0) {
          this.mapService.deleteMapImage(this.map.id, deletes[deletes.length - 1].id).subscribe(() => {
            this.toasterService.success('Deleted the image!', 'Success');
          }, error => this.toasterService.danger(error.message, 'Failed to delete the image!'));
          deletes.pop();
        } 
        else if (creates.length > 0) {
          this.mapService.createMapImage(this.map.id, creates[creates.length - 1].file).subscribe(() => {
            this.toasterService.success('Created the image!', 'Success');
          }, error => this.toasterService.danger(error.message, 'Failed to delete the image!'));
          creates.pop();
        }
      }
    }

    // TODO force the map images to update as well AFTER the images update
    this.mapService.getMapImages(this.map.id).subscribe(imgs => {
      if (imgs.length) {
        this.map.images = imgs.filter(img => img.id !== this.map.thumbnailID);
      }
    });
    this.thumbnailUpdated = false;
    this.imagesUpdated = false;
  }

  onCreditsSubmit($event) {
    if (this.creditsForm.invalid)
      return;
    $event.target.disabled = true;
    const allCredits: MapCredit[] = this.getAllCredits();
    const creditUpdates = [];
    for (let i = 0; i < allCredits.length; i++) {
      const credit = allCredits[i];
      if (i < this.mapCreditsIDs.length) {
        creditUpdates.push(this.mapService.updateMapCredit(this.map.id, this.mapCreditsIDs[i], credit));
      } else {
        creditUpdates.push(this.mapService.createMapCredit(this.map.id, credit));
      }
    }
    for (let i = allCredits.length; i < this.mapCreditsIDs.length; i++) {
      const creditID = this.mapCreditsIDs[i];
      creditUpdates.push(this.mapService.deleteMapCredit(this.map.id, creditID));
    }
    forkJoin(creditUpdates).pipe(
      finalize(() => {
        this.mapService.getMapCredits(this.map.id).subscribe((res) => {
          this.mapCreditsIDs = res.mapCredits.map(val => +val.id);
          $event.target.disabled = false;
        });
      }),
    ).subscribe(() => {
      this.toasterService.success('Updated map credits!', 'Success');
    }, error => this.toasterService.danger(error.message, 'Failed to update credits!'));
  }

  onMapFileSelected(file: File) {
    this.mapFile = file;
    this.fileUpdated = true;
  }

  getImageSource(img: File, callback: (result: any, originalFile: File) => void) {
    let reader = new FileReader();
    const handler = (e) => {
      callback(e.target.result, img);
      reader.removeEventListener('load', handler, false);
      reader = null;
    };
    reader.addEventListener('load', handler, false);
    reader.readAsDataURL(img);
  }

  onMapImageSelected(file: File) {
    this.imagesUpdated = true;
    this.getImageSource(file, (blobURL, img) => {
      if (this.mapImages.length >= this.mapImagesLimit)
        return;
      this.mapImages.push({
        id: -1,
        mapID: this.map.id,
        small: blobURL,
        medium: blobURL,
        large: blobURL,
        file: file,
      });
    });
  }

  onAvatarFileSelected(file: File) {
    this.thumbnailUpdated = true;
    this.getImageSource(file, ((blobURL, img) => {
      this.thumbnail = {
        id: this.thumbnail.id,
        mapID: this.map.id,
        small: blobURL,
        medium: blobURL,
        large: blobURL,
        file: file,
      };
    }));
  }

  removeMapImage(img: MapImage) {
    this.imagesUpdated = true;
    this.mapImages.splice(this.mapImages.findIndex(i => i === img), 1);
  }

  imageDrop(event: CdkDragDrop<MapImage[]>) {
    moveItemInArray(this.mapImages, event.previousIndex, event.currentIndex);
  }

  onCreditChanged($event: CreditChangeEvent) {
    if ($event.added) {
      if ($event.type === MapCreditType.AUTHOR)
        this.creditsForm.get('authors').patchValue($event.user);
    } else {
      this.creditsForm.get('authors').patchValue(this.mapCredits[MapCreditType.AUTHOR]);
    }
  }

  getAllCredits() {
    const credits = [];
    for (let credType = 0; credType < MapCreditType.LENGTH; credType++) {
      for (const usr of this.mapCredits[credType]) {
        credits.push({userID: usr.id, type: credType});
      }
    }
    return credits;
  }

  showMapDeleteDialog() {
    this.dialogService.open(ConfirmDialogComponent, {
      context: {
        title: 'Are you sure?',
        message: 'You are about to permanently delete this map. Are you sure you want to proceed?',
      },
    }).onClose.subscribe(response => {
      if (response) {
        this.adminService.deleteMap(this.map.id).subscribe(res => {
          this.toasterService.success('Successfully deleted the map', 'Success');
        }, err => {
          this.toasterService.danger('Failed to delete the map', 'Failed');
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.ngUnsub.next();
    this.ngUnsub.complete();
  }

}
