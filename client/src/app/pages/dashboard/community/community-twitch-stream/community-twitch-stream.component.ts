import { Component, OnInit } from '@angular/core';
import { TwitchAPIService } from '../../../../@core/data/twitch-api.service';
import { finalize } from 'rxjs/operators';
import { TwitchStream } from '../../../../@core/models/twitch-stream.model';

@Component({
  selector: 'community-twitch-stream',
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
      .subscribe((resp) => {
        this.streams = resp.data;
      });
  }
}
