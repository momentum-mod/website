import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  CombinedRoles,
  GamemodeInfo,
  MapReviewSuggestion,
  MapSubmissionType,
  MAX_MAP_IMAGE_SIZE,
  MAX_REVIEW_IMAGES,
  MAX_REVIEW_LENGTH,
  MMap,
  TrackType
} from '@momentum/constants';
import { MessageService } from 'primeng/api';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { take, tap } from 'rxjs/operators';
import { FileValidators, suggestionsValidator } from '../../validators';
import { MapReviewSuggestionsFormComponent } from './map-review-suggestions-form.component';
import { SuggestionType } from '@momentum/formats/zone';
import { MultiFileUploadComponent } from '../file-upload/multi-file-upload.component';
import { HttpErrorResponse } from '@angular/common/http';
import { MapsService } from '../../services/data/maps.service';
import { LocalUserService } from '../../services/data/local-user.service';
import { IconComponent } from '../../icons';
import { TooltipDirective } from '../../directives/tooltip.directive';

@Component({
  selector: 'm-map-review-form',
  imports: [
    MapReviewSuggestionsFormComponent,
    MultiFileUploadComponent,
    ReactiveFormsModule,
    IconComponent,
    TooltipDirective
  ],
  templateUrl: './map-review-form.component.html'
})
export class MapReviewFormComponent {
  protected readonly TrackType = TrackType;
  protected readonly GamemodeInfo = GamemodeInfo;
  protected readonly MapSubmissionType = MapSubmissionType;
  protected readonly MAX_REVIEW_IMAGES = MAX_REVIEW_IMAGES;

  @Input({ required: true }) map: MMap;
  @Input() editing = false;
  @Input() reviewID?: number; // Only applicable if editing
  @Output() public readonly reviewPosted = new EventEmitter<void>();
  @Output() public readonly canceledEditing = new EventEmitter<void>();

  public readonly form = new FormGroup(
    {
      mainText: new FormControl<string>('', {
        validators: [
          Validators.required,
          Validators.maxLength(MAX_REVIEW_LENGTH)
        ]
      }),
      needsResolving: new FormControl<boolean>(false),
      suggestions: new FormControl<MapReviewSuggestion[]>(null, {
        validators: [
          // FormGroup is constructed at component class ctor but map is undefined
          // at that point, and can change over time, so use pass a closure to
          // validator that fetches the current map zones on the class whenever
          // validator is run.
          suggestionsValidator(
            () => this.map?.currentVersion?.zones,
            SuggestionType.REVIEW
          )
        ]
      }),
      images: new FormControl<File[]>(null, {
        validators: [
          FileValidators.maxSize(MAX_MAP_IMAGE_SIZE),
          FileValidators.extension(['png', 'jpg', 'jpeg'])
        ]
      })
    },
    (group: FormGroup) =>
      Object.entries(group?.controls)
        .filter(([k]) => ['mainText', 'suggestions'].includes(k))
        .some(([, { dirty, value }]) =>
          dirty && Array.isArray(value) ? value.length > 0 : value != null
        )
        ? null
        : { noChanges: true }
  );

  get mainText() {
    return this.form.get('mainText') as FormControl<string>;
  }

  get suggestions() {
    return this.form.get('suggestions') as FormControl<MapReviewSuggestion[]>;
  }

  get needsResolving() {
    return this.form.get('needsResolving') as FormControl<boolean>;
  }

  get images() {
    return this.form.get('images') as FormControl<File[]>;
  }

  protected loading = false;

  constructor(
    private readonly mapsService: MapsService,
    private readonly messageService: MessageService,
    private readonly localUserService: LocalUserService
  ) {}

  submit() {
    if (this.form.invalid || this.form.pristine) return;
    this.loading = true;
    const suggestions =
      this.suggestions.value?.length > 0 ? this.suggestions.value : undefined;

    // Ignore any empty suggestions
    if (suggestions) {
      suggestions.forEach(({ tier, gameplayRating, tags }, i) => {
        if (tier == null && gameplayRating == null && !tags?.length) {
          suggestions.splice(i, 1);
        }
      });
    }

    const req = this.editing
      ? this.mapsService.updateMapReview(this.reviewID, {
          mainText: this.mainText.value,
          suggestions,
          needsResolving: this.needsResolving.value
        })
      : this.mapsService.postMapReview(this.map.id, {
          data: {
            mainText: this.mainText.value,
            suggestions,
            needsResolving: this.needsResolving.value
          },
          images: this.images.value
        });

    req
      .pipe(
        take(1),
        tap(() => (this.loading = false))
      )
      .subscribe({
        next: () => {
          this.reviewPosted.next();
          this.messageService.add({
            severity: 'success',
            summary: `${this.editing ? 'Updated' : 'Posted'} map review for ${
              this.map.name
            }`
          });
          this.form.reset();
        },
        error: (httpError: HttpErrorResponse) => {
          if (httpError.status === 409)
            this.messageService.add({
              severity: 'error',
              summary: 'Error: Duplicate suggestions',
              detail:
                'You already have a review containing suggestions, please edit that one!'
            });
          else {
            this.messageService.add({
              severity: 'error',
              summary: `Failed to ${this.editing ? 'post' : 'edit'} review`,
              detail: httpError.error.message
            });
          }
        }
      });
  }

  isReviewer() {
    return this.localUserService.hasRole(CombinedRoles.REVIEWER_AND_ABOVE);
  }
}
