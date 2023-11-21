import { Component, OnInit } from '@angular/core';
import { LocalUserService } from '@momentum/frontend/data';
import { Ban } from '@momentum/constants';

@Component({
  selector: 'mom-map-submission-status',
  templateUrl: './map-submission-status.component.html'
})
export class MapSubmissionStatusComponent implements OnInit {
  constructor(private readonly localUserService: LocalUserService) {}

  hasSubmissionBan: boolean;
  ngOnInit() {
    this.hasSubmissionBan = this.localUserService.hasBan(Ban.MAP_SUBMISSION);
  }
}
