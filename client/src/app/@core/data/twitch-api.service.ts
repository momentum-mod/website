import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {HttpClient, HttpHeaders} from '@angular/common/http';

@Injectable()
export class TwitchAPIService {
  private readonly baseURL: string;
  private readonly clientID: string;
  private readonly gameID: string;
  private readonly headers: HttpHeaders;
  constructor(private http: HttpClient) {
    this.baseURL = 'https://api.twitch.tv/helix';
    this.clientID = '5aerrhj5xm0lgbrpdjw50wjh6pnmbc';
    this.gameID = '492973';
    this.headers = new HttpHeaders({
      'Client-ID': this.clientID,
    });
  }

  public getGameStreams(): Observable<any> {
    return this.http.get(this.baseURL + '/streams?game_id=' + this.gameID, {headers: this.headers});
  }

  public isUserLive(userID: string): Observable<any> {
    return this.http.get(this.baseURL + '/streams?game_id=' + this.gameID + '&user_id=' + userID,
      {headers: this.headers});
  }

  public getGameVideos(): Observable<any> {
    return this.http.get(
      'https://api.twitch.tv/kraken/videos/top?game=Momentum Mod&sort=time&broadcast_type=all&period=all&limit=8',
      {headers: this.headers});
    // TODO: uncomment the below when Twitch's new API actually returns proper data
    // return this.http.get(this.baseURL + '/videos?game_id=' + this.gameID, {headers: this.headers});
  }
}
