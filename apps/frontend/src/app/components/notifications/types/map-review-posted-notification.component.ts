import { Component, input, output } from '@angular/core';
import { MapReviewPostedNotification } from '@momentum/constants';
import { IconComponent } from '../../../icons';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'm-map-review-posted-notification',
  template: `
    <div class="notification-card-title">
      <m-icon icon="message-draw" class="notification-type-icon" />
      <p>New Map Review</p>
      <button type="button" class="dismiss-button" (click)="dismiss.emit()">
        <m-icon icon="close" />
      </button>
    </div>
    <div class="notification-card-main">
      <p>
        <a
          [routerLink]="'/profile/' + notification().reviewer.id"
          class="link "
        >
          {{ notification().reviewer.alias }}</a
        >
        posted a review of
        <a
          [routerLink]="'/maps/' + notification().map.name"
          class="font-bold link"
          >{{ notification().map.name }}</a
        >
      </p>
      <p class="italic text-gray-100">
        <!-- 300 characters takes up roughly 5 lines. -->
        {{
          notification().review.mainText.length > 300
            ? '"' + notification().review.mainText.substring(0, 300) + '..."'
            : '"' + notification().review.mainText + '"'
        }}
      </p>
    </div>
  `,
  host: { class: 'notification-card' },
  imports: [RouterLink, IconComponent]
})
export class MapReviewPostedNotificationComponent {
  notification = input.required<MapReviewPostedNotification>();

  dismiss = output();
}
