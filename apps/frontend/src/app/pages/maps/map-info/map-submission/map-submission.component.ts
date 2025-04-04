import { Component, Input } from '@angular/core';
import {
  MMap,
  MapSubmissionType,
  MapStatusName,
  TrackType,
  LeaderboardType,
  GamemodeInfo,
  MapVersion,
  mapTagEnglishName
} from '@momentum/constants';

import {
  GroupedMapSubmissionSuggestions,
  groupMapSuggestions
} from '../../../../util/grouped-map-suggestions.util';
import { downloadZoneFile } from '../../../../util/download-zone-file.util';
import { MapReviewListComponent } from '../../../../components/map-review/map-review-list.component';
import { SubmissionTypeInfoComponent } from '../../../../components/tooltips/submission-type-info.component';
import { PluralPipe } from '../../../../pipes/plural.pipe';
import { TooltipDirective } from '../../../../directives/tooltip.directive';
import { IconComponent } from '../../../../icons';
import { UserComponent } from '../../../../components/user/user.component';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { UnsortedKeyvaluePipe } from '../../../../pipes/unsorted-keyvalue.pipe';
import { MapsService } from '../../../../services/data/maps.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'm-map-submission',
  templateUrl: 'map-submission.component.html',
  imports: [
    MapReviewListComponent,
    PluralPipe,
    TooltipDirective,
    IconComponent,
    UserComponent,
    TitleCasePipe,
    UnsortedKeyvaluePipe,
    DatePipe,
    SubmissionTypeInfoComponent
  ]
})
export class MapSubmissionComponent {
  protected readonly MapSubmissionType = MapSubmissionType;
  protected readonly TrackType = TrackType;
  protected readonly LeaderboardType = LeaderboardType;
  protected readonly GamemodeInfo = GamemodeInfo;
  protected readonly MapStatusName = MapStatusName;
  protected readonly downloadZoneFile = downloadZoneFile;
  protected readonly mapTagEnglishName = mapTagEnglishName;

  protected suggestions: GroupedMapSubmissionSuggestions;
  protected versions: MapVersion[];
  protected visibleVersions: number;
  protected hasComments = false;

  constructor(private readonly mapService: MapsService) {}

  private _map: MMap;
  get map() {
    return this._map;
  }
  @Input({ required: true }) set map(map: MMap) {
    this._map = map;
    this.suggestions = groupMapSuggestions(map.submission.suggestions);
    this.versions = map?.versions.sort(
      (v1, v2) => v2.versionNum - v1.versionNum
    );
    this.visibleVersions = 2;
    this.hasComments = [...this.suggestions.values()]
      .map((v) => [...v.values()])
      .flat(2)
      .some(({ comment }) => comment);
  }

  // Since most of the times users won't need to download older
  // zones we'd rather not load them while showing map info,
  // and in case user needs this, instead of fetching all versions
  // every time for a single version zones we cache them here
  private mapWithVersionsZones?: MMap;
  async downloadOlderZoneFile(versionId: string) {
    if (!this.mapWithVersionsZones) {
      this.mapWithVersionsZones = await firstValueFrom(
        this.mapService.getMap(this._map.id, { expand: ['versionsWithZones'] })
      );
    }

    const version = this.mapWithVersionsZones.versions.find(
      (v) => v.id === versionId
    );
    if (!version || !version.zones) {
      console.error('Bad version id, could not find version with zones');
      return;
    }

    downloadZoneFile(this.mapWithVersionsZones, version.id);
  }
}
