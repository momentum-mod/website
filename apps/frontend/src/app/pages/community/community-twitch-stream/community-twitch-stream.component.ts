import { Component, OnInit, inject } from '@angular/core';
import { TwitchStream } from '@momentum/constants';
import { finalize } from 'rxjs/operators';

import { TwitchDataComponent } from './twitch-data/twitch-data.component';
import { TwitchAPIService } from '../../../services/data/twitch-api.service';
import { CardComponent } from '../../../components/card/card.component';

@Component({
  selector: 'm-community-twitch-stream',
  templateUrl: './community-twitch-stream.component.html',
  imports: [TwitchDataComponent, CardComponent]
})
export class CommunityTwitchStreamComponent implements OnInit {
  private readonly twitchAPI = inject(TwitchAPIService);

  streams: TwitchStream[] = [];
  queriedStreams = false;

  ngOnInit() {
    this.twitchAPI
      .getGameStreams()
      .pipe(finalize(() => (this.queriedStreams = true)))
      .subscribe((response) => (this.streams = response.data));
  }
}
