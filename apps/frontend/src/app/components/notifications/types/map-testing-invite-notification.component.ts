import { Component, inject, input, output } from '@angular/core';
import { MapTestingInviteNotification } from '@momentum/constants';
import { IconComponent } from '../../../icons';
import { RouterLink } from '@angular/router';
import { MapsService } from '../../../services/data/maps.service';
import { finalize, take, tap } from 'rxjs';
import { MessageService } from 'primeng/api';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'm-map-testing-invite-notification',
  template: `
    <div class="notification-card-title">
      <m-icon icon="email-alert" class="notification-type-icon" />
      <p>Private Testing Invitation!</p>
    </div>
    <div class="notification-card-main">
      <p>
        <a
          [routerLink]="'/profile/' + notification().invitedBy.id"
          class="link "
          >{{ notification().invitedBy.alias }}</a
        >
        has invited you to playtest
        <span class="font-medium">{{ notification().map.name }}</span>
      </p>
      <div class="flex gap-2 pt-3">
        <button
          type="button"
          class="py-1 btn btn-green"
          (click)="acceptsInvitation(true)"
        >
          Accept
        </button>
        <button
          type="button"
          class="py-1 btn btn-red"
          (click)="acceptsInvitation(false)"
        >
          Reject
        </button>
      </div>
    </div>
  `,
  host: { class: 'notification-card' },
  imports: [RouterLink, IconComponent]
})
export class MapTestingInviteNotificationComponent {
  private readonly mapsService = inject(MapsService);
  private readonly messageService = inject(MessageService);

  notification = input.required<MapTestingInviteNotification>();

  shouldBeLoading = output<boolean>();
  refreshNotifications = output();

  acceptsInvitation(accepts: boolean) {
    this.mapsService
      .submitMapTestInviteResponse(this.notification().map.id, {
        accept: accepts
      })
      .pipe(
        take(1),
        tap(() => this.shouldBeLoading.emit(true)),
        // Rely on parent component setting loading to false once fetch is done
        // instead of here in a finalize(), to avoid possible race condition.
        finalize(() => this.refreshNotifications.emit())
      )
      .subscribe({
        next: () =>
          this.messageService.add({
            severity: 'success',
            summary: 'Invitation Response Sent!',
            detail:
              'You ' + (accepts ? 'Accepted' : 'Rejected') + ' the invitation'
          }),
        error: (httpError: HttpErrorResponse) =>
          this.messageService.add({
            severity: 'error',
            summary: 'Invitation Response Failed to Send!',
            detail: 'Failed with message: ' + httpError.error.message
          })
      });
  }
}
