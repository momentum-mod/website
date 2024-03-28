import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild
} from '@angular/core';
import {
  CombinedRoles,
  GamemodeName,
  MapReview,
  MapSubmissionType,
  MAX_REVIEW_COMMENT_LENGTH,
  MMap,
  TrackType
} from '@momentum/constants';
import { UserComponent } from '../user/user.component';
import {
  GroupedMapReviewSuggestions,
  groupMapSuggestions
} from '../../util/grouped-map-suggestions.util';
import { PaginatorModule } from 'primeng/paginator';
import { FormControl, Validators } from '@angular/forms';
import { switchMap, take, tap } from 'rxjs/operators';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Subject } from 'rxjs';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { GalleriaModule } from 'primeng/galleria';
import { MapReviewFormComponent } from './map-review-form.component';
import { DialogModule } from 'primeng/dialog';
import { SharedModule } from '../../shared.module';
import { MapsService } from '../../services/data/maps.service';
import { LocalUserService } from '../../services/data/local-user.service';
import { AdminService } from '../../services/data/admin.service';

@Component({
  selector: 'm-map-review',
  standalone: true,
  imports: [
    SharedModule,
    UserComponent,
    PaginatorModule,
    ConfirmPopupModule,
    ConfirmDialogModule,
    GalleriaModule,
    MapReviewFormComponent,
    DialogModule
  ],
  templateUrl: './map-review.component.html'
})
export class MapReviewComponent {
  protected readonly TrackType = TrackType;
  protected readonly GamemodeName = GamemodeName;
  protected readonly MapSubmissionType = MapSubmissionType;

  private _review: MapReview;
  get review() {
    return this._review;
  }

  @Input({ required: true })
  set review(review: MapReview) {
    this._review = review;
    this.suggestions = groupMapSuggestions(review.suggestions);
    this.images = [null, ...review.images];
  }

  protected suggestions: GroupedMapReviewSuggestions;
  protected images: Array<string | null>;
  protected activeImageDialogIndex = 0;

  // Extremely annoying that we need this, but review editing needs this, this
  // is the least spaghetti way I can think of structing everything rn.
  @Input({ required: true }) map!: MMap;
  @Output() public readonly updatedOrDeleted = new EventEmitter<void>();

  protected readonly commentInput = new FormControl<string>('', {
    validators: [
      Validators.minLength(1),
      Validators.maxLength(MAX_REVIEW_COMMENT_LENGTH)
    ]
  });
  protected loadComments = new Subject<void>();
  protected loadingComments = false;
  protected editModeComments: Map<number, FormControl<string>> = new Map();

  protected editing = false;

  constructor(
    private readonly cdRef: ChangeDetectorRef,
    private readonly mapsService: MapsService,
    private readonly messageService: MessageService,
    private readonly localUserService: LocalUserService,
    private readonly confirmationService: ConfirmationService,
    private readonly adminService: AdminService
  ) {
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
        error: (error) =>
          this.messageService.add({
            severity: 'error',
            detail: error.message,
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
    this.editForm.needsResolving.setValue(this._review.resolved !== null);
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
        error: (error) =>
          this.messageService.add({
            severity: 'error',
            detail: error.message,
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
            error: (error) =>
              this.messageService.add({
                severity: 'error',
                detail: error.message,
                summary: 'Failed to delete review!'
              })
          })
    });
  }

  postComment(): void {
    this.loadingComments = true;
    this.mapsService
      .postMapReviewComment(this._review.id, this.commentInput.value)
      .pipe(
        take(1),
        tap(() => (this.loadingComments = false))
      )
      .subscribe({
        next: (res) => {
          this._review.comments.unshift(res);
          this._review.numComments++;
        },
        error: (error) =>
          this.messageService.add({
            severity: 'error',
            detail: error.message,
            summary: 'Failed to post comment!'
          })
      });
    this.commentInput.reset();
  }

  initEditComment(commentID: number): void {
    if (this.editModeComments.has(commentID)) return;

    this.editModeComments.set(
      commentID,
      new FormControl<string>(
        this._review.comments.find(({ id }) => id === commentID).text,
        {
          validators: [
            Validators.minLength(1),
            Validators.maxLength(MAX_REVIEW_COMMENT_LENGTH)
          ]
        }
      )
    );
  }

  editComment(commentID: number): void {
    this.loadingComments = true;
    this.mapsService
      .updateMapReviewComment(
        commentID,
        this.editModeComments.get(commentID).value
      )
      .pipe(
        take(1),
        tap(() => (this.loadingComments = false))
      )
      .subscribe({
        next: (res) => {
          this.editModeComments.delete(commentID);
          this._review.comments.find(({ id }) => id === commentID).text =
            res.text;
        },
        error: (error) =>
          this.messageService.add({
            severity: 'error',
            detail: error.message,
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
            error: (error) =>
              this.messageService.add({
                severity: 'error',
                detail: error.message,
                summary: 'Failed to delete comment!'
              })
          });
      }
    });
  }

  get isReviewer(): boolean {
    return this.localUserService.hasRole(CombinedRoles.REVIEWER_AND_ABOVE);
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
