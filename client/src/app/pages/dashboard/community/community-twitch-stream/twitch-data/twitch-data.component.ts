import {Component, Input, OnInit} from '@angular/core';
import {TwitchStream} from '../../../../../@core/models/twitch-stream.model';
import {TwitchVideo} from '../../../../../@core/models/twitch-video.model';

@Component({
  selector: 'twitch-data',
  templateUrl: './twitch-data.component.html',
  styleUrls: ['./twitch-data.component.scss'],
})
export class TwitchDataComponent implements OnInit {

  @Input('stream') stream: TwitchStream;
  @Input('vod') vod: TwitchVideo;
  constructor() {
    this.stream = null;
    this.vod = null;
  }

  ngOnInit() {
  }
  getImage(): string {
    return this.stream ? this.stream.thumbnail_url.replace('{width}', '300').replace('{height}', '200')
      : (this.vod ? this.vod.preview : 'NULL');
  }

  getUserName(): string {
    return this.stream ? this.stream.user_name : (this.vod ? this.vod.channel.display_name : 'NULL');
  }

  getTitle(): string {
    return this.stream ? this.stream.title : (this.vod ? this.vod.title : 'NULL');
  }

  getViewCount(): string {
    return this.stream ? `${this.stream.viewer_count} viewers` : (this.vod ? `${this.vod.views} views` : 'NULL');
  }

  getURL(): string {
    return this.stream ? `https://twitch.tv/${this.stream.user_name}` : (this.vod ? this.vod.url : 'NULL');
  }
}
