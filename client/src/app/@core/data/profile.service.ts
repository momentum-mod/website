import {Injectable} from '@angular/core';
import {Observable, of} from 'rxjs';

export interface UserProfile {
  id: string;
  alias: string;
  avatarURL: string;
  bio?: string;
  twitter?: string;
  discord?: string;
  youtube?: string;
}
@Injectable()
export class ProfileService {
  constructor(/*private http: HttpClient,
              private usrService: LocalUserService*/) {
  }
  private prof: UserProfile = {
    id: '1234',
    alias: 'Gocnak',
    avatarURL: 'https://i.imgur.com/Kt1XMxo.png',
    bio: 'Test this bio shee',
    twitter: 'Gocnak',
    discord: 'Gocnak#1234',
    youtube: 'gocnak',
  };
  getLocalProfile(): Observable<UserProfile> {
    return of(this.prof);
    // return this.getUserProfile(this.usrService.getInfo().id);
  }
  getUserProfile(userID): Observable<UserProfile> {
    return of(this.prof);
    // return this.http.get('/api/users/' + userID + '/profile');
  }
  updateUserProfile(userProfile: UserProfile): Observable<any> {
    return of(userProfile);
    // const httpOptions = {};
    // return this.http.patch('/api/users/' + user.id + '/profile, user, httpOptions);
  }
}
