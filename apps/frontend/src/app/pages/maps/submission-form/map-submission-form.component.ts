import {
  Component,
  DestroyRef,
  HostListener,
  isDevMode,
  OnInit,
  ViewChild
} from '@angular/core';
import { Router } from '@angular/router';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators
} from '@angular/forms';
import {
  Ban,
  CombinedRoles,
  Gamemode,
  LeaderboardType,
  MAP_IMAGE_HEIGHT,
  MAP_IMAGE_WIDTH,
  MapSubmissionSuggestion,
  MapSubmissionType,
  MapZones,
  MAX_BSP_SIZE,
  MAX_MAP_DESCRIPTION_LENGTH,
  MAX_MAP_IMAGE_SIZE,
  MAX_MAP_NAME_LENGTH,
  MAX_VMF_SIZE,
  MIN_MAP_DESCRIPTION_LENGTH,
  MIN_MAP_NAME_LENGTH,
  TrackType,
  YOUTUBE_ID_REGEXP,
  MAP_NAME_REGEXP,
  GamemodeInfo,
  DateString
} from '@momentum/constants';
import { distinctUntilChanged, tap } from 'rxjs/operators';
import { HttpEvent, HttpEventType } from '@angular/common/http';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageService } from 'primeng/api';
import {
  BackendValidators,
  creditsValidator,
  FileValidators,
  suggestionsValidator,
  testInvitesValidator
} from '../../../validators';
import { SharedModule } from '../../../shared.module';
import { SuggestionType } from '@momentum/formats/zone';
import { GroupedMapCredits, FormUtils } from '../../../util';
import { lastValueFrom } from 'rxjs';
import { ConfirmDeactivate } from '../../../guards/component-can-deactivate.guard';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FileUploadComponent } from '../../../components/file-upload/file-upload.component';
import { MultiFileUploadComponent } from '../../../components/file-upload/multi-file-upload.component';
import { MapImageSelectionComponent } from '../../../components/map-forms/map-image-selection/map-image-selection.component';
import { MapLeaderboardSelectionComponent } from '../../../components/map-forms/map-leaderboard-selection/map-leaderboard-selection.component';
import { MapCreditsSelectionComponent } from '../../../components/map-forms/map-credits-selection/map-credits-selection.component';
import { MapTestInviteSelectionComponent } from '../../../components/map-forms/map-test-invite-selection/map-test-invite-selection.component';
import { AlertComponent } from '../../../components/alert/alert.component';
import { MapDetailsFormComponent } from '../../../components/map-forms/map-details-form/map-details-form.component';
import { LeaderboardsInfoComponent } from '../../../components/tooltips/leaderboards-info.component';
import { CreditsInfoComponent } from '../../../components/tooltips/credits-info.component';
import { MapsService } from '../../../services/data/maps.service';
import { LocalUserService } from '../../../services/data/local-user.service';
import { HttpClient } from '@angular/common/http';
import { ChipsComponent } from '../../../components/chips/chips.component';

@Component({
  selector: 'm-map-submission-form',
  templateUrl: './map-submission-form.component.html',
  standalone: true,
  imports: [
    SharedModule,
    FileUploadComponent,
    MultiFileUploadComponent,
    MapImageSelectionComponent,
    MapCreditsSelectionComponent,
    MapLeaderboardSelectionComponent,
    MapTestInviteSelectionComponent,
    ProgressBarModule,
    AlertComponent,
    MapDetailsFormComponent,
    LeaderboardsInfoComponent,
    CreditsInfoComponent,
    ChipsComponent
  ]
})
export class MapSubmissionFormComponent implements OnInit, ConfirmDeactivate {
  protected readonly FormUtils = FormUtils;
  protected readonly MAX_BSP_SIZE = MAX_BSP_SIZE;
  protected readonly MAX_VMF_SIZE = MAX_VMF_SIZE;
  protected readonly MAX_MAP_IMAGE_SIZE = MAX_MAP_IMAGE_SIZE;

  constructor(
    private readonly mapsService: MapsService,
    private readonly router: Router,
    private readonly localUserService: LocalUserService,
    private readonly messageService: MessageService,
    private readonly fb: FormBuilder,
    private readonly destroyRef: DestroyRef,
    private readonly ngHttp: HttpClient
  ) {}

  @ViewChild(MapLeaderboardSelectionComponent)
  lbSelection: MapLeaderboardSelectionComponent;

  isUploading = false;
  uploadPercentage = 0;
  uploadStatusDescription = '';

  protected zones: MapZones | null = null;

  isMapperOrPorter: boolean;
  isModOrAdmin: boolean;
  hasMapInSubmission: boolean;

  form = this.fb.group({
    files: this.fb.group({
      bsp: [
        null,
        [Validators.required, FileValidators.maxSize(MAX_BSP_SIZE)],
        [FileValidators.isCompressedBsp()]
      ],
      zon: [null, [Validators.required], [FileValidators.isValidZones()]],
      vmfs: [
        [],
        [FileValidators.maxSize(MAX_VMF_SIZE), FileValidators.extension('vmf')],
        [FileValidators.isValidVdf()]
      ]
    }),
    details: this.fb.group({
      name: [
        '',
        [
          Validators.required,
          Validators.pattern(MAP_NAME_REGEXP),
          Validators.minLength(MIN_MAP_NAME_LENGTH),
          Validators.maxLength(MAX_MAP_NAME_LENGTH)
        ],
        [BackendValidators.uniqueMapName(this.mapsService)]
      ],
      description: [
        '',
        [
          Validators.required,
          Validators.minLength(MIN_MAP_DESCRIPTION_LENGTH),
          Validators.maxLength(MAX_MAP_DESCRIPTION_LENGTH)
        ]
      ],
      creationDate: [
        new Date(),
        [Validators.required, Validators.max(Date.now())]
      ],
      submissionType: [null as MapSubmissionType, [Validators.required]],
      youtubeID: ['', [Validators.pattern(YOUTUBE_ID_REGEXP)]]
    }),
    images: [
      null,
      [
        Validators.required,
        FileValidators.maxSize(MAX_MAP_IMAGE_SIZE),
        FileValidators.extension(['png'])
      ],
      [
        FileValidators.imageDimensions([
          { width: MAP_IMAGE_WIDTH, height: MAP_IMAGE_HEIGHT }
        ])
      ]
    ],
    credits: [null, [creditsValidator]],
    suggestions: new FormControl(
      { value: [], disabled: true },
      {
        validators: [
          suggestionsValidator(() => this.zones, SuggestionType.SUBMISSION)
        ]
      }
    ),
    privateTesting: this.fb.group(
      {
        wantsPrivateTesting: [false],
        testInvites: new FormControl<number[]>({ value: [], disabled: true })
      },
      { validators: [testInvitesValidator] }
    )
  });

  ngOnInit(): void {
    this.zon.statusChanges
      .pipe(distinctUntilChanged())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((status) => {
        if (status === 'VALID') {
          this.onValidZoneFileSelected();
          this.suggestions.enable();
        } else {
          this.suggestions.disable();
        }
      });

    this.bsp.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(this.onBspFileSelected.bind(this));

    this.wantsPrivateTesting.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) =>
        value ? this.testInvites.enable() : this.testInvites.disable()
      );

    this.localUserService.user
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.isMapperOrPorter = this.localUserService.hasRole(
          CombinedRoles.MAPPER_AND_ABOVE
        );
        this.isModOrAdmin = this.localUserService.hasRole(
          CombinedRoles.MOD_OR_ADMIN
        );

        if (this.localUserService.hasBan(Ban.MAP_SUBMISSION)) {
          this.router.navigate(['/']);
          this.messageService.add({
            severity: 'warn',
            summary: 'You are banned from map submission'
          });
        }
      });

    this.mapsService
      .getMapSubmissions()
      .subscribe((value) => (this.hasMapInSubmission = value.totalCount > 0));
  }

  async onBspFileSelected() {
    const name = this.bsp.value?.name.replaceAll('.bsp', '').toLowerCase();

    // Fill name field with map name if pristine
    if (this.name.pristine || this.name.value === '') {
      this.name.setValue(name, { emitEvent: true });
    }
  }

  async onValidZoneFileSelected() {
    // This has been validated already
    this.zones = JSON.parse(await this.zon.value.text()) as MapZones;
    this.lbSelection.zones = this.zones;

    // A zone file *coooould* have a different filename from the BSP so try the
    // BSP first
    const mapName = this.bsp.value?.name ?? this.zon.value?.name;
    // Guess at the mode(s). Using Ahop if there's no prefix since it's first
    // alphabetically.
    const inferredModes = this.inferGamemode(mapName) ?? [Gamemode.AHOP];

    if (!this.suggestions.pristine) return;

    this.suggestions.setValue(
      inferredModes.flatMap((gamemode) => [
        {
          gamemode,
          trackType: TrackType.MAIN,
          trackNum: 1,
          type: LeaderboardType.RANKED,
          tier: 1,
          tags: []
        },
        ...(this.zones.tracks.bonuses?.map((_, i) => ({
          gamemode,
          trackType: TrackType.BONUS,
          trackNum: i + 1,
          type: LeaderboardType.RANKED as LeaderboardType.RANKED,
          tier: 1,
          tags: []
        })) ?? [])
      ])
    );
  }

  /**
   * Infer a gamemode(s) from a potential gamemode prefixes on a file name.
   * Returns an array to support defrag VQ3/CPM
   */
  inferGamemode(fileName: string): Gamemode[] | null {
    if (!fileName.includes('_')) return null;

    const fileNamePrefix = fileName.split('_')[0];
    const modes = [...GamemodeInfo.entries()]
      .filter(([_, { prefix }]) => fileNamePrefix === prefix)
      .map(([mode]) => mode);

    return modes.length > 0 ? modes : null;
  }

  async onSubmit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.isUploading = true;
    let mapID: number;

    try {
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
                    (event['loaded'] / event['total']) * 80
                  );
                  break;
              }
            })
          )
      );

      await lastValueFrom(
        this.mapsService
          .submitMap({
            data: {
              name: this.name.value,
              submissionType: this.submissionType.value,
              wantsPrivateTesting: this.wantsPrivateTesting.value,
              testInvites: this.testInvites.value ?? [],
              zones: this.zones,
              credits: this.credits.value.getSubmittableRealUsers(),
              placeholders: this.credits.value.getSubmittablePlaceholders(),
              suggestions: this.suggestions.value,
              info: {
                description: this.description.value,
                youtubeID: this.youtubeID.value || undefined,
                creationDate:
                  this.creationDate.value.toISOString() as DateString
              }
            },
            vmfs: this.vmfs.value
          })
          .pipe(
            tap((event: HttpEvent<string>) => {
              switch (event.type) {
                case HttpEventType.Sent:
                  this.isUploading = true;
                  this.uploadStatusDescription = 'Submitting map...';
                  break;
                case HttpEventType.UploadProgress:
                  this.uploadPercentage =
                    80 + Math.round((event['loaded'] / event['total']) * 10);
                  break;
                case HttpEventType.Response:
                  mapID = JSON.parse(event.body).id;
                  this.uploadStatusDescription = 'Uploading images...';
                  this.uploadPercentage = 90;
                  break;
              }
            })
          )
      );
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Map upload failed!',
        detail: JSON.parse(error.error).message,
        sticky: true
      });

      this.resetUpload();
      return;
    }

    try {
      await lastValueFrom(
        this.mapsService.updateMapImages(mapID, {
          images: this.images.value,
          data: { imageIDs: this.images.value.map((_, i) => i.toString()) }
        })
      );
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Image upload failed!',
        detail: `You may need to edit resubmit some images on the Map Edit page. ${error.message}`,
        sticky: true
      });
      // Don't return if this fails, we don't want the user trying to resubmit
      // the same map. Just take to map page and they can edit images if
      // needed.
    }

    this.uploadPercentage = 100;
    this.uploadStatusDescription = 'Upload completed!';
    this.messageService.add({
      severity: 'success',
      summary: 'Map upload complete!'
    });

    // Just feels good to have short delay after bar reaches end :)
    setTimeout(() => {
      this.resetUpload();
      this.form.reset();
      this.form.markAsPristine();
      this.router.navigate([`/maps/${mapID}`]);
    }, 1000);
  }

  resetUpload() {
    this.uploadStatusDescription = '';
    this.uploadPercentage = 0;
    this.isUploading = false;
  }

  @HostListener('window:beforeunload', ['$event'])
  canLeavePage(_event: Event): boolean {
    return (!this.isUploading && !this.form.dirty) || isDevMode();
  }

  canDeactivate(): true | string {
    if (this.isUploading)
      return 'Map is currently uploading, are you sure you want to leave this page?';
    else if (this.form.dirty)
      return 'Form is incomplete, are you sure you want to leave this page?';
    return true;
  }

  get files() {
    return this.form.get('files') as FormGroup;
  }

  get details() {
    return this.form.get('details') as FormGroup;
  }

  get privateTesting() {
    return this.form.get('privateTesting') as FormGroup;
  }

  get bsp() {
    return this.form.get('files.bsp') as FormControl<File>;
  }

  get vmfs() {
    return this.form.get('files.vmfs') as FormControl<File[]>;
  }

  get zon() {
    return this.form.get('files.zon') as FormControl<File>;
  }

  get youtubeID() {
    return this.form.get('details.youtubeID') as FormControl<string>;
  }

  get name() {
    return this.form.get('details.name') as FormControl<string>;
  }

  get description() {
    return this.form.get('details.description') as FormControl<string>;
  }

  get creationDate() {
    return this.form.get('details.creationDate') as FormControl<Date>;
  }

  get submissionType() {
    return this.form.get(
      'details.submissionType'
    ) as FormControl<MapSubmissionType>;
  }

  get images() {
    return this.form.get('images') as FormControl<File[]>;
  }

  get credits() {
    return this.form.get('credits') as FormControl<GroupedMapCredits>;
  }

  get suggestions() {
    return this.form.get('suggestions') as FormControl<
      MapSubmissionSuggestion[]
    >;
  }

  get wantsPrivateTesting() {
    return this.privateTesting.get(
      'wantsPrivateTesting'
    ) as FormControl<boolean>;
  }

  get testInvites() {
    return this.privateTesting.get('testInvites') as FormControl<number[]>;
  }
}
