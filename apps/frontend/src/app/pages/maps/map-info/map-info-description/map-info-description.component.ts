import { Component, Input, OnInit } from '@angular/core';
import {
  Gamemode,
  GamemodeName,
  Leaderboard,
  MMap,
  TrackType
} from '@momentum/constants';
import { SharedModule } from '../../../../shared.module';

@Component({
  selector: 'm-map-info-description',
  templateUrl: './map-info-description.component.html',
  standalone: true,
  imports: [SharedModule]
})
export class MapInfoDescriptionComponent implements OnInit {
  protected readonly GamemodeName = GamemodeName;
  protected readonly TrackType = TrackType;

  @Input() map: MMap;
  sortedLeaderboards: Map<Gamemode, Map<TrackType, Leaderboard[]>> = new Map();

  ngOnInit(): void {
    for (const lb of this.map.leaderboards) {
      if (!this.sortedLeaderboards.get(lb.gamemode)) {
        this.sortedLeaderboards.set(
          lb.gamemode,
          new Map([
            [TrackType.MAIN, []],
            [TrackType.STAGE, []],
            [TrackType.BONUS, []]
          ])
        );
      }

      this.sortedLeaderboards.get(lb.gamemode).get(lb.trackType).push(lb);
    }
  }
}
