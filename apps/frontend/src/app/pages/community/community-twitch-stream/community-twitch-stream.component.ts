import { Component, OnInit } from '@angular/core';
import { TwitchStream } from '@momentum/constants';
import { finalize } from 'rxjs/operators';
import { SharedModule } from '../../../shared.module';
import { TwitchDataComponent } from './twitch-data/twitch-data.component';
import { TwitchAPIService } from '../../../services/data/twitch-api.service';

@Component({
  selector: 'm-community-twitch-stream',
  templateUrl: './community-twitch-stream.component.html',
  imports: [SharedModule, TwitchDataComponent]
})
export class CommunityTwitchStreamComponent implements OnInit {
  streams: TwitchStream[] = [];
  queriedStreams = false;

  constructor(private readonly twitchAPI: TwitchAPIService) {}

  ngOnInit() {
    this.twitchAPI
      .getGameStreams()
      .pipe(finalize(() => (this.queriedStreams = true)))
      .subscribe((response) => (this.streams = response.data));
  }
}
