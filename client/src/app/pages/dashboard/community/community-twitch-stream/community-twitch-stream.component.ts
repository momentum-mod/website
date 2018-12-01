import { Component, OnInit } from '@angular/core';
import {TwitchAPIService} from '../../../../@core/data/twitch-api.service';
import {finalize} from 'rxjs/operators';
import {TwitchStream} from '../../../../@core/models/twitch-stream.model';
import {TwitchVideo} from '../../../../@core/models/twitch-video.model';


@Component({
  selector: 'community-twitch-stream',
  templateUrl: './community-twitch-stream.component.html',
  styleUrls: ['./community-twitch-stream.component.scss'],
})
export class CommunityTwitchStreamComponent implements OnInit {

  streams: TwitchStream[];
  videos: TwitchVideo[];
  queriedStreams: boolean;
  queriedVideos: boolean;
  constructor(private twitchAPI: TwitchAPIService) {
    this.streams = [];
    this.videos = [];
    this.queriedStreams = false;
    this.queriedVideos = false;
  }

  ngOnInit() {
    this.twitchAPI.getGameStreams()
      .pipe(finalize(() => this.queriedStreams = true))
      .subscribe(resp => {
        this.streams = resp.data;
      });
    this.twitchAPI.getGameVideos()
      .pipe(finalize(() => this.queriedVideos = true))
      .subscribe(resp => {
        this.videos = resp.videos; // resp.data; TODO uncomment when new twitch API works
      });
  }

}
