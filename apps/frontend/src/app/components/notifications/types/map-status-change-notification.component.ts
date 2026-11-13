import { Component, input, output } from '@angular/core';
import {
  MapStatus,
  MapStatusChangeNotification,
  MapStatusName
} from '@momentum/constants';
import { IconComponent } from '../../../icons';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'm-map-status-change-notification',
  template: `
    <div class="notification-card-title">
      <m-icon icon="forward" class="notification-type-icon" />
      <p>A Map Changed Status</p>
      <button type="button" class="dismiss-button" (click)="dismiss.emit()">
        <m-icon icon="close" />
      </button>
    </div>
    <div class="notification-card-main">
      <p>
        <a
          [routerLink]="'/maps/' + notification().map.name"
          class="font-bold link"
          >{{ notification().map.name }}</a
        >
        went from
        <span [ngClass]="statusColorClass(notification().oldStatus)">{{
          MapStatusName.get(notification().oldStatus)
        }}</span>
        to
        <span [ngClass]="statusColorClass(notification().newStatus)">{{
          MapStatusName.get(notification().newStatus)
        }}</span>
      </p>
    </div>
  `,
  host: { class: 'notification-card' },
  imports: [NgClass, RouterLink, IconComponent]
})
export class MapStatusChangeNotificationComponent {
  protected readonly MapStatusName = MapStatusName;

  notification = input.required<MapStatusChangeNotification>();

  dismiss = output();

  statusColorClass(status: MapStatus) {
    switch (status) {
      default:
        return '';
    }
  }
}
