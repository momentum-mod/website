import {
  ChangeDetectorRef,
  Component,
  inject,
  input,
  output,
  viewChild,
  computed,
  linkedSignal,
  signal
} from '@angular/core';
import {
  CombinedRoles,
  GamemodeInfo,
  MapReview,
  MapSubmissionType,
  MAX_REVIEW_COMMENT_LENGTH,
  MMap,
  TrackType,
  mapTagEnglishName,
  Role
} from '@momentum/constants';
import { UserComponent } from '../user/user.component';
import {
  GroupedMapReviewSuggestions,
  groupMapSuggestions
} from '../../util/grouped-map-suggestions.util';
import { PaginatorModule } from '@openng/optimus-ui/paginator';
import {
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { finalize, switchMap, take, tap } from 'rxjs/operators';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { Subject } from 'rxjs';
import { ConfirmPopupModule } from '@openng/optimus-ui/confirmpopup';
import { ConfirmDialogModule } from '@openng/optimus-ui/confirmdialog';
import { MapReviewFormComponent } from './map-review-form.component';
import { DialogModule } from '@openng/optimus-ui/dialog';
import { MapsService } from '../../services/data/maps.service';
import { LocalUserService } from '../../services/data/local-user.service';
import { AdminService } from '../../services/data/admin.service';
import {
  GalleryComponent,
  GalleryImageItem
} from '../gallery/gallery.component';
import { HttpErrorResponse } from '@angular/common/http';
import { IconComponent } from '../../icons';
import { UnsortedKeyvaluePipe } from '../../pipes/unsorted-keyvalue.pipe';
import { DatePipe } from '@angular/common';
import { SpinnerDirective } from '../../directives/spinner.directive';
import { PluralPipe } from '../../pipes/plural.pipe';
import { TooltipDirective } from '../../directives/tooltip.directive';
import { DynamicTextareaHeightDirective } from '../../directives/dynamic-textarea-height.directive';

@Component({
  selector: 'm-map-review',
  imports: [
    UserComponent,
    PaginatorModule,
    ConfirmPopupModule,
    ConfirmDialogModule,
    MapReviewFormComponent,
    DialogModule,
    GalleryComponent,
    IconComponent,
    UnsortedKeyvaluePipe,
    DatePipe,
    SpinnerDirective,
    PluralPipe,
    ReactiveFormsModule,
    TooltipDirective,
    DynamicTextareaHeightDirective
  ],
  templateUrl: './map-review.component.html'
})
export class MapReviewComponent {
  private readonly cdRef = inject(ChangeDetectorRef);
  private readonly mapsService = inject(MapsService);
  private readonly messageService = inject(MessageService);
  private readonly localUserService = inject(LocalUserService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly adminService = inject(AdminService);
  private readonly nnfb = inject(NonNullableFormBuilder);

  protected readonly TrackType = TrackType;
  protected readonly GamemodeInfo = GamemodeInfo;
  protected readonly MapSubmissionType = MapSubmissionType;
  protected readonly mapTagEnglishName = mapTagEnglishName;

  readonly review = input.required<MapReview>();
  // Local copy, replaced (never mutated) as comments/resolution change.
  protected readonly reviewState = linkedSignal(() => this.review());

  protected readonly suggestions = computed<GroupedMapReviewSuggestions>(() =>
    groupMapSuggestions(this.reviewState().suggestions)
  );
  protected readonly images = computed<GalleryImageItem[]>(() =>
    this.reviewState().images.map((image) => ({
      type: 'image',
      full: image,
      thumbnail: image
    }))
  );

  // Extremely annoying that we need this, but review editing needs this, this
  // is the least spaghetti way I can think of structuring everything rn.
  readonly map = input.required<MMap>();
  public readonly updatedOrDeleted = output<void>();

  protected readonly commentInput = this.nnfb.group({
    textInput: this.nnfb.control<string>('', {
      validators: [
        Validators.minLength(1),
        Validators.maxLength(MAX_REVIEW_COMMENT_LENGTH)
      ]
    })
  });
  protected readonly MAX_REVIEW_COMMENT_LENGTH = MAX_REVIEW_COMMENT_LENGTH;

  protected readonly loadComments = new Subject<void>();
  protected readonly loadingComments = signal(false);
  protected readonly editModeComments = signal(
    new Map<number, FormGroup<{ textInput: FormControl<string> }>>()
  );

  protected readonly editing = signal(false);

  constructor() {
    // Very simplistic pagination but don't want to overcomplicate this
    // component. List goes at most recent first, hitting the load button
    // fetches another 5 (older) and appends to comments array.
    this.loadComments
      .pipe(
        tap(() => this.loadingComments.set(true)),
        switchMap(() =>
          this.mapsService.getMapReviewComments(this.reviewState().id, {
            take: 5,
            skip: this.reviewState().comments.length
          })
        ),
        tap(() => this.loadingComments.set(false))
      )
      .subscribe({
        next: (res) => {
          this.loadingComments.set(false);
          this.reviewState.update((review) => ({
            ...review,
            comments: [...review.comments, ...res.data]
          }));
        },
        error: (httpError: HttpErrorResponse) =>
          this.messageService.add({
            severity: 'error',
            detail: httpError.error.message,
            summary: 'Failed to load comments!'
          })
      });
  }

  readonly editForm = viewChild(MapReviewFormComponent);

  enableEditing(): void {
    if (this.editing()) return;

    this.editing.set(true);

    // Need a CD cycle to run to insert and init the form, can only set form
    // values after that's completed.
    this.cdRef.detectChanges();

    this.editForm().mainText.setValue(this.reviewState().mainText);
    this.editForm().suggestions.setValue(this.reviewState().suggestions);
    this.editForm().form.markAsPristine();
  }

  disableEditing(): void {
    this.editing.set(false);
  }

  updateResolvedStatus(status: boolean | null): void {
    this.adminService
      .updateMapReview(this.reviewState().id, status)
      .pipe(take(1))
      .subscribe({
        next: (res) => {
          // This doesn't return all expands so just update stuff that changed
          this.reviewState.update((review) => ({
            ...review,
            resolver: res.resolver,
            resolverID: res.resolverID,
            resolved: res.resolved
          }));
        },
        error: (httpError: HttpErrorResponse) =>
          this.messageService.add({
            severity: 'error',
            detail: httpError.error.message,
            summary: 'Failed to update review!'
          })
      });
  }

  deleteReview(event: Event): void {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message:
        'Are you sure you want to delete this review? This action is irreversible!',
      accept: () =>
        (this.isReviewAuthor
          ? this.mapsService.deleteMapReview(this.reviewState().id)
          : this.adminService.deleteMapReview(this.reviewState().id)
        )
          .pipe(take(1))
          .subscribe({
            next: () => this.updatedOrDeleted.emit(),
            error: (httpError: HttpErrorResponse) =>
              this.messageService.add({
                severity: 'error',
                detail: httpError.error.message,
                summary: 'Failed to delete review!'
              })
          })
    });
  }

  postComment(): void {
    this.loadingComments.set(true);
    this.mapsService
      .postMapReviewComment(
        this.reviewState().id,
        this.commentInput.get('textInput').value
      )
      .pipe(
        take(1),
        tap(() => this.loadingComments.set(false))
      )
      .subscribe({
        next: (res) => {
          this.reviewState.update((review) => ({
            ...review,
            comments: [res, ...review.comments],
            numComments: review.numComments + 1
          }));
        },
        error: (httpError: HttpErrorResponse) => {
          this.messageService.add({
            severity: 'error',
            detail: httpError.error.message,
            summary: 'Failed to post comment!'
          });
          this.loadingComments.set(false);
          this.updatedOrDeleted.emit();
        }
      });
    this.commentInput.reset();
  }

  initEditComment(commentID: number): void {
    if (this.editModeComments().has(commentID)) return;

    const group = this.nnfb.group({
      textInput: this.nnfb.control<string>(
        this.reviewState().comments.find(({ id }) => id === commentID).text,
        {
          validators: [
            Validators.minLength(1),
            Validators.maxLength(MAX_REVIEW_COMMENT_LENGTH)
          ]
        }
      )
    });
    this.editModeComments.update((map) => new Map(map).set(commentID, group));
  }

  cancelEditComment(commentID: number): void {
    this.editModeComments.update((map) => {
      const copy = new Map(map);
      copy.delete(commentID);
      return copy;
    });
  }

  editComment(commentID: number): void {
    if (this.loadingComments()) return;
    this.loadingComments.set(true);

    this.mapsService
      .updateMapReviewComment(
        commentID,
        this.editModeComments().get(commentID).get('textInput').value
      )
      .pipe(
        take(1),
        finalize(() => this.loadingComments.set(false))
      )
      .subscribe({
        next: (res) => {
          this.cancelEditComment(commentID);
          this.reviewState.update((review) => ({
            ...review,
            comments: review.comments.map((comment) =>
              comment.id === commentID
                ? { ...comment, text: res.text }
                : comment
            )
          }));
        },
        error: (httpError: HttpErrorResponse) =>
          this.messageService.add({
            severity: 'error',
            detail: httpError.error.message,
            summary: 'Failed to update comment!'
          })
      });
  }

  deleteComment(event: Event, commentID: number): void {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: 'Are you sure you want to delete this comment?',
      accept: () => {
        this.loadingComments.set(true);
        this.mapsService
          .deleteMapReviewComment(commentID)
          .pipe(
            take(1),
            tap(() => this.loadingComments.set(false))
          )
          .subscribe({
            next: () => {
              this.reviewState.update((review) => ({
                ...review,
                comments: review.comments.filter(({ id }) => id !== commentID),
                numComments: review.numComments - 1
              }));
            },
            error: (httpError: HttpErrorResponse) =>
              this.messageService.add({
                severity: 'error',
                detail: httpError.error.message,
                summary: 'Failed to delete comment!'
              })
          });
      }
    });
  }

  get isReviewer(): boolean {
    return this.localUserService.hasRole(CombinedRoles.REVIEWER_AND_ABOVE);
  }

  get isLimited(): boolean {
    return this.localUserService.hasRole(Role.LIMITED);
  }

  get isModOrAdmin(): boolean {
    return this.localUserService.hasRole(CombinedRoles.MOD_OR_ADMIN);
  }

  get isReviewAuthor(): boolean {
    return (
      this.localUserService.user.value?.id === this.reviewState().reviewerID
    );
  }

  isCommentAuthor(commentAuthorID: number): boolean {
    return this.localUserService.user.value?.id === commentAuthorID;
  }
}
