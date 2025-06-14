import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject
} from '@angular/core';
import {
  GamemodeInfo,
  LeaderboardType,
  MapCreditType,
  MapStatusName,
  MapStatus,
  MMap,
  MapTag,
  mapTagEnglishName,
  MapStatuses
} from '@momentum/constants';
import { MessageService } from 'primeng/api';
import { MapWithSpecificLeaderboard } from '../../util';
import { extractPrefixFromMapName } from '@momentum/util-fn';
import { FontSizeLerpDirective } from '../../directives/font-size-lerp.directive';

import { LocalUserService } from '../../services/data/local-user.service';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AsyncPipe, NgClass, NgStyle } from '@angular/common';
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
    AsyncPipe,
    TimeAgoPipe,
    PluralPipe
  ]
})
export class MapListItemComponent implements OnChanges {
  protected readonly localUserService = inject(LocalUserService);
  private readonly messageService = inject(MessageService);

  protected readonly GamemodeInfo = GamemodeInfo;
  protected readonly LeaderboardType = LeaderboardType;
  protected readonly MapStatusName = MapStatusName;
  protected readonly MapStatus = MapStatus;
  protected readonly mapTagEnglishName = mapTagEnglishName;

  @Input({ required: true }) map!: MMap | MapWithSpecificLeaderboard;
  @Input() isSubmission = false;
  @Input() isAdminPage = false;

  @Output() favoriteUpdate = new EventEmitter();

  inFavorites: boolean;
  statusName = '';
  authors: Array<{ id?: number; alias: string }>;
  name: string;
  prefix: string;
  tierStyle: string;
  tags: MapTag[];

  ngOnChanges(changes: SimpleChanges) {
    if (!changes['map']) return;

    // This isn't well-documented (or designed), but `favorites` here is an
    // of MapFavorite entries that match the LU id. So if > 0, user has it
    // favourited.
    this.inFavorites = this.map.favorites?.length > 0;
    this.statusName = MapStatusName.get(this.map.status as any);

    const [name, prefix] = extractPrefixFromMapName(this.map.name);
    this.name = name;
    this.prefix = prefix;
    this.authors = [
      ...this.map.credits,
      ...(MapStatuses.IN_SUBMISSION.includes(this.map.status)
        ? (this.map.submission?.placeholders ?? [])
        : [])
    ]
      .filter(({ type }) => type === MapCreditType.AUTHOR)
      .map((credit) =>
        'userID' in credit
          ? { alias: credit.user.alias, id: credit.userID }
          : { alias: credit.alias }
      );
  }

  toggleMapInFavorites(event?: Event) {
    event?.stopPropagation();
    event?.preventDefault();
    if (this.inFavorites) {
      this.localUserService.removeMapFromFavorites(this.map.id).subscribe({
        next: () => {
          this.inFavorites = false;
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
      this.localUserService.addMapToFavorites(this.map.id).subscribe({
        next: () => {
          this.inFavorites = true;
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
    return !this.isSubmission;
  }

  protected isSubmitterAnAuthor(map: MMap) {
    return map.credits.some(
      ({ userID, type }) =>
        userID === map.submitterID && type === MapCreditType.AUTHOR
    );
  }
}
