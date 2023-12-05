import { Component, OnDestroy, OnInit } from '@angular/core';
import { finalize, switchMap, takeUntil } from 'rxjs/operators';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDropList,
  moveItemInArray
} from '@angular/cdk/drag-drop';
import { NbDialogService, NbToastrService } from '@nebular/theme';
import { ConfirmDialogComponent } from '../../../components/confirm-dialog/confirm-dialog.component';
import { Subject } from 'rxjs';
import { MMap, MapImage } from '@momentum/constants';
import {
  AdminService,
  LocalUserService,
  MapsService
} from '@momentum/frontend/data';
import { MapCreditType, Role } from '@momentum/constants';
import {
  EditableMapCredit,
  SortedMapCredits
} from '../../../components/map-credits-selection/sorted-map-credits.class';
import { SharedModule } from '../../../shared.module';
import { MapCreditsComponent } from '../map-credits/map-credits.component';
import { FileUploadComponent } from '../../../components/file-upload/file-upload.component';

const youtubeRegex = /[\w-]{11}/;

@Component({
  selector: 'm-map-edit',
  templateUrl: './map-edit.component.html',
  styleUrls: ['./map-edit.component.css'],
  standalone: true,
  imports: [
    SharedModule,
    CdkDrag,
    CdkDropList,
    MapCreditsComponent,
    FileUploadComponent
  ]
})
export class MapEditComponent implements OnInit, OnDestroy {
  private ngUnsub = new Subject<void>();
  map: MMap;
  images: MapImage[];
  imagesLimit: number;
  credits: SortedMapCredits;
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
    this.imagesLimit = 6;
    this.images = [];
    this.credits = new SortedMapCredits();
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
      .subscribe((map: MMap) => {
        // TODO: Reduce nesting?
        this.map = map;
        this.localUserService.localUserSubject
          .pipe(takeUntil(this.ngUnsub))
          .subscribe((localUser) => {
            this.isAdmin = this.localUserService.hasRole(Role.ADMIN, localUser);
            this.isModerator = this.localUserService.hasRole(
              Role.MODERATOR,
              localUser
            );
            this.isSubmitter = this.map.submitterID === localUser.id;

            if (!(this.isSubmitter || this.isAdmin || this.isModerator))
              this.router.navigate(['/maps' + this.map.id]);

            this.infoForm.patchValue(map.info);
            this.images = map.images;

            this.credits.set(map.credits as EditableMapCredit[]);

            this.creditsForm
              .get('authors')
              .patchValue(this.credits[MapCreditType.AUTHOR]);
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

  onCreditsSubmit($event: Event) {
    if (this.creditsForm.invalid) return;

    const saveButton = $event.target as HTMLButtonElement;
    saveButton.disabled = true;

    this.mapService
      .updateMapCredits(this.map.id, this.credits.getSubmittableRealUsers())
      .pipe(finalize(() => (saveButton.disabled = false)))
      .subscribe({
        next: (credits) => {
          this.credits.set(credits as EditableMapCredit[]);
          this.toasterService.success('Updated map credits!', 'Success');
        },
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

  onMapImageSelected() {
    // this.getImageSource(file[0], (blobURL) => {
    //   if (this.images.length >= this.imagesLimit) return;
    //   // ????????? what
    //   this.images.push({
    //     id: -1,
    //     mapID: -1,
    //     small: blobURL,
    //     medium: '',
    //     large: ''
    //     // file: img,
    //   });
    // });
  }

  removeMapImage(img: MapImage) {
    this.images.splice(this.images.indexOf(img), 1);
  }

  imageDrop(event: CdkDragDrop<MapImage[]>) {
    moveItemInArray(this.images, event.previousIndex, event.currentIndex);
  }

  onCreditChanged() {
    console.log('credits changed!', { credits: this.credits });
    this.creditsForm
      .get('authors')
      .patchValue(this.credits[MapCreditType.AUTHOR]);
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
