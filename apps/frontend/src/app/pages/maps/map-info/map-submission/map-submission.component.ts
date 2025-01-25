import { Component, Input } from '@angular/core';
import {
  MMap,
  MapSubmissionType,
  MapStatusName,
  TrackType,
  LeaderboardType,
  GamemodeInfo,
  MapVersion
} from '@momentum/constants';
import { SharedModule } from '../../../../shared.module';
import {
  GroupedMapSubmissionSuggestions,
  groupMapSuggestions
} from '../../../../util/grouped-map-suggestions.util';
import { downloadZoneFile } from '../../../../util/download-zone-file.util';
import { MapReviewListComponent } from '../../../../components/map-review/map-review-list.component';
import { SubmissionTypeInfoComponent } from '../../../../components/tooltips/submission-type-info.component';

@Component({
  selector: 'm-map-submission',
  templateUrl: 'map-submission.component.html',
  imports: [SharedModule, MapReviewListComponent, SubmissionTypeInfoComponent]
})
export class MapSubmissionComponent {
  protected readonly MapSubmissionType = MapSubmissionType;
  protected readonly TrackType = TrackType;
  protected readonly LeaderboardType = LeaderboardType;
  protected readonly GamemodeInfo = GamemodeInfo;
  protected readonly MapStatusName = MapStatusName;
  protected readonly downloadZoneFile = downloadZoneFile;

  protected suggestions: GroupedMapSubmissionSuggestions;
  protected versions: MapVersion[];
  protected visibleVersions: number;

  private _map: MMap;
  get map() {
    return this._map;
  }
  @Input({ required: true }) set map(map: MMap) {
    this._map = map;
    this.suggestions = groupMapSuggestions(map.submission.suggestions);
    this.versions = map?.versions.toReversed();
    this.visibleVersions = 2;
  }
}
