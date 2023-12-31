import { Component, OnInit } from '@angular/core';
import { LocalUserService } from '../../../services';
import { Ban } from '@momentum/constants';
import { SharedModule } from '../../../shared.module';
import { MapListComponent } from '../../../components';

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
