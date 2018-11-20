import { Component, OnInit } from '@angular/core';
import {TwitchAPIService} from '../../../../@core/data/twitch-api.service';
import {finalize} from 'rxjs/operators';


@Component({
  selector: 'community-twitch-stream',
  templateUrl: './community-twitch-stream.component.html',
  styleUrls: ['./community-twitch-stream.component.scss'],
})
export class CommunityTwitchStreamComponent implements OnInit {

  streams: any[];
  videos: any[];
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
        this.videos = resp.data;
      });
  }

}
