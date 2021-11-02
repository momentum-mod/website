import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {environment} from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RanksService {

  constructor(private http: HttpClient) {}

  getRanks(mapID: number, options: object): Observable<any> {
    return this.http.get(`${environment.api}/api/maps/${mapID}/ranks`, options);
  }
  getFriendsRanks(mapID: number, options: object): Observable<any> {
    return this.http.get(`${environment.api}/api/maps/${mapID}/ranks/friends`, options);
  }
  getAroundRanks(mapID: number, options: object): Observable<any> {
    return this.http.get(`${environment.api}/api/maps/${mapID}/ranks/around`, options);
  }
}
