import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Users {
  data: Array<User>;
}

export interface User {
  id: string;
  alias: string;
  permissions: number;
  avatarUrl: string;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable()
export class UsersService {

  constructor(private http: HttpClient) {
  }

  getUsers(): Observable<any> {
    return this.http.get('/api/users/');
  }

  updateUser(user: User): Observable<any> {
    // console.log("Editing user...");
    // console.log(user);
    const httpOptions = {};
    return this.http.put('/api/users/' + user.id, user, httpOptions);
  }

}
