import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class RanksService {

  constructor(private http: HttpClient) {}

  getRanks(mapID: number, options: object): Observable<any> {
    return this.http.get(`/api/maps/${mapID}/ranks`, options);
  }
  getFriendsRanks(mapID: number, options: object): Observable<any> {
    return this.http.get(`/api/maps/${mapID}/ranks/friends`, options);
  }
  getAroundRanks(mapID: number, options: object): Observable<any> {
    return this.http.get(`/api/maps/${mapID}/ranks/around`, options);
  }
}
