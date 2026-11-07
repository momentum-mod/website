import {
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  output
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  GamemodeInfo,
  LeaderboardType,
  MapCreditType,
  MapStatusName,
  MapStatus,
  MMap,
  mapTagEnglishName,
  MapStatuses
} from '@momentum/constants';
import { MessageService } from '@openng/optimus-ui/api';
import { MapWithSpecificLeaderboard } from '../../util';
import { extractPrefixFromMapName } from '@momentum/util-fn';
import { FontSizeLerpDirective } from '../../directives/font-size-lerp.directive';
import { LocalUserService } from '../../services/data/local-user.service';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { NgClass, NgStyle } from '@angular/common';
import { TooltipDirective } from '../../directives/tooltip.directive';
import { IconComponent } from '../../icons';
import { TimeAgoPipe } from '../../pipes/time-ago.pipe';
import { PluralPipe } from '../../pipes/plural.pipe';

@Component({
  selector: 'm-map-list-item',
  templateUrl: './map-list-item.component.html',
  imports: [
    FontSizeLerpDirective,
    RouterLink,
    NgClass,
    TooltipDirective,
    IconComponent,
    NgStyle,
    TimeAgoPipe,
    PluralPipe
  ]
})
export class MapListItemComponent {
  protected readonly localUserService = inject(LocalUserService);
  private readonly messageService = inject(MessageService);

  protected readonly GamemodeInfo = GamemodeInfo;
  protected readonly LeaderboardType = LeaderboardType;
  protected readonly MapStatusName = MapStatusName;
  protected readonly MapStatus = MapStatus;
  protected readonly mapTagEnglishName = mapTagEnglishName;

  readonly map = input.required<MMap | MapWithSpecificLeaderboard>();
  readonly isSubmission = input(false);
  readonly isAdminPage = input(false);
  readonly showApprovedDate = input(false);

  readonly favoriteUpdate = output<boolean>();

  protected readonly user = toSignal(this.localUserService.user);

  // This isn't well-documented (or designed), but `favorites` here is an
  // of MapFavorite entries that match the LU id. So if > 0, user has it
  // favourited. Toggled locally, reset when the map input changes.
  protected readonly inFavorites = linkedSignal(
    () => this.map().favorites?.length > 0
  );

  private readonly nameParts = computed(() =>
    extractPrefixFromMapName(this.map().name)
  );
  protected readonly name = computed(() => this.nameParts()[0]);
  protected readonly prefix = computed(() => this.nameParts()[1]);

  protected readonly authors = computed<Array<{ id?: number; alias: string }>>(
    () => {
      const map = this.map();
      return [
        ...map.credits,
        ...(MapStatuses.IN_SUBMISSION.includes(map.status) ||
        map.status === MapStatus.DISABLED
          ? (map.submission?.placeholders ?? [])
          : [])
      ]
        .filter(({ type }) => type === MapCreditType.AUTHOR)
        .map((credit) =>
          'userID' in credit
            ? { alias: credit.user.alias, id: credit.userID }
            : { alias: credit.alias }
        );
    }
  );

  toggleMapInFavorites(event?: Event) {
    event?.stopPropagation();
    event?.preventDefault();
    if (this.inFavorites()) {
      this.localUserService.removeMapFromFavorites(this.map().id).subscribe({
        next: () => {
          this.inFavorites.set(false);
          this.favoriteUpdate.emit(false);
          this.messageService.add({
            severity: 'success',
            detail: 'Removed map from favorites'
          });
        },
        error: (httpError: HttpErrorResponse) =>
          this.messageService.add({
            summary: 'Failed to remove map from favorites',
            detail: httpError.error.message
          })
      });
    } else {
      this.localUserService.addMapToFavorites(this.map().id).subscribe({
        next: () => {
          this.inFavorites.set(true);
          this.favoriteUpdate.emit(true);
          this.messageService.add({
            severity: 'success',
            detail: 'Added map to favorites'
          });
        },
        error: (httpError: HttpErrorResponse) =>
          this.messageService.add({
            severity: 'error',
            summary: 'Failed to add map to favorites',
            detail: httpError.error.message
          })
      });
    }
  }

  protected isReleasedMap(
    _map: MMap | MapWithSpecificLeaderboard
  ): _map is MapWithSpecificLeaderboard {
    return !this.isSubmission();
  }

  protected isSubmitterAnAuthor(map: MMap) {
    return map.credits.some(
      ({ userID, type }) =>
        userID === map.submitterID && type === MapCreditType.AUTHOR
    );
  }
}
