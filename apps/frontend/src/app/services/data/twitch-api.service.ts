import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PagedResponse, TwitchStream } from '@momentum/constants';
import { HttpService } from './http.service';

@Injectable({ providedIn: 'root' })
export class TwitchAPIService {
  private http = inject(HttpService);

  public getGameStreams(): Observable<
    PagedResponse<TwitchStream> | { data: any[] }
  > {
    return this.http.get<PagedResponse<TwitchStream>>('twitch/streams');
  }
}
