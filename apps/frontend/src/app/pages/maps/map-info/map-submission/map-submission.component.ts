import { Component, Input } from '@angular/core';
import {
  MMap,
  MapSubmissionType,
  MapStatusName,
  MapSubmissionSuggestion,
  GamemodeName,
  TrackType,
  MapSubmissionVersion,
  LeaderboardType
} from '@momentum/constants';
import { SharedModule } from '../../../../shared.module';
import {
  AvatarComponent,
  UserComponent,
  MapReviewListComponent,
  SubmissionTypeInfoComponent
} from '../../../../components';
import {
  GroupedMapSubmissionSuggestions,
  groupMapSuggestions
} from '../../../../util/grouped-map-suggestions.util';
import { PluralPipe, UnsortedKeyvaluePipe } from '../../../../pipes';
import { downloadZoneFile } from '../../../../util/download-zone-file.util';

@Component({
  selector: 'm-map-submission',
  templateUrl: 'map-submission.component.html',
  standalone: true,
  imports: [
    SharedModule,
    AvatarComponent,
    UnsortedKeyvaluePipe,
    UserComponent,
    MapReviewListComponent,
    PluralPipe,
    SubmissionTypeInfoComponent
  ]
})
export class MapSubmissionComponent {
  protected readonly MapSubmissionType = MapSubmissionType;
  protected readonly TrackType = TrackType;
  protected readonly LeaderboardType = LeaderboardType;
  protected readonly GamemodeName = GamemodeName;
  protected readonly MapStatusName = MapStatusName;
  protected readonly downloadZoneFile = downloadZoneFile;

  protected suggestions: GroupedMapSubmissionSuggestions;
  protected versions: MapSubmissionVersion[];
  protected visibleVersions: number;

  private _map: MMap;
  get map() {
    return this._map;
  }
  @Input({ required: true }) set map(map: MMap) {
    this._map = map;
    this.suggestions = groupMapSuggestions(
      map.submission.suggestions as MapSubmissionSuggestion[] // Cast until I can remove Jsonify<> bullshit
    );
    // @ts-expect-error - we don't have toReversed yet!!
    this.versions = map?.submission?.versions.toReversed();
    this.visibleVersions = 2;
  }
}
