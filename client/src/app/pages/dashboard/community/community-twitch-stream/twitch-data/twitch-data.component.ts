import { Component, Input, OnInit } from '@angular/core';
import { TwitchStream } from '../../../../../@core/models/twitch-stream.model';

@Component({
  selector: 'twitch-data',
  templateUrl: './twitch-data.component.html',
  styleUrls: ['./twitch-data.component.scss']
})
export class TwitchDataComponent implements OnInit {
  @Input() stream: TwitchStream;
  constructor() {
    this.stream = null;
  }

  ngOnInit() {}
  getImage(): string {
    return this.stream
      ? this.stream.thumbnail_url
          .replace('{width}', '300')
          .replace('{height}', '200')
      : 'NULL';
  }

  getUserName(): string {
    return this.stream ? this.stream.user_name : 'NULL';
  }

  getTitle(): string {
    return this.stream ? this.stream.title : 'NULL';
  }

  getViewCount(): string {
    return this.stream ? `${this.stream.viewer_count} viewers` : 'NULL';
  }

  getURL(): string {
    return this.stream ? `https://twitch.tv/${this.stream.user_name}` : 'NULL';
  }
}
