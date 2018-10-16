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
    return this.http.get('/api/users/' + userID);
  }

  updateUser(user: User): Observable<any> {
    // console.log("Editing user...");
    // console.log(user);
    const httpOptions = {};
    return this.http.put('/api/users/' + user.id, user, httpOptions);
  }

}
