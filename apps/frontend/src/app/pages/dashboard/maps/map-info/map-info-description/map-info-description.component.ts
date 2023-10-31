import { Component, Input, OnInit } from '@angular/core';
import {
  Gamemode,
  GamemodeName,
  Leaderboard,
  MMap,
  TrackType
} from '@momentum/constants';

@Component({
  selector: 'mom-map-info-description',
  templateUrl: './map-info-description.component.html',
  styleUrls: ['./map-info-description.component.scss']
})
export class MapInfoDescriptionComponent implements OnInit {
  protected readonly GamemodeName = GamemodeName;
  protected readonly TrackType = TrackType;

  @Input() map: MMap;
  sortedLeaderboards: Map<Gamemode, Map<TrackType, Leaderboard[]>> = new Map();

  ngOnInit(): void {
    console.log(this.map);
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
