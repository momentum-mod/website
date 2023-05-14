import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Map, MapCredit, MapImage, MapInfo } from '@momentum/types';
import { env } from '@momentum/frontend/env';
import { PaginatedResponse } from '@momentum/types';

@Injectable({ providedIn: 'root' })
export class MapsService {
  constructor(private http: HttpClient) {}

  getMap(id: number, options?: object): Observable<Map> {
    return this.http.get<Map>(env.api + '/api/maps/' + id, options || {});
  }

  getMaps(options?: object): Observable<PaginatedResponse<Map>> {
    return this.http.get<PaginatedResponse<Map>>(
      env.api + '/api/maps',
      options || {}
    );
  }

  createMap(mapData: object): Observable<HttpResponse<Map>> {
    return this.http.post<Map>(env.api + '/api/maps', mapData, {
      observe: 'response'
    });
  }

  updateMapInfo(id: number, mapInfo: MapInfo): Observable<any> {
    return this.http.patch(env.api + '/api/maps/' + id + '/info', mapInfo);
  }

  getMapCredits(id: number): Observable<any> {
    return this.http.get<MapCredit>(env.api + '/api/maps/' + id + '/credits');
  }

  createMapCredit(id: number, credit: MapCredit): Observable<any> {
    return this.http.post<MapCredit>(
      env.api + '/api/maps/' + id + '/credits',
      credit
    );
  }

  updateMapCredit(
    id: number,
    creditID: number,
    credit: MapCredit
  ): Observable<any> {
    return this.http.patch(
      env.api + '/api/maps/' + id + '/credits/' + creditID,
      credit
    );
  }

  deleteMapCredit(id: number, creditID: number): Observable<any> {
    return this.http.delete(
      env.api + '/api/maps/' + id + '/credits/' + creditID,
      {
        responseType: 'text'
      }
    );
  }

  getMapFileUploadLocation(id: number): Observable<any> {
    return this.http.get(env.api + '/api/maps/' + id + '/upload', {
      observe: 'response'
    });
  }

  uploadMapFile(uploadLocation: string, mapFile: File): Observable<any> {
    const formData = new FormData();
    formData.append('mapFile', mapFile, mapFile.name);
    return this.http.post(uploadLocation, formData, {
      reportProgress: true,
      observe: 'events',
      responseType: 'text'
    });
  }

  downloadMapFile(id: number): Observable<any> {
    return this.http.get(env.api + '/api/maps/' + id + '/download', {
      responseType: 'blob'
    });
  }

  updateMapAvatar(id: number, thumbnailFile: File): Observable<any> {
    const formData = new FormData();
    formData.append('thumbnailFile', thumbnailFile, thumbnailFile.name);
    return this.http.put(env.api + '/api/maps/' + id + '/thumbnail', formData, {
      responseType: 'text'
    });
  }

  createMapImage(id: number, mapImageFile: File): Observable<MapImage> {
    const formData = new FormData();
    formData.append('mapImageFile', mapImageFile, mapImageFile.name);
    return this.http.post<MapImage>(
      env.api + '/api/maps/' + id + '/images',
      formData
    );
  }

  updateMapImage(
    id: number,
    mapImageID: number,
    mapImageFile: File
  ): Observable<any> {
    const formData = new FormData();
    formData.append('mapImageFile', mapImageFile, mapImageFile.name);
    return this.http.put(
      env.api + '/api/maps/' + id + '/images/' + mapImageID,
      formData
    );
  }

  deleteMapImage(id: number, mapImageID: number): Observable<any> {
    return this.http.delete(
      env.api + '/api/maps/' + id + '/images/' + mapImageID
    );
  }
}
