import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import {
  Gamemode,
  GamemodeName,
  MMap,
  TrackType,
  MapStatusName
} from '@momentum/constants';
import { MessageService } from 'primeng/api';
import { CarouselModule } from 'primeng/carousel';
import { LocalUserService } from '../../services';
import { SharedModule } from '../../shared.module';
import { AvatarComponent } from '../avatar/avatar.component';

@Component({
  selector: 'm-map-list-item',
  styleUrl: './map-list-item.component.css',
  templateUrl: './map-list-item.component.html',
  standalone: true,
  imports: [SharedModule, AvatarComponent, CarouselModule]
})
export class MapListItemComponent implements OnInit {
  @Input({ required: true }) map!: MMap;
  @Input() isUpload = false;
  @Input() filterGamemode?: Gamemode;

  @Output() libraryUpdate = new EventEmitter();
  @Output() favoriteUpdate = new EventEmitter();

  inFavorites: boolean;
  status = '';
  modes: Array<{
    gamemodeName: string;
    tier?: number;
    ranked?: boolean;
    bonuses: number;
  }> = [];

  constructor(
    private readonly localUserService: LocalUserService,
    private readonly messageService: MessageService
  ) {}

  ngOnInit() {
    // This isn't well-documented (or designed), but `favorites` here is an
    // of MapFavorite entries that match the LU id. So if > 0, user has it
    // favourited.
    this.inFavorites = this.map.favorites.length > 0;
    this.status = MapStatusName.get(this.map.status as any);

    for (const { gamemode, tier, trackType, ranked } of this.map.leaderboards) {
      if (this.filterGamemode && gamemode !== this.filterGamemode) continue;

      const gamemodeName = GamemodeName.get(gamemode);
      let entry = this.modes.find((e) => e.gamemodeName === gamemodeName);

      if (!entry) {
        entry = { gamemodeName, bonuses: 0 };
        this.modes.push(entry);
      }

      if (trackType === TrackType.MAIN) {
        entry.tier = tier;
        entry.ranked = ranked;
      } else if (trackType === TrackType.BONUS) {
        entry.bonuses++;
      }
    }

    // Try to guess at what mode the map is primarily intended for: if no tier,
    // it has no main track, only bonuses (impossible to have stages but no main
    // track), so rank stuff with main track higher. Then rank higher if it's
    // ranked, or has more bonuses.
    this.modes.sort((a, b) =>
      (a.tier !== undefined && b.tier === undefined) ||
      (a.ranked && !b.ranked) ||
      a.bonuses > b.bonuses
        ? -1
        : 0
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
}
