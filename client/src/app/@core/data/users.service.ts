import { Injectable } from '@angular/core';
/*
import { HttpClient } from '@angular/common/http';
*/

// export interface Users {
// 	data: Array<User>;
// }

// export interface User {
// 	id: string;
// 	alias: string;
// 	permission: number;
// 	avatar_url: string;
// 	createdAt: string;
// 	updatedAt: string;
// }

@Injectable()
export class UsersService {

  constructor(/*private http: HttpClient*/) {
  }

  getUsers() {
    // this.http.get('http://localhost:3002/api/users/')
    //   .subscribe(data => {
    // 	  console.log(data);
    // 	  return data;
    //   });
    return [{
      id: '25474197999996633',
      alias: 'Cate',
      permission: 5,
      avatar_url: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/13/' +
        '13d6e1103950ab69d6eec0c7758897887a05c08c_full.jpg',
      createdAt: '2018-09-27T07:29:17.000Z',
      updatedAt: '2018-09-27T07:29:17.000Z',
    }];
  }

}
