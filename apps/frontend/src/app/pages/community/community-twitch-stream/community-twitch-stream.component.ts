import { Component, OnInit, inject, signal } from '@angular/core';
import { TwitchStream } from '@momentum/constants';
import { finalize } from 'rxjs/operators';
import { TwitchDataComponent } from './twitch-data/twitch-data.component';
import { TwitchAPIService } from '../../../services/data/twitch-api.service';
import { CardComponent } from '../../../components/card/card.component';
import { IconComponent } from '../../../icons';

@Component({
  selector: 'm-community-twitch-stream',
  templateUrl: './community-twitch-stream.component.html',
  imports: [TwitchDataComponent, CardComponent, IconComponent]
})
export class CommunityTwitchStreamComponent implements OnInit {
  private readonly twitchAPI = inject(TwitchAPIService);

  readonly streams = signal<TwitchStream[]>([]);
  readonly queriedStreams = signal(false);

  ngOnInit() {
    this.twitchAPI
      .getGameStreams()
      .pipe(finalize(() => this.queriedStreams.set(true)))
      .subscribe((response) => this.streams.set(response?.data ?? []));
  }
}
