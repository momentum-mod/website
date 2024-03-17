import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  CombinedRoles,
  GamemodeName,
  MapReviewSuggestion,
  MapSubmissionType,
  MAX_MAP_IMAGE_SIZE,
  MAX_REVIEW_IMAGES,
  MAX_REVIEW_LENGTH,
  MMap,
  TrackType
} from '@momentum/constants';
import { LocalUserService, MapsService } from '../../services';
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
import { IconComponent } from '../../icons';
import { TooltipDirective } from '../../directives';
import { MultiFileUploadComponent } from '../file-upload/multi-file-upload.component';
import { HttpErrorResponse } from '@angular/common/http';
import { JsonPipe } from '@angular/common';

@Component({
  selector: 'm-map-review-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MapReviewSuggestionsFormComponent,
    IconComponent,
    TooltipDirective,
    MultiFileUploadComponent,
    JsonPipe
  ],

  templateUrl: './map-review-form.component.html'
})
export class MapReviewFormComponent {
  protected readonly TrackType = TrackType;
  protected readonly GamemodeName = GamemodeName;
  protected readonly MapSubmissionType = MapSubmissionType;
  protected readonly MAX_REVIEW_IMAGES = MAX_REVIEW_IMAGES;

  @Input({ required: true }) map: MMap;
  @Input() editing = false;
  @Input() reviewID?: number; // Only applicable if editing
  @Output() public readonly reviewPosted = new EventEmitter<void>();
  @Output() public readonly canceledEditing = new EventEmitter<void>();

  public readonly form = new FormGroup({
    mainText: new FormControl<string>('', {
      validators: [Validators.required, Validators.maxLength(MAX_REVIEW_LENGTH)]
    }),
    needsResolving: new FormControl<boolean>(false),
    suggestions: new FormControl<MapReviewSuggestion[]>(null, {
      validators: [
        // FormGroup is constructed at component class ctor but map is undefined
        // at that point, and can change over time, so use pass a closure to
        // validator that fetches the current map zones on the class whenever
        // validator is run.
        suggestionsValidator(
          () => this.map?.zones ?? this.map?.submission?.currentVersion?.zones,
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
  });

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
    (this.editing
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
        })
    )
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
        error: (error: HttpErrorResponse) => {
          if (error.status === 409)
            this.messageService.add({
              severity: 'error',
              summary: 'Error: Duplicate suggestions',
              detail:
                'You already have a review containing suggestions, please edit that one!'
            });
          else
            this.messageService.add({
              severity: 'error',
              summary: `Failed to ${this.editing ? 'post' : 'edit'} review`,
              detail: error.message
            });
        }
      });
  }

  isReviewer() {
    return this.localUserService.hasRole(CombinedRoles.REVIEWER_AND_ABOVE);
  }
}
