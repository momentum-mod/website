import { Component, Input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TwitchStream } from '@momentum/constants';
import { IconComponent } from '../../../../icons';
import { TooltipDirective } from '../../../../directives/tooltip.directive';
import { TimeAgoPipe } from '../../../../pipes/time-ago.pipe';

@Component({
  selector: 'm-twitch-data',
  templateUrl: './twitch-data.component.html',
  styleUrls: ['./twitch-data.component.css'],
  imports: [IconComponent, TooltipDirective, TimeAgoPipe, DecimalPipe]
})
export class TwitchDataComponent {
  @Input() stream: TwitchStream | null = null;

  get thumbnailUrl(): string {
    return this.stream?.thumbnail_url
      ? this.stream.thumbnail_url
          .replace('{width}', '640')
          .replace('{height}', '360')
      : '';
  }

  get streamUrl(): string {
    return this.stream
      ? `https://twitch.tv/${this.stream.user_login || this.stream.user_name}`
      : '#';
  }

  getImage(): string {
    return this.thumbnailUrl || 'NULL';
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
    return this.streamUrl;
  }
}
