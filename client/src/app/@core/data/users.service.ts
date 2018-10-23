import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {UserProfile} from './profile.service';

export interface Users {
  data: Array<User>;
}

export interface User {
  id: string;
  permissions: number;
  createdAt?: string;
  updatedAt?: string;
  profile: UserProfile;
}

@Injectable()
export class UsersService {

  constructor(private http: HttpClient) {
  }

  getUsers(): Observable<any> {
    return this.http.get('/api/users/');
  }

  searchUsers(query: string): Observable<any> {
    return this.http.get('/api/users/?search=' + query);
  }

  getUser(userID: string): Observable<any> {
    return this.http.get('/api/users/' + userID + '?expand=profile');
  }

  updateUser(user: User): Observable<any> {
    const httpOptions = {};
    return this.http.patch('/api/admin/users/' + user.id, user, httpOptions);
  }

}
