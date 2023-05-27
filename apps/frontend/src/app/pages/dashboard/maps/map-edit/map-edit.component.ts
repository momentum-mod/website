import { Component, OnDestroy, OnInit } from '@angular/core';
import { CreditChangeEvent } from '../map-credits/map-credit/map-credit.component';
import { finalize, switchMap, takeUntil } from 'rxjs/operators';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { NbDialogService, NbToastrService } from '@nebular/theme';
import { ConfirmDialogComponent } from '../../../../@theme/components/confirm-dialog/confirm-dialog.component';
import { forkJoin, Subject } from 'rxjs';
import { Map, MapCredit, MapImage } from '@momentum/types';
import { FileUploadType } from '../upload-form/file-upload/file-upload.component';
import {
  AdminService,
  LocalUserService,
  MapsService
} from '@momentum/frontend/data';
import { MapCreditType } from '@momentum/constants';

const youtubeRegex = /[\w-]{11}/;

@Component({
  selector: 'mom-map-edit',
  templateUrl: './map-edit.component.html',
  styleUrls: ['./map-edit.component.scss']
})
export class MapEditComponent implements OnInit, OnDestroy {
  protected readonly FileUploadType = FileUploadType;
  private ngUnsub = new Subject<void>();
  mapCredits: User[][];
  mapCreditsIDs: number[];
  map: Map;
  images: MapImage[];
  imagesLimit: number;
  isSubmitter: boolean;
  isAdmin: boolean;
  isModerator: boolean;

  infoForm: FormGroup = this.fb.group({
    youtubeID: ['', [Validators.pattern(youtubeRegex)]],
    description: ['', [Validators.maxLength(1000)]]
  });

  creditsForm: FormGroup = this.fb.group({
    authors: [[], Validators.required]
  });

  adminForm: FormGroup = this.fb.group({});

  get youtubeID() {
    return this.infoForm.get('youtubeID');
  }
  get description() {
    return this.infoForm.get('description');
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private mapService: MapsService,
    private localUserService: LocalUserService,
    private adminService: AdminService,
    private dialogService: NbDialogService,
    private toasterService: NbToastrService,
    private fb: FormBuilder
  ) {
    this.mapImagesLimit = 6;
    this.mapImages = [];
    this.mapCredits = [[], [], [], []];
    this.mapCreditsIDs = [];
  }

  ngOnInit() {
    this.route.paramMap
      .pipe(
        switchMap((params: ParamMap) =>
          this.mapService.getMap(Number(params.get('id')), {
            expand: ['info', 'credits', 'images']
          })
        )
      )
      .subscribe((map) => {
        this.map = map;
        this.localUserService
          .getLocal()
          .pipe(takeUntil(this.ngUnsub))
          .subscribe((locUser) => {
            this.isAdmin = this.localUserService.hasRole(Role.ADMIN, locUser);
            this.isModerator = this.localUserService.hasRole(
              Role.MODERATOR,
              locUser
            );
            if (this.map.submitterID === locUser.id) this.isSubmitter = true;
            if (!(this.isSubmitter || this.isAdmin || this.isModerator))
              this.router.navigate(['/dashboard/maps/' + this.map.id]);
            this.infoForm.patchValue(map.info);
            this.mapImages = map.images;
            this.mapCredits = [[], [], [], []];
            this.mapCreditsIDs = map.credits.map((val) => +val.id);
            for (const credit of map.credits) {
              this.mapCredits[credit.type].push(credit.user);
            }
            this.creditsForm
              .get('authors')
              .patchValue(this.mapCredits[MapCreditType.AUTHOR]);
          });
      });
  }

  onInfoSubmit() {
    if (this.infoForm.invalid) return;
    if (this.youtubeID.value != null) {
      const youtubeIDMatch = this.youtubeID.value.match(youtubeRegex);
      this.youtubeID.patchValue(youtubeIDMatch ? youtubeIDMatch[0] : null);
    }
    this.mapService.updateMapInfo(this.map.id, this.infoForm.value).subscribe({
      next: () => this.toasterService.success('Updated the map!', 'Success'),
      error: (error) =>
        this.toasterService.danger(error.message, 'Failed to update the map!')
    });
  }

  onImagesSubmit() {
    // TODO: Submit changed images
  }

  onCreditsSubmit($event) {
    if (this.creditsForm.invalid) return;
    $event.target.disabled = true;
    const allCredits: MapCredit[] = this.getAllCredits();
    const creditUpdates = [];
    for (const [i, credit] of allCredits.entries()) {
      if (i < this.mapCreditsIDs.length) {
        creditUpdates.push(
          this.mapService.updateMapCredit(
            this.map.id,
            this.mapCreditsIDs[i],
            credit
          )
        );
      } else {
        creditUpdates.push(
          this.mapService.createMapCredit(this.map.id, credit)
        );
      }
    }
    for (let i = allCredits.length; i < this.mapCreditsIDs.length; i++) {
      const creditID = this.mapCreditsIDs[i];
      creditUpdates.push(
        this.mapService.deleteMapCredit(this.map.id, creditID)
      );
    }
    forkJoin(creditUpdates)
      .pipe(
        finalize(() => {
          this.mapService.getMapCredits(this.map.id).subscribe((response) => {
            this.mapCreditsIDs = response.mapCredits.map((val) => +val.id);
            $event.target.disabled = false;
          });
        })
      )
      .subscribe({
        next: () =>
          this.toasterService.success('Updated map credits!', 'Success'),
        error: (error) =>
          this.toasterService.danger(error.message, 'Failed to update credits!')
      });
  }

  getImageSource(
    img: File,
    callback: (result: any, originalFile: File) => void
  ) {
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
    this.getImageSource(file, (blobURL) => {
      if (this.mapImages.length >= this.mapImagesLimit) return;
      this.mapImages.push({
        id: -1,
        mapID: -1,
        small: blobURL,
        medium: '',
        large: ''
        // file: img,
      });
    });
  }

  removeMapImage(img: MapImage) {
    this.mapImages.splice(this.mapImages.indexOf(img), 1);
  }

  imageDrop(event: CdkDragDrop<MapImage[]>) {
    moveItemInArray(this.mapImages, event.previousIndex, event.currentIndex);
  }

  onCreditChanged($event: CreditChangeEvent) {
    if ($event.added) {
      if ($event.type === MapCreditType.AUTHOR)
        this.creditsForm.get('authors').patchValue($event.user);
    } else {
      this.creditsForm
        .get('authors')
        .patchValue(this.mapCredits[MapCreditType.AUTHOR]);
    }
  }

  getAllCredits() {
    const credits = [];
    for (let credType = 0; credType < MapCreditType.LENGTH; credType++) {
      for (const usr of this.mapCredits[credType]) {
        credits.push({ userID: usr.id, type: credType });
      }
    }
    return credits;
  }

  showMapDeleteDialog() {
    this.dialogService
      .open(ConfirmDialogComponent, {
        context: {
          title: 'Are you sure?',
          message:
            'You are about to permanently delete this map. Are you sure you want to proceed?'
        }
      })
      .onClose.subscribe((response) => {
        if (!response) return;
        this.adminService.deleteMap(this.map.id).subscribe({
          next: () =>
            this.toasterService.success(
              'Successfully deleted the map',
              'Success'
            ),
          error: () =>
            this.toasterService.danger('Failed to delete the map', 'Failed')
        });
      });
  }

  ngOnDestroy(): void {
    this.ngUnsub.next();
    this.ngUnsub.complete();
  }
}
