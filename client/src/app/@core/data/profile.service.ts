import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {HttpClient} from '@angular/common/http';

export interface UserProfile {
  id: string;
  alias: string;
  avatarURL: string;
  bio?: string;
  twitterName?: string;
  discordName?: string;
  youtubeName?: string;
}
@Injectable()
export class ProfileService {
  constructor(private http: HttpClient) {}
  updateUserProfile(userProfile: UserProfile): Observable<any> {
    return this.http.patch('/api/user/profile', userProfile);
  }
}
