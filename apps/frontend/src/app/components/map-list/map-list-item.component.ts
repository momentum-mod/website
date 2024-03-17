import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges
} from '@angular/core';
import {
  GamemodeIcon,
  GamemodeName,
  LeaderboardType,
  MapCreditType,
  MapStatusName,
  MapStatus,
  MMap
} from '@momentum/constants';
import { MessageService } from 'primeng/api';
import { CarouselModule } from 'primeng/carousel';
import { LocalUserService } from '../../services';
import { AvatarComponent } from '../';
import { MapWithSpecificLeaderboard } from '../../util';
import { RouterLink } from '@angular/router';
import { extractPrefixFromMapName } from '@momentum/util-fn';
import { PluralPipe, TimeAgoPipe } from '../../pipes';
import { TooltipDirective } from '../../directives';
import { FontSizeLerpDirective } from '../../directives/font-size-lerp.directive';
import { IconComponent } from '../../icons';

@Component({
  selector: 'm-map-list-item',
  templateUrl: './map-list-item.component.html',
  standalone: true,
  imports: [
    AvatarComponent,
    CarouselModule,
    RouterLink,
    TimeAgoPipe,
    PluralPipe,
    TooltipDirective,
    FontSizeLerpDirective,
    IconComponent
  ]
})
export class MapListItemComponent implements OnChanges {
  protected readonly GamemodeIcon = GamemodeIcon;
  protected readonly GamemodeName = GamemodeName;
  protected readonly LeaderboardType = LeaderboardType;
  protected readonly MapStatusName = MapStatusName;
  protected readonly MapStatus = MapStatus;

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

  constructor(
    private readonly localUserService: LocalUserService,
    private readonly messageService: MessageService
  ) {}

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
      ...(this.map.submission?.placeholders ?? [])
    ]
      .filter(({ type }) => type === MapCreditType.AUTHOR)
      .map((credit) =>
        'userID' in credit
          ? { alias: credit.user.alias, id: credit.userID }
          : { alias: credit.alias }
      );
  }

  toggleMapInFavorites() {
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
        error: (error) =>
          this.messageService.add({
            summary: 'Failed to remove map from favorites',
            detail: error.message
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
        error: (error) =>
          this.messageService.add({
            severity: 'error',
            summary: 'Failed to add map to favorites',
            detail: error.message
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
