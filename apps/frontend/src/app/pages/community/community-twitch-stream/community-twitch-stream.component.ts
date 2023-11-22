import { Component, OnInit } from '@angular/core';
import { TwitchAPIService } from '@momentum/frontend/data';
import { TwitchStream } from '@momentum/constants';
import { finalize } from 'rxjs/operators';
import { TwitchDataComponent } from './twitch-data/twitch-data.component';
import { NgIf, NgFor } from '@angular/common';
import { NbCardModule } from '@nebular/theme';

@Component({
  selector: 'mom-community-twitch-stream',
  templateUrl: './community-twitch-stream.component.html',
  styleUrls: ['./community-twitch-stream.component.scss'],
  standalone: true,
  imports: [NbCardModule, NgIf, NgFor, TwitchDataComponent]
})
export class CommunityTwitchStreamComponent implements OnInit {
  streams: TwitchStream[];
  queriedStreams: boolean;
  queriedVideos: boolean;
  constructor(private twitchAPI: TwitchAPIService) {
    this.streams = [];
    this.queriedStreams = false;
    this.queriedVideos = false;
  }

  ngOnInit() {
    this.twitchAPI
      .getGameStreams()
      .pipe(finalize(() => (this.queriedStreams = true)))
      .subscribe((response) => (this.streams = response.data));
  }
}
