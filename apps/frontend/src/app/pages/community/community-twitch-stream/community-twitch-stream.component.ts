import { Component, OnInit } from '@angular/core';
import { TwitchAPIService } from '../../../services';
import { TwitchStream } from '@momentum/constants';
import { finalize } from 'rxjs/operators';
import { TwitchDataComponent } from './twitch-data/twitch-data.component';
import { SharedModule } from '../../../shared.module';

@Component({
  selector: 'm-community-twitch-stream',
  templateUrl: './community-twitch-stream.component.html',
  standalone: true,
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
