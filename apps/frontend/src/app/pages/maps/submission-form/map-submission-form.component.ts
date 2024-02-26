import {
  Component,
  ElementRef,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren
} from '@angular/core';
import { Router } from '@angular/router';
import {
  FormBuilder,
  FormControl,
  FormControlStatus,
  FormGroup,
  Validators
} from '@angular/forms';
import {
  Ban,
  CombinedRoles,
  Gamemode,
  GamemodePrefix,
  MapSubmissionSuggestion,
  MapSubmissionType,
  MapZones,
  MAX_BSP_SIZE,
  MAX_MAP_DESCRIPTION_LENGTH,
  MAX_MAP_IMAGE_SIZE,
  MAX_MAP_NAME_LENGTH,
  MAX_VMF_SIZE,
  MIN_MAP_NAME_LENGTH,
  TrackType
} from '@momentum/constants';
import { distinctUntilChanged, last, mergeMap, tap } from 'rxjs/operators';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpEventType
} from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageService } from 'primeng/api';
import { CalendarModule } from 'primeng/calendar';
import { LocalUserService, MapsService } from '../../../services';
import {
  BackendValidators,
  creditsValidator,
  FileValidators,
  suggestionsValidator,
  testInvitesValidator
} from '../../../validators';
import {
  MapLeaderboardSelectionComponent,
  SortedMapCredits,
  MapTestingRequestSelectionComponent,
  MapCreditsSelectionComponent,
  MapImageSelectionComponent,
  MultiFileUploadComponent,
  FileUploadComponent
} from '../../../components';
import { SharedModule } from '../../../shared.module';
import { TooltipDirective } from '../../../directives';
import { PluralPipe } from '../../../pipes';
import { SuggestionType } from '@momentum/formats/zone';

// TODO: "are you sure you wnat to leave this page" thingy!

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
    MapTestingRequestSelectionComponent,
    TooltipDirective,
    ProgressBarModule,
    CalendarModule,
    PluralPipe
  ]
})
export class MapSubmissionFormComponent implements OnInit {
  protected readonly MapSubmissionType = MapSubmissionType;
  protected readonly MAX_BSP_SIZE = MAX_BSP_SIZE;
  protected readonly MAX_VMF_SIZE = MAX_VMF_SIZE;
  protected readonly MAX_MAP_IMAGE_SIZE = MAX_MAP_IMAGE_SIZE;
  protected readonly MAX_MAP_DESCRIPTION_LENGTH = MAX_MAP_DESCRIPTION_LENGTH;

  constructor(
    private readonly mapsService: MapsService,
    private readonly router: Router,
    private readonly localUserService: LocalUserService,
    private readonly messageService: MessageService,
    private readonly fb: FormBuilder
  ) {}

  @ViewChild(MapLeaderboardSelectionComponent)
  lbSelection: MapLeaderboardSelectionComponent;

  @ViewChild('submitButton', { static: true })
  submitButton: ElementRef<HTMLButtonElement>;

  @ViewChildren(TooltipDirective)
  tooltips: QueryList<TooltipDirective>;

  isUploading = false;
  uploadPercentage = 0;
  uploadStatusDescription = 'TODO: MAKE ME EMPTY STRING';

  protected zones: MapZones | null = null;

  // mapPreview: PartialDeep<
  //   { map: MMap; images: MapImage[] },
  //   { recurseIntoArrays: true }
  // >;

  isMapperOrPorter: boolean;
  isModOrAdmin: boolean;
  hasMapInSubmission: boolean;

  form: FormGroup = this.fb.group({
    files: this.fb.group({
      bsp: [
        null,
        [
          Validators.required,
          FileValidators.maxSize(MAX_BSP_SIZE),
          FileValidators.namePattern(/^[\w-]+\.bsp$/)
        ],
        [FileValidators.isCompressedBsp()]
      ],
      zon: [null, [Validators.required], [FileValidators.isValidZones()]],
      vmfs: [
        [],
        [FileValidators.maxSize(MAX_VMF_SIZE), FileValidators.extension('vmf')],
        [FileValidators.isValidVdf()]
      ]
    }),
    info: this.fb.group({
      name: [
        '',
        [
          Validators.required,
          Validators.minLength(MIN_MAP_NAME_LENGTH),
          Validators.maxLength(MAX_MAP_NAME_LENGTH)
        ],
        [BackendValidators.uniqueMapName(this.mapsService)]
      ],
      description: [
        '',
        [Validators.required, Validators.maxLength(MAX_MAP_DESCRIPTION_LENGTH)]
      ],
      creationDate: [
        new Date(),
        [Validators.required, Validators.max(Date.now())]
      ],
      submissionType: [null, [Validators.required]],
      youtubeID: ['', [Validators.pattern(/[\w-]{11}/)]]
    }),
    images: [
      '',
      [
        Validators.required,
        FileValidators.maxSize(MAX_MAP_IMAGE_SIZE),
        FileValidators.extension(['png', 'jpg', 'jpeg'])
      ],
      [FileValidators.imageDimensions([{ width: 2560, height: 1440 }])]
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
        testInvites: new FormControl({ value: [], disabled: true })
      },
      { validators: [testInvitesValidator] }
    )
  });

  get files() {
    return this.form.get('files') as FormGroup;
  }

  get info() {
    return this.form.get('info') as FormGroup;
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
    return this.form.get('info.youtubeID') as FormControl<string>;
  }

  get name() {
    return this.form.get('info.name') as FormControl<string>;
  }

  get description() {
    return this.form.get('info.description') as FormControl<string>;
  }

  get creationDate() {
    return this.form.get('info.creationDate') as FormControl<Date>;
  }

  get submissionType() {
    return this.form.get(
      'info.submissionType'
    ) as FormControl<MapSubmissionType>;
  }

  get images() {
    return this.form.get('images') as FormControl<File[]>;
  }

  get credits() {
    return this.form.get('credits') as FormControl<SortedMapCredits>;
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

  ngOnInit(): void {
    this.youtubeID.valueChanges.subscribe(() => this.generatePreviewMap());
    this.form
      .get('credits')
      .valueChanges.subscribe(() => this.generatePreviewMap());
    this.form
      .get('info')
      .valueChanges.subscribe(this.generatePreviewMap.bind(this));

    this.zon.statusChanges.pipe(distinctUntilChanged()).subscribe((status) => {
      if (status === 'VALID') {
        this.onValidZoneFileSelected();
        this.suggestions.enable();
      } else {
        this.suggestions.disable();
      }
    });

    this.bsp.valueChanges.subscribe(this.onBspFileSelected.bind(this));

    this.name.statusChanges.subscribe(this.onNameStatusChange.bind(this));

    this.wantsPrivateTesting.valueChanges.subscribe((value) =>
      value ? this.testInvites.enable() : this.testInvites.disable()
    );

    this.isMapperOrPorter = this.localUserService.hasRole(
      CombinedRoles.MAPPER_AND_ABOVE
    );
    this.isModOrAdmin = this.localUserService.hasRole(
      CombinedRoles.MOD_OR_ADMIN
    );

    this.mapsService
      .getMapSubmissions()
      .subscribe((value) => (this.hasMapInSubmission = value.totalCount > 0));

    if (this.localUserService.hasBan(Ban.MAP_SUBMISSION)) {
      this.router.navigate(['/']);
      this.messageService.add({
        severity: 'warn',
        summary: 'You are banned from map submission'
      });
    }
  }

  async onBspFileSelected() {
    const name = this.bsp.value.name.replaceAll('.bsp', '').toLowerCase();

    // Fill name field with map name if pristine
    if (this.name.pristine) {
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
          trackNum: 0,
          ranked: true,
          tier: 1
        },
        ...this.zones.tracks.bonuses.map((_, i) => ({
          gamemode,
          trackType: TrackType.BONUS,
          trackNum: i,
          ranked: true,
          tier: 1
        }))
      ])
    );
  }

  /**
   * Show error tooltip for any map name errors
   */
  onNameStatusChange(status: FormControlStatus) {
    const tooltip = TooltipDirective.findByContext(
      this.tooltips,
      'mapNameError'
    );
    if (status !== 'INVALID') {
      tooltip.hide();
      return;
    }

    if (this.name.errors['uniqueMapName']) {
      tooltip.setAndShow('Map name is in use!');
    } else if (this.name.errors['maxlength'] || this.name.errors['minlength']) {
      tooltip.setAndShow(
        `Map name must be between ${MIN_MAP_NAME_LENGTH} and ${MAX_MAP_NAME_LENGTH} characters.`
      );
    } else {
      tooltip.hide();
    }
  }

  /**
   * Infer a gamemode(s) from a potential gamemode prefixes on a file name.
   * Returns an array to support defrag VQ3/CPM
   */
  inferGamemode(fileName: string): Gamemode[] | null {
    if (!fileName.includes('_')) return null;

    const fileNamePrefix = fileName.split('_')[0];
    const modes = [...GamemodePrefix.entries()]
      .filter(([_, prefix]) => fileNamePrefix === prefix)
      .map(([mode]) => mode);

    return modes.length > 0 ? modes : null;
  }

  onSubmit() {
    this.form.markAllAsTouched();
    if (!this.form.valid) return;

    this.isUploading = true;
    let mapID;

    this.mapsService
      .submitMap({
        data: {
          name: this.name.value,
          fileName: this.bsp.value.name.replaceAll('.bsp', ''),
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
            creationDate: this.creationDate.value
          }
        },
        bsp: this.bsp.value,
        vmfs: this.vmfs.value
      })
      .pipe(
        tap({
          next: (event: HttpEvent<string>) => {
            switch (event.type) {
              case HttpEventType.Sent:
                this.isUploading = true;
                // Okay, we already started senting the BSP file here since it's
                // all one request but whatever this looks good
                this.uploadStatusDescription = 'Submitting map...';
                break;
              case HttpEventType.UploadProgress:
                this.uploadStatusDescription = 'Uploading BSP file...';
                // Let this bar go 90% of the way, then images will be final 10%
                this.uploadPercentage = Math.round(
                  (event['loaded'] / event['total']) * 80
                );
                break;
              case HttpEventType.Response:
                mapID = JSON.parse(event.body).id;
                this.uploadStatusDescription = 'Uploading images...';
                this.uploadPercentage = 90;
                break;
            }
          },
          error: (httpError: HttpErrorResponse) =>
            this.onUploadError(httpError, 'Map')
        }),
        last(),
        mergeMap(() =>
          forkJoin([
            this.mapsService.updateMapThumbnail(mapID, this.images.value[0]),
            ...this.images.value
              .slice(1)
              .map((image) => this.mapsService.createMapImage(mapID, image))
          ])
        )
      )
      .subscribe({
        next: () => {
          // Not being fancy with upload progress here, just wait for all images
          // to complete then set to 100.
          this.uploadPercentage = 100;
          this.isUploading = false;
          this.uploadStatusDescription = 'Upload completed!';
          this.messageService.add({
            severity: 'success',
            summary: 'Map upload complete!'
          });
        },
        error: (httpError: HttpErrorResponse) =>
          this.onUploadError(
            httpError,
            'Map image',
            'You will have to resubmit some images on the map edit page!'
          ),
        complete: () => {
          this.resetUploadStatus();
          this.router.navigate([`/maps/${mapID}`]);
        }
      });
  }

  onUploadError(error: HttpErrorResponse, type: string, extraMessage?: string) {
    const errorMessage = JSON.parse(error?.error)?.message ?? 'Unknown error';
    this.messageService.add({
      severity: 'error',
      summary: `${type} upload failed!`,
      detail: `Image submission failed with error: ${errorMessage}. ${extraMessage}`,
      life: 20000
    });
    console.error(`${type} upload failure: ${errorMessage}`);

    this.resetUploadStatus();
  }

  private resetUploadStatus() {
    this.isUploading = false;
    this.uploadStatusDescription = '';
    this.uploadPercentage = 0;
  }

  generatePreviewMap(): void {
    // const youtubeIDMatch = this.youtubeURL.value.match(this.youtubeRegex);
    // this.mapPreview = {
    //   map: {
    //     id: 0,
    //     name: this.name.value,
    //     type: this.type.value as any, // TODO
    //     hash: 'not-important-yet',
    //     status: 0,
    //     info: {
    //       id: 0,
    //       description: this.description.value,
    //       youtubeID: youtubeIDMatch ? youtubeIDMatch[0] : undefined,
    //       numTracks: this.tracks.length,
    //       creationDate: this.creationDate.value
    //     },
    //     mainTrack: this.tracks.length > 0 ? this.tracks[0] : undefined,
    //     tracks: this.tracks,
    //     credits: Object.entries(this.credits).flatMap(([type, users]) =>
    //       users.map((credit) => ({
    //         type: +type,
    //         user: credit.user
    //       }))
    //     ),
    //     submitter: this.localUserService.localUser
    //   },
    //   images: []
    // };
    // if (this.avatarFilePreview) {
    //   this.mapPreview.images.push({
    //     id: 0,
    //     mapID: 0,
    //     small: this.avatarFilePreview.dataBlobUrl,
    //     medium: this.avatarFilePreview.dataBlobUrl,
    //     large: this.avatarFilePreview.dataBlobUrl
    //   });
    // }
    // for (const image of this.extraImages)
    //   this.mapPreview.images.push({
    //     id: 0,
    //     mapID: 0,
    //     small: image.dataBlobUrl,
    //     medium: image.dataBlobUrl,//
    //     large: image.dataBlobUrl
    //   });
  }

  /**
   * Remove any extra crap from Youtube ID field if a full URL is pasted in,
   * e.g. https://youtu.be/JhPPHchfhQY?t=5 becomes JhPPHchfhQY
   */
  stripYoutubeUrl() {
    const url = this.youtubeID.value;
    if (/.*youtube\.com\/watch\?v=[\w-]{11}.*/.test(url)) {
      this.youtubeID.setValue(/(?<=v=)[\w-]{11}/.exec(url)[0]);
    } else if (/youtu\.be\/[\w-]{11}.*/.test(url)) {
      this.youtubeID.setValue(/(?<=youtu\.be\/)[\w-]{11}/.exec(url)[0]);
    }
  }

  /**
   * Returns true if a group is valid and dirty.
   * @param group
   */
  isGroupValid(group: FormGroup): boolean {
    return group.dirty && group.valid;
  }

  /**
   * Returns true if group has a dirty invalid control.
   */
  isGroupInvalid(group: FormGroup): boolean {
    return Object.values(group.controls).some((c) => c.dirty && c.invalid);
  }

  /*
   * Return true if group is invalid but doesn't have any dirty invalid
   * controls, so we don't want to yell at the user yet
   */
  isGroupAwaitingEditing(group: FormGroup): boolean {
    return !this.isGroupInvalid(group) && !group.valid;
  }
}
