import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
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
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'Client-ID': this.clientID
    });
  }

  public getGameStreams(): Observable<any> {
    return this.http.get(this.baseURL + '/streams?game_id=' + this.gameID, {
      headers: this.headers
    });
  }

  public isUserLive(userID: string): Observable<any> {
    return this.http.get(
      this.baseURL + '/streams?game_id=' + this.gameID + '&user_id=' + userID,
      { headers: this.headers }
    );
  }
}
