import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AdminService {

  constructor(private http: HttpClient) { }

  updateMap(mapID: string, map: object): Observable<any> {
    return this.http.patch('/api/admin/maps/' + mapID, map);
  }

  getMaps(context?: object): Observable<any> {
    return this.http.get('/api/admin/maps/', context);
  }

}
