import { Component, OnInit } from '@angular/core';
import { LocalUserService } from '@momentum/frontend/data';
import { Ban } from '@momentum/constants';
import { MapListComponent } from '../map-list/map-list.component';
import { SharedModule } from '../../../shared.module';

@Component({
  selector: 'm-map-submission-status',
  templateUrl: './map-submission-status.component.html',
  standalone: true,
  imports: [SharedModule, MapListComponent]
})
export class MapSubmissionStatusComponent implements OnInit {
  constructor(private readonly localUserService: LocalUserService) {}

  hasSubmissionBan: boolean;
  ngOnInit() {
    this.hasSubmissionBan = this.localUserService.hasBan(Ban.MAP_SUBMISSION);
  }
}
