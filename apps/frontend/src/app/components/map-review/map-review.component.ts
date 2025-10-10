import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  inject
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
import { PaginatorModule } from 'primeng/paginator';
import {
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { finalize, switchMap, take, tap } from 'rxjs/operators';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Subject } from 'rxjs';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MapReviewFormComponent } from './map-review-form.component';
import { DialogModule } from 'primeng/dialog';

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

  private _review: MapReview;
  get review() {
    return this._review;
  }

  @Input({ required: true })
  set review(review: MapReview) {
    this._review = review;
    this.suggestions = groupMapSuggestions(review.suggestions);
    this.images = review.images.map((image) => ({
      type: 'image',
      full: image,
      thumbnail: image
    }));
  }

  protected suggestions: GroupedMapReviewSuggestions;
  protected images: GalleryImageItem[] = [];
  protected activeImageDialogIndex = 0;

  // Extremely annoying that we need this, but review editing needs this, this
  // is the least spaghetti way I can think of structuring everything rn.
  @Input({ required: true }) map!: MMap;
  @Output() public readonly updatedOrDeleted = new EventEmitter<void>();

  protected readonly commentInput = this.nnfb.group({
    textInput: this.nnfb.control<string>('', {
      validators: [
        Validators.minLength(1),
        Validators.maxLength(MAX_REVIEW_COMMENT_LENGTH)
      ]
    })
  });
  protected readonly MAX_REVIEW_COMMENT_LENGTH = MAX_REVIEW_COMMENT_LENGTH;

  protected loadComments = new Subject<void>();
  protected loadingComments = false;
  protected editModeComments: Map<
    number,
    FormGroup<{ textInput: FormControl<string> }>
  > = new Map();

  protected editing = false;

  constructor() {
    // Very simplistic pagination but don't want to overcomplicate this
    // component. List goes at most recent first, hitting the load button
    // fetches another 5 (older) and appends to comments array.
    this.loadComments
      .pipe(
        tap(() => (this.loadingComments = true)),
        switchMap(() =>
          this.mapsService.getMapReviewComments(this._review.id, {
            take: 5,
            skip: this._review.comments.length
          })
        ),
        tap(() => (this.loadingComments = false))
      )
      .subscribe({
        next: (res) => {
          this.loadingComments = false;
          this._review.comments.push(...res.data);
        },
        error: (httpError: HttpErrorResponse) =>
          this.messageService.add({
            severity: 'error',
            detail: httpError.error.message,
            summary: 'Failed to load comments!'
          })
      });
  }

  @ViewChild(MapReviewFormComponent)
  editForm: MapReviewFormComponent;

  enableEditing(): void {
    if (this.editing) return;

    this.editing = true;

    // Need a CD cycle to run to insert and init the form, can only set form
    // values after that's completed.
    this.cdRef.detectChanges();

    this.editForm.mainText.setValue(this._review.mainText);
    this.editForm.suggestions.setValue(this._review.suggestions);
    this.editForm.form.markAsPristine();
  }

  disableEditing(): void {
    this.editing = false;
  }

  updateResolvedStatus(status: boolean | null): void {
    this.adminService
      .updateMapReview(this._review.id, status)
      .pipe(take(1))
      .subscribe({
        next: (res) => {
          // This doesn't return all expands so just update stuff that changed
          // of called the `review` setter
          this._review.resolver = res.resolver;
          this._review.resolverID = res.resolverID;
          this._review.resolved = res.resolved;
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
          ? this.mapsService.deleteMapReview(this._review.id)
          : this.adminService.deleteMapReview(this._review.id)
        )
          .pipe(take(1))
          .subscribe({
            next: () => this.updatedOrDeleted.next(),
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
    this.loadingComments = true;
    this.mapsService
      .postMapReviewComment(
        this._review.id,
        this.commentInput.get('textInput').value
      )
      .pipe(
        take(1),
        tap(() => (this.loadingComments = false))
      )
      .subscribe({
        next: (res) => {
          this._review.comments.unshift(res);
          this._review.numComments++;
        },
        error: (httpError: HttpErrorResponse) => {
          this.messageService.add({
            severity: 'error',
            detail: httpError.error.message,
            summary: 'Failed to post comment!'
          });
          this.loadingComments = false;
          this.updatedOrDeleted.next();
        }
      });
    this.commentInput.reset();
  }

  initEditComment(commentID: number): void {
    if (this.editModeComments.has(commentID)) return;

    this.editModeComments.set(
      commentID,
      this.nnfb.group({
        textInput: this.nnfb.control<string>(
          this._review.comments.find(({ id }) => id === commentID).text,
          {
            validators: [
              Validators.minLength(1),
              Validators.maxLength(MAX_REVIEW_COMMENT_LENGTH)
            ]
          }
        )
      })
    );
  }

  editComment(commentID: number): void {
    if (this.loadingComments) return;
    this.loadingComments = true;

    this.mapsService
      .updateMapReviewComment(
        commentID,
        this.editModeComments.get(commentID).get('textInput').value
      )
      .pipe(
        take(1),
        finalize(() => (this.loadingComments = false))
      )
      .subscribe({
        next: (res) => {
          this.editModeComments.delete(commentID);
          this._review.comments.find(({ id }) => id === commentID).text =
            res.text;
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
        this.loadingComments = true;
        this.mapsService
          .deleteMapReviewComment(commentID)
          .pipe(
            take(1),
            tap(() => (this.loadingComments = false))
          )
          .subscribe({
            next: () => {
              this._review.comments.splice(
                this._review.comments.findIndex(({ id }) => id === commentID),
                1
              );
              this._review.numComments--;
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
    return this.localUserService.user.value?.id === this._review.reviewerID;
  }

  isCommentAuthor(commentAuthorID: number): boolean {
    return this.localUserService.user.value?.id === commentAuthorID;
  }
}
