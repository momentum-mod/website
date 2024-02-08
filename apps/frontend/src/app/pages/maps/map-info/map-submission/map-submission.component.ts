import { Component, Input } from '@angular/core';
import {
  MMap,
  MapSubmissionType,
  MapStatusNameNew,
  MapSubmissionSuggestion,
  GamemodeName,
  TrackType,
  GamemodeIcon,
  MapSubmissionVersion
} from '@momentum/constants';
import { SharedModule } from '../../../../shared.module';
import { AvatarComponent } from '../../../../components';
import { MapSubmissionTypeInfoComponent } from '../../../../components/tooltips/map-submission-type-tooltip.component';
import {
  GroupedMapSubmissionSuggestions,
  groupMapSuggestions
} from '../../../../util/grouped-map-suggestions.util';
import { PluralPipe, UnsortedKeyvaluePipe } from '../../../../pipes';
import { UserComponent } from '../../../../components/user/user.component';
import { MapReviewListComponent } from '../../../../components/map-review/map-review-list.component';

@Component({
  selector: 'm-map-submission',
  templateUrl: 'map-submission.component.html',
  standalone: true,
  imports: [
    SharedModule,
    AvatarComponent,
    MapSubmissionTypeInfoComponent,
    UnsortedKeyvaluePipe,
    UserComponent,
    MapReviewListComponent,
    PluralPipe
  ]
})
export class MapSubmissionComponent {
  protected readonly MapSubmissionType = MapSubmissionType;
  protected readonly TrackType = TrackType;
  protected readonly GamemodeName = GamemodeName;
  protected readonly MapStatusName = MapStatusNameNew;
  protected readonly GamemodeIcon = GamemodeIcon;

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
