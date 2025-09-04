import { Component, input, output } from '@angular/core';
import { MapReviewCommentPostedNotification } from '@momentum/constants';
import { IconComponent } from '../../../icons';
import { RouterLink } from '@angular/router';

// Nearly identical to MapReviewPostedNotificationComponent.
@Component({
  selector: 'm-map-review-comment-posted-notification',
  template: `
    <div class="notification-card-title">
      <m-icon icon="message-reply-text" class="notification-type-icon" />
      <p>New Comment on Your Review</p>
      <button type="button" class="dismiss-button" (click)="dismiss.emit()">
        <m-icon icon="close" />
      </button>
    </div>
    <div class="notification-card-main">
      <p>
        <a
          [routerLink]="'/profile/' + notification().reviewCommenter.id"
          class="link "
        >
          {{ notification().reviewCommenter.alias }}</a
        >
        commented on your review of
        <a
          [routerLink]="'/maps/' + notification().map.name"
          class="font-bold link"
          >{{ notification().map.name }}</a
        >
      </p>
      <p class="italic text-gray-100">
        <!-- 300 characters takes up roughly 5 lines. -->
        {{
          notification().reviewComment.text.length > 300
            ? '"' + notification().reviewComment.text.substring(0, 300) + '..."'
            : '"' + notification().reviewComment.text + '"'
        }}
      </p>
    </div>
  `,
  host: { class: 'notification-card' },
  imports: [RouterLink, IconComponent]
})
export class MapReviewCommentPostedNotificationComponent {
  notification = input.required<MapReviewCommentPostedNotification>();

  dismiss = output();
}
