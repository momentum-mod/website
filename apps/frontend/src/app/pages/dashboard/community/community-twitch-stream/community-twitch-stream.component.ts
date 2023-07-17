import { Component, OnInit } from '@angular/core';
import { TwitchAPIService } from '@momentum/frontend/data';
import { TwitchStream } from '@momentum/constants';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'mom-community-twitch-stream',
  templateUrl: './community-twitch-stream.component.html',
  styleUrls: ['./community-twitch-stream.component.scss']
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
