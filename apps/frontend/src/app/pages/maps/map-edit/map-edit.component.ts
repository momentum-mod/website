import {
  Component,
  DestroyRef,
  HostListener,
  isDevMode,
  OnInit,
  ViewChild
} from '@angular/core';
import { map, mergeAll, switchMap, tap } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators
} from '@angular/forms';
import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import {
  CombinedMapStatuses,
  LeaderboardType,
  MAP_IMAGE_HEIGHT,
  MAP_IMAGE_WIDTH,
  MAP_NAME_REGEXP,
  MapStatus,
  MapSubmissionApproval,
  MapSubmissionSuggestion,
  MapSubmissionType,
  MapTestInviteState,
  MapZones,
  MAX_BSP_SIZE,
  MAX_CHANGELOG_LENGTH,
  MAX_MAP_DESCRIPTION_LENGTH,
  MAX_MAP_IMAGE_SIZE,
  MAX_MAP_NAME_LENGTH,
  MAX_VMF_SIZE,
  MIN_MAP_NAME_LENGTH,
  MMap,
  UpdateMap,
  UpdateMapAdmin,
  User,
  YOUTUBE_ID_REGEXP
} from '@momentum/constants';
import { MessageService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { SharedModule } from '../../../shared.module';
import { FormUtils, GroupedMapCredits } from '../../../util';
import {
  BackendValidators,
  creditsValidator,
  FileValidators,
  suggestionsValidator
} from '../../../validators';
import { firstValueFrom, lastValueFrom, merge, Subject } from 'rxjs';
import { deepEquals, isEmpty } from '@momentum/util-fn';
import { SuggestionType } from '@momentum/formats/zone';
import { ProgressBarModule } from 'primeng/progressbar';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { ConfirmDeactivate } from '../../../guards/component-can-deactivate.guard';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TitleService } from '../../../services/title.service';
import { FileUploadComponent } from '../../../components/file-upload/file-upload.component';
import { MapsService } from '../../../services/data/maps.service';
import { AdminService } from '../../../services/data/admin.service';
import { LayoutService } from '../../../services/layout.service';
import { LocalUserService } from '../../../services/data/local-user.service';
import { TabsComponent } from '../../../components/tabs/tabs.component';
import { TabComponent } from '../../../components/tabs/tab.component';
import { MapDetailsFormComponent } from '../../../components/map-forms/map-details-form/map-details-form.component';
import {
  ImageSelectionType,
  MapImageSelectionComponent
} from '../../../components/map-forms/map-image-selection/map-image-selection.component';
import { CreditsInfoComponent } from '../../../components/tooltips/credits-info.component';
import { MapCreditsSelectionComponent } from '../../../components/map-forms/map-credits-selection/map-credits-selection.component';
import { MapLeaderboardSelectionComponent } from '../../../components/map-forms/map-leaderboard-selection/map-leaderboard-selection.component';
import { MapStatusFormComponent } from '../../../components/map-forms/map-status-form/map-status-form.component';
import { MultiFileUploadComponent } from '../../../components/file-upload/multi-file-upload.component';
import { MapTestInviteSelectionComponent } from '../../../components/map-forms/map-test-invite-selection/map-test-invite-selection.component';
import { ImageSelectionItem } from '../../../components/map-forms/map-image-selection/image-selection-item.class';
import { CodeVerifyDialogComponent } from '../../../components/dialogs/code-verify-dialog.component';

// This is the internal structure of the FormGroup, keys are dependent on
// leaderboards so index signature-based object type is an approprate type here.
export type FinalApprovalFormGroup = Record<
  string,
  FormGroup<{ tier: FormControl<number>; type: FormControl<LeaderboardType> }>
>;

@Component({
  selector: 'm-map-edit',
  templateUrl: './map-edit.component.html',
  standalone: true,
  imports: [
    SharedModule,
    CdkDrag,
    CdkDropList,
    FileUploadComponent,
    MultiFileUploadComponent,
    TabsComponent,
    TabComponent,
    MapDetailsFormComponent,
    MapImageSelectionComponent,
    CreditsInfoComponent,
    MapCreditsSelectionComponent,
    MapLeaderboardSelectionComponent,
    MapStatusFormComponent,
    ProgressBarModule,
    MapTestInviteSelectionComponent
  ]
})
export class MapEditComponent implements OnInit, ConfirmDeactivate {
  protected readonly MapStatus = MapStatus;
  protected readonly FormUtils = FormUtils;
  protected readonly MAX_MAP_IMAGE_SIZE = MAX_MAP_IMAGE_SIZE;

  protected map?: MMap;
  private lastMapName?: string;

  protected loading = false;

  isSubmitter: boolean;
  isReviewer: boolean;
  isAdmin: boolean;
  isMod: boolean;
  inSubmission: boolean;

  private readonly reload = new Subject<void>();

  isUploading = false;
  uploadPercentage = 0;
  uploadStatusDescription = '';

  mainForm = this.fb.group({
    details: this.fb.group({
      name: [
        '',
        [
          Validators.required,
          Validators.pattern(MAP_NAME_REGEXP),
          Validators.minLength(MIN_MAP_NAME_LENGTH),
          Validators.maxLength(MAX_MAP_NAME_LENGTH)
        ],
        [BackendValidators.uniqueMapName(this.mapsService, () => this.map.name)]
      ],
      description: [
        '',
        [Validators.required, Validators.maxLength(MAX_MAP_DESCRIPTION_LENGTH)]
      ],
      creationDate: [
        new Date(),
        [Validators.required, Validators.max(Date.now())]
      ],
      submissionType: [null as MapSubmissionType, [Validators.required]],
      youtubeID: ['', [Validators.pattern(YOUTUBE_ID_REGEXP)]]
    }),

    images: new FormControl<File[]>(null, {
      validators: [
        FileValidators.maxSize(MAX_MAP_IMAGE_SIZE),
        FileValidators.extension(['png'])
      ],
      asyncValidators: [
        FileValidators.imageDimensions([
          { width: MAP_IMAGE_WIDTH, height: MAP_IMAGE_HEIGHT }
        ])
      ]
    }),

    credits: new FormControl(null, [creditsValidator]),

    suggestions: new FormControl<MapSubmissionSuggestion[]>([], {
      validators: [
        suggestionsValidator(
          () => this.map?.zones ?? this.map?.submission?.currentVersion?.zones,
          SuggestionType.SUBMISSION
        )
      ]
    }),

    statusChange: this.fb.group({
      status: [-1 as MapStatus | -1],
      finalLeaderboards: new FormControl<MapSubmissionApproval[]>([])
    })
  });

  versionForm = this.fb.group({
    bsp: [
      null,
      [Validators.required, FileValidators.maxSize(MAX_BSP_SIZE)],
      [FileValidators.isCompressedBsp()]
    ],
    zon: [null, [], [FileValidators.isValidZones()]],
    vmfs: [
      [],
      [FileValidators.maxSize(MAX_VMF_SIZE), FileValidators.extension('vmf')],
      [FileValidators.isValidVdf()]
    ],
    changelog: [
      '',
      [Validators.required, Validators.maxLength(MAX_CHANGELOG_LENGTH)]
    ],
    resetLbs: [false]
  });

  // Getter for this control is a number[], setter User[] (sorry)
  testInviteForm = new FormControl<number[] | User[]>([]);

  @ViewChild(MapImageSelectionComponent, { static: true })
  imageSelection: MapImageSelectionComponent;

  @ViewChild(MapLeaderboardSelectionComponent, { static: true })
  lbSelection: MapLeaderboardSelectionComponent;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly mapsService: MapsService,
    private readonly localUserService: LocalUserService,
    private readonly adminService: AdminService,
    private readonly dialogService: DialogService,
    private readonly messageService: MessageService,
    private readonly fb: FormBuilder,
    private readonly layoutService: LayoutService,
    private readonly destroyRef: DestroyRef,
    private readonly titleService: TitleService,
    private readonly ngHttp: HttpClient
  ) {}

  ngOnInit() {
    this.layoutService.reserveBackgroundUrl(/\/map-edit\/(?!submit)[\w-]+\/?$/);

    merge([
      this.route.paramMap.pipe(map((params) => params.get('name'))),
      this.reload.pipe(map(() => this.lastMapName))
    ])
      .pipe(
        mergeAll(),
        tap(() => (this.loading = true)),
        switchMap((mapName) =>
          this.mapsService.getMap(mapName, {
            expand: [
              'submission',
              'versions',
              'currentVersion',
              'info',
              'credits',
              'zones',
              'leaderboards',
              'reviews',
              'testInvites'
            ]
          })
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(async (map: MMap) => {
        this.isAdmin = this.localUserService.isAdmin;
        this.isMod = this.localUserService.isMod;
        this.isSubmitter =
          map.submitterID === this.localUserService.user.value?.id;
        this.inSubmission = CombinedMapStatuses.IN_SUBMISSION.includes(
          map.status
        );

        if (
          !this.isAdmin &&
          !this.isMod &&
          !(this.inSubmission && (this.isSubmitter || this.isReviewer))
        )
          await this.router.navigate(['/maps/' + map.name]);

        this.map = map;
        this.titleService.setTitle(`Editing ${map.name}`);
        this.lastMapName = map.name;
        await this.setupMainForm();
        this.setupVersionForm();
        this.setupTestInviteForm();
        this.loading = false;
      });
  }

  private async setupMainForm() {
    this.name.setValue(this.map.name);
    this.submissionType.setValue(this.map.submission.type);
    this.description.setValue(this.map.info.description);
    this.creationDate.setValue(new Date(this.map.info.creationDate));
    this.youtubeID.setValue(this.map.info.youtubeID);

    this.images.reset();

    this.imageSelection.items[ImageSelectionType.THUMBNAIL] = [
      await ImageSelectionItem.create(
        this.map.images[0].large,
        this.map.images[0].id
      )
    ];
    this.imageSelection.items[ImageSelectionType.EXTRA] = await Promise.all(
      this.map.images
        .slice(1)
        .map(({ id, large }) => ImageSelectionItem.create(large, id))
    );

    await this.imageSelection.onFileSelectionChanged();
    this.imageSelection.onThumbnailChanged();

    this.credits.setValue(
      new GroupedMapCredits(
        this.map.credits,
        this.map?.submission?.placeholders
      )
    );

    this.lbSelection.zones =
      this.map?.zones ?? this.map.submission?.currentVersion?.zones;
    this.suggestions.setValue(this.map.submission.suggestions);

    if (this.map.status === MapStatus.FINAL_APPROVAL) {
      const validatorFn = suggestionsValidator(
        () => this.map?.zones ?? this.map.submission?.currentVersion?.zones,
        SuggestionType.APPROVAL
      );
      this.status.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((status) =>
          status === MapStatus.APPROVED
            ? this.finalLeaderboards.addValidators(validatorFn)
            : this.finalLeaderboards.removeValidators(validatorFn)
        );
    }

    this.mainForm.markAsUntouched();
    this.mainForm.markAsPristine();
  }

  async submitMainForm() {
    if (this.mainForm.invalid) return;

    const body: UpdateMap | UpdateMapAdmin = {};

    if (this.name.dirty) body.name = this.name.value;
    if (this.submissionType.dirty)
      body.submissionType = this.submissionType.value;
    if (this.description.dirty) {
      body.info ??= {};
      body.info.description = this.description.value;
    }
    if (this.creationDate.dirty) {
      body.info ??= {};
      body.info.creationDate = this.creationDate.value;
    }
    if (this.youtubeID.dirty) {
      body.info ??= {};
      body.info.youtubeID =
        this.youtubeID.value.length > 0 ? this.youtubeID.value : null;
    }
    if (this.suggestions.dirty) body.suggestions = this.suggestions.value;
    if (this.status.dirty) {
      body.status = this.status.value;

      if (this.finalLeaderboards.dirty) {
        (body as UpdateMapAdmin).finalLeaderboards =
          this.finalLeaderboards.value;
      }
    }

    const hasImages = this.images.dirty && this.haveImagesActuallyChanged();
    const hasCredits =
      this.credits.dirty &&
      !deepEquals(this.credits.value, new GroupedMapCredits(this.map.credits));

    if (isEmpty(body) && !hasImages && !hasCredits) return;

    this.loading = true;
    if (!isEmpty(body)) {
      try {
        // Use the non-admin endpoint for submitters, unless they're an admin
        // approving their own map, or map is approved/disabled
        if (
          this.isSubmitter &&
          !(
            (this.isAdmin || this.isMod) &&
            (body.status === MapStatus.APPROVED ||
              this.map.status === MapStatus.APPROVED ||
              this.map.status === MapStatus.DISABLED)
          )
        ) {
          await firstValueFrom(
            this.mapsService.updateMap(this.map.id, body as UpdateMap)
          );
        } else {
          await firstValueFrom(
            this.adminService.updateMap(this.map.id, body as UpdateMapAdmin)
          );
        }
      } catch (error) {
        this.messageService.add({
          severity: 'error',
          summary: 'Failed to update map!',
          detail: JSON.stringify(error.error.message)
        });
        this.loading = false;
        return;
      }
    }

    if (hasImages) {
      // See docs for /maps/:id/images PUT for explanation
      let fileIndex = 0;
      const imageIDs = [];
      const files = [];
      for (const image of Object.values(this.imageSelection.items).flat()) {
        if (image.file) {
          files.push(image.file);
          imageIDs.push(fileIndex.toString());
          fileIndex++;
        } else {
          imageIDs.push(image.existingID);
        }
      }
      try {
        await firstValueFrom(
          this.mapsService.updateMapImages(this.map.id, {
            data: { imageIDs },
            images: files?.length > 0 ? files : undefined
          })
        );
      } catch (error) {
        this.messageService.add({
          severity: 'error',
          summary: 'Failed to update images!',
          detail: JSON.stringify(error.error.message)
        });
        this.loading = false;
        return;
      }
    }

    if (hasCredits) {
      try {
        const real = this.credits.value.getSubmittableRealUsers();
        const placeholders = this.credits.value.getSubmittablePlaceholders();

        if (
          !deepEquals(
            this.map.credits.map(({ userID, type, description }) => ({
              userID,
              type,
              description
            })),
            real
          )
        ) {
          await firstValueFrom(
            this.mapsService.updateMapCredits(this.map.id, real)
          );
        }

        if (!deepEquals(this.map.submission.placeholders, placeholders)) {
          await firstValueFrom(
            (this.isSubmitter ? this.mapsService : this.adminService).updateMap(
              this.map.id,
              { placeholders: this.credits.value.getSubmittablePlaceholders() }
            )
          );
        }
      } catch (error) {
        this.messageService.add({
          severity: 'error',
          summary: 'Failed to update credits!',
          detail: error.error.message
        });
        this.loading = false;
        return;
      }
    }

    this.messageService.add({ severity: 'success', summary: 'Map updated!' });
    if (body.name) this.lastMapName = body.name;
    this.reload.next();
  }

  setupVersionForm() {
    this.versionForm.reset();
  }

  async submitVersionForm() {
    if (this.versionForm.invalid) return;

    const { url: preSignedUrl } = await lastValueFrom(
      this.mapsService.getPreSignedUrl(this.bsp.value.size)
    );

    await lastValueFrom(
      this.ngHttp
        .put(preSignedUrl, await this.bsp.value.arrayBuffer(), {
          reportProgress: true,
          observe: 'events'
        })
        .pipe(
          tap((event: HttpEvent<string>) => {
            switch (event.type) {
              case HttpEventType.Sent:
                this.isUploading = true;
                this.uploadStatusDescription = 'Uploading BSP file...';
                break;
              case HttpEventType.UploadProgress:
                this.uploadPercentage = Math.round(
                  (event['loaded'] / event['total']) * 85
                );
                break;
            }
          })
        )
    );

    try {
      await lastValueFrom(
        this.mapsService
          .submitMapVersion(this.map.id, {
            vmfs: this.vmfs.value,
            data: {
              zones: this.zon.value
                ? (JSON.parse(await this.zon.value.text()) as MapZones)
                : undefined,
              changelog: this.changelog.value,
              resetLeaderboards: this.resetLbs.value
            }
          })
          .pipe(
            tap((event: HttpEvent<string>) => {
              switch (event.type) {
                case HttpEventType.Sent:
                  this.isUploading = true;
                  this.uploadStatusDescription = 'Submitting map version...';
                  break;
                case HttpEventType.UploadProgress:
                  this.uploadPercentage =
                    85 + Math.round((event['loaded'] / event['total']) * 15);
                  break;
                case HttpEventType.Response:
                  this.uploadStatusDescription = 'Upload complete!';
                  this.uploadPercentage = 100;
                  break;
              }
            })
          )
      );
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Failed to post submission version!',
        detail: JSON.stringify(error.error.message)
      });
      this.isUploading = false;
      this.uploadPercentage = 0;
      this.uploadStatusDescription = '';
      return;
    }

    setTimeout(() => {
      this.isUploading = false;
      this.messageService.add({
        severity: 'success',
        summary: 'Map version submitted!'
      });
    }, 1000);

    this.reload.next();
  }

  setupTestInviteForm() {
    this.versionForm.reset();

    if (this.map.status !== MapStatus.PRIVATE_TESTING) return;

    this.testInviteForm.setValue(
      this.map.testInvites
        .filter(({ state }) => state !== MapTestInviteState.DECLINED)
        .map(({ user }) => user)
    );
  }

  async submitTestInviteForm() {
    if (this.testInviteForm.invalid) return;

    try {
      await firstValueFrom(
        this.mapsService.updateMapTestInvites(this.map.id, {
          userIDs: this.testInviteForm.value as number[]
        })
      );
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Failed to update test invites!',
        detail: error.message
      });
      return;
    }

    this.messageService.add({
      severity: 'success',
      summary: 'Testing invites updated!'
    });

    this.versionForm.markAsUntouched();
    this.versionForm.markAsPristine();
  }

  @HostListener('window:beforeunload', ['$event'])
  canLeavePage(_event: Event): boolean {
    return (
      (!this.isUploading &&
        !this.mainForm.dirty &&
        !this.versionForm.dirty &&
        !this.testInviteForm.dirty) ||
      isDevMode()
    );
  }

  canDeactivate(): true | string {
    if (this.isUploading)
      return 'Map is currently uploading, are you sure you want to leave this page?';
    else if (
      this.mainForm.dirty ||
      this.versionForm.dirty ||
      this.testInviteForm.dirty
    )
      return 'Form is incomplete, are you sure you want to leave this page?';
    return true;
  }

  deleteMap() {
    this.dialogService
      .open(CodeVerifyDialogComponent, {
        header: 'Delete map',
        data: {
          message: `
            <p>This will set the map to disabled and delete all files.</p>
            <p>
              Effectively it deletes the map, and should only be used for cases like DMCAs, offensive content etc. If it has any chance of being
              re-enabled, just set the map status to <b>disabled</b> instead.
            </p>`
        }
      })
      .onClose.subscribe((response) => {
        if (!response) return;
        this.adminService.deleteMap(this.map.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              detail: 'Successfully deleted the map'
            });
            this.reload.next();
          },
          error: (error) =>
            this.messageService.add({
              severity: 'error',
              summary: 'Failed to delete the map',
              detail: error.message
            })
        });
      });
  }

  /**
   * Check whether the images form has genuinely changed - don't want to do
   * an image update if user moved images around but they ended up back in their
   * original position.
   */
  private haveImagesActuallyChanged() {
    const items = Object.values(this.imageSelection.items).flat();

    return (
      items.length !== this.map.images.length ||
      items.some(
        (item, i) =>
          !item.existingID || item.existingID !== this.map.images[i]?.id
      )
    );
  }

  get youtubeID() {
    return this.mainForm.get('details.youtubeID') as FormControl<string>;
  }

  get name() {
    return this.mainForm.get('details.name') as FormControl<string>;
  }

  get description() {
    return this.mainForm.get('details.description') as FormControl<string>;
  }

  get creationDate() {
    return this.mainForm.get('details.creationDate') as FormControl<Date>;
  }

  get submissionType() {
    return this.mainForm.get(
      'details.submissionType'
    ) as FormControl<MapSubmissionType>;
  }

  get images() {
    return this.mainForm.get('images') as FormControl<File[]>;
  }

  get details() {
    return this.mainForm.get('details') as FormGroup;
  }

  get credits() {
    return this.mainForm.get('credits') as FormControl<GroupedMapCredits>;
  }

  get suggestions() {
    return this.mainForm.get('suggestions') as FormControl<
      MapSubmissionSuggestion[]
    >;
  }

  get bsp() {
    return this.versionForm.get('bsp') as FormControl<File>;
  }

  get vmfs() {
    return this.versionForm.get('vmfs') as FormControl<File[]>;
  }

  get zon() {
    return this.versionForm.get('zon') as FormControl<File>;
  }

  get changelog() {
    return this.versionForm.get('changelog') as FormControl<string>;
  }

  get resetLbs() {
    return this.versionForm.get('resetLbs') as FormControl<boolean>;
  }

  get statusChange() {
    return this.mainForm.get('statusChange') as FormGroup;
  }

  get status() {
    return this.mainForm.get('statusChange.status') as FormControl<MapStatus>;
  }

  get finalLeaderboards() {
    return this.mainForm.get('statusChange.finalLeaderboards') as FormControl<
      MapSubmissionApproval[]
    >;
  }
}
