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
import { NbPopoverDirective, NbToastrService } from '@nebular/theme';
import { LocalUserService, MapsService } from '@momentum/frontend/data';
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
import {
  BackendValidators,
  creditsValidator,
  FileValidators,
  suggestionsValidator,
  testInvitesValidator
} from '@momentum/frontend/validators';
import { distinctUntilChanged, last, mergeMap, tap } from 'rxjs/operators';
import { MapLeaderboardSelectionComponent } from '../../../../components/map-leaderboard-selection/map-leaderboard-selection.component';
import { SortedMapCredits } from '../../../../components/map-credits-selection/sorted-map-credits.class';
import { showPopover } from '../../../../utils/popover-utils';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpEventType
} from '@angular/common/http';
import { forkJoin } from 'rxjs';

// TODO: "are you sure you wnat to leave this page" thingy!

@Component({
  selector: 'mom-map-submission-form',
  templateUrl: './map-submission-form.component.html',
  styleUrls: ['./map-submission-form.component.scss']
})
export class MapSubmissionFormComponent implements OnInit {
  protected readonly MapSubmissionType = MapSubmissionType;
  protected readonly MAX_BSP_SIZE = MAX_BSP_SIZE;
  protected readonly MAX_VMF_SIZE = MAX_VMF_SIZE;
  protected readonly MAX_MAP_DESCRIPTION_LENGTH = MAX_MAP_DESCRIPTION_LENGTH;

  constructor(
    private readonly mapsService: MapsService,
    private readonly router: Router,
    private readonly localUserService: LocalUserService,
    private readonly toasterService: NbToastrService,
    private readonly fb: FormBuilder
  ) {}


  @ViewChildren(NbPopoverDirective)
  popovers: QueryList<NbPopoverDirective>;

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
  });

  get info() {
    return this.form.get('info') as FormGroup;
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
      this.router.navigate(['/dashboard']);
      this.toasterService.danger('You are banned from map submission.');
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
   * Show error popover for any map name errors
   */
  onNameStatusChange(status: FormControlStatus) {
    const popover = this.popovers.find((p) => p.context === 'mapNameError');
    if (status !== 'INVALID') {
      popover.hide();
      return;
    }

    if (this.name.errors['uniqueMapName']) {
      showPopover(popover, 'Map name is in use!');
    } else if (this.name.errors['maxlength'] || this.name.errors['minlength']) {
      showPopover(
        popover,
        `Map name must be between ${MIN_MAP_NAME_LENGTH} and ${MAX_MAP_NAME_LENGTH} characters.`
      );
    } else {
      popover.hide();
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
