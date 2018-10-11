import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {HttpClient} from '@angular/common/http';

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
  constructor(private http: HttpClient) {}
  updateUserProfile(userID: string, userProfile: UserProfile): Observable<any> {
    // return of(userProfile);
    const httpOptions = {};
    return this.http.patch('http://localhost:3002/api/users/' + userID + '/profile', userProfile, httpOptions);
  }
}
