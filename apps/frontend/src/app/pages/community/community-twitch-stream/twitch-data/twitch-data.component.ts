import { Component, computed, input } from '@angular/core';
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
  readonly stream = input<TwitchStream | null>(null);

  readonly thumbnailUrl = computed(() => {
    const url = this.stream()?.thumbnail_url;
    return url ? url.replace('{width}', '640').replace('{height}', '360') : '';
  });

  readonly streamUrl = computed(() => {
    const stream = this.stream();
    return stream
      ? `https://twitch.tv/${stream.user_login || stream.user_name}`
      : '#';
  });

  getImage(): string {
    return this.thumbnailUrl() || 'NULL';
  }

  getUserName(): string {
    return this.stream()?.user_name ?? 'NULL';
  }

  getTitle(): string {
    return this.stream()?.title ?? 'NULL';
  }

  getViewCount(): string {
    const stream = this.stream();
    return stream ? `${stream.viewer_count} viewers` : 'NULL';
  }

  getURL(): string {
    return this.streamUrl();
  }
}
