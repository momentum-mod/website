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
  mapImages: MapImage[];
  mapImagesLimit: number;
  mapCredits: User[][];
  mapCreditsIDs: number[];
  isSubmitter: boolean;
  isAdmin: boolean;
  isModerator: boolean;

  infoForm: FormGroup = this.fb.group({
    'youtubeID': ['', [Validators.pattern(youtubeRegex)]],
    'description': ['', [Validators.maxLength(1000)]],
  });

  creditsForm: FormGroup = this.fb.group({
    'authors': [[], Validators.required],
  });

  adminForm: FormGroup = this.fb.group({

  });

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
    this.mapImagesLimit = 6;
    this.mapImages = [];
    this.mapCredits = [[], [], [], []];
    this.mapCreditsIDs = [];
  }

  ngOnInit() {
    this.route.paramMap.pipe(
      switchMap((params: ParamMap) =>
        this.mapService.getMap(Number(params.get('id')), {
          params: { expand: 'info,credits,images' },
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
        if (!this.isAdmin && this.map.statusFlag === MapUploadStatus.APPROVED)
          this.infoForm.get('youtubeID').setValidators([Validators.required, this.infoForm.get('youtubeID').validator]);
        this.mapImages = map.images;
        this.mapCredits = [[], [], [], []];
        this.mapCreditsIDs = map.credits.map(val => +val.id);
        for (const credit of map.credits) {
          this.mapCredits[credit.type].push(credit.user);
        }
        this.creditsForm.get('authors').patchValue(this.mapCredits[MapCreditType.AUTHOR]);
      });
    });
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
    // TODO: Submit changed images
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
    this.getImageSource(file, (blobURL, img) => {
      if (this.mapImages.length >= this.mapImagesLimit)
        return;
      this.mapImages.push({
        id: -1,
        mapID: -1,
        small: blobURL,
        medium: '',
        large: '',
        // file: img,
      });
    });
  }

  removeMapImage(img: MapImage) {
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
