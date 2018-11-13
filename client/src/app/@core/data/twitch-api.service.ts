import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';

@Injectable()
export class TwitchAPIService {
  private baseURL: string = 'https://api.twitch.tv/helix';
  private clientID: string = '5aerrhj5xm0lgbrpdjw50wjh6pnmbc';
  private gameID: string = '492973';
  private readonly options;
  constructor(private http: HttpClient) {
    const headers = new HttpHeaders();
    headers.set('Client-ID', this.clientID);
    this.options = {
      headers: headers,
    };
  }

  public getGameStreams(): Observable<any> {
    const params: HttpParams = new HttpParams();
    params.set('game_id', this.gameID);
    const options = Object.create(this.options);
    options.params = params;
    return this.http.get(this.baseURL + '/streams', options);
  }

  public isUserLive(userID: string): Observable<any> {
    const params: HttpParams = new HttpParams();
    params.set('game_id', this.gameID);
    params.set('user_id', userID);
    const options = Object.create(this.options);
    options.params = params;
    return this.http.get(this.baseURL + '/streams', options);
  }

  public getGameVideos(): Observable<any> {
    const params: HttpParams = new HttpParams();
    params.set('game_id', this.gameID);
    const options = Object.create(this.options);
    options.params = params;
    return this.http.get(this.baseURL + '/videos', options);
  }
}
