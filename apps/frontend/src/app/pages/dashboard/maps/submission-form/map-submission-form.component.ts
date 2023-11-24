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
  protected readonly MAX_BSP_SIZE = MAX_BSP_SIZE;
  protected readonly MAX_VMF_SIZE = MAX_VMF_SIZE;

  constructor(
    private readonly mapsService: MapsService,
    private readonly router: Router,
    private readonly localUserService: LocalUserService,
    private readonly toasterService: NbToastrService,
    private readonly fb: FormBuilder
  ) {}


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
  });

  ngOnInit(): void {

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
