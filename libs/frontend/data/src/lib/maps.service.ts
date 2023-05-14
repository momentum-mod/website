import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Map as MomMap } from '@prisma/client';
import { MomentumMaps } from '../models/momentum-maps.model';
import { MapImage } from '../models/map-image.model';
import { MomentumMapInfo } from '../models/map-info.model';
import { MapCredit } from '../models/map-credit.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MapsService {
  constructor(private http: HttpClient) {}

  getMap(id: number, options?: object): Observable<Map> {
    return this.http.get<MomentumMap>(
      environment.api + '/api/maps/' + id,
      options || {}
    );
  }

  getMaps(options?: object): Observable<MomentumMaps> {
    return this.http.get<MomentumMaps>(
      environment.api + '/api/maps',
      options || {}
    );
  }

  createMap(mapData: object): Observable<HttpResponse<MomentumMap>> {
    return this.http.post<MomentumMap>(environment.api + '/api/maps', mapData, {
      observe: 'response'
    });
  }

  updateMapInfo(id: number, mapInfo: MomentumMapInfo): Observable<any> {
    return this.http.patch(
      environment.api + '/api/maps/' + id + '/info',
      mapInfo
    );
  }

  getMapCredits(id: number): Observable<any> {
    return this.http.get<MapCredit>(
      environment.api + '/api/maps/' + id + '/credits'
    );
  }

  createMapCredit(id: number, credit: MapCredit): Observable<any> {
    return this.http.post<MapCredit>(
      environment.api + '/api/maps/' + id + '/credits',
      credit
    );
  }

  updateMapCredit(
    id: number,
    creditID: number,
    credit: MapCredit
  ): Observable<any> {
    return this.http.patch(
      environment.api + '/api/maps/' + id + '/credits/' + creditID,
      credit
    );
  }

  deleteMapCredit(id: number, creditID: number): Observable<any> {
    return this.http.delete(
      environment.api + '/api/maps/' + id + '/credits/' + creditID,
      {
        responseType: 'text'
      }
    );
  }

  getMapFileUploadLocation(id: number): Observable<any> {
    return this.http.get(environment.api + '/api/maps/' + id + '/upload', {
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
    return this.http.get(environment.api + '/api/maps/' + id + '/download', {
      responseType: 'blob'
    });
  }

  updateMapAvatar(id: number, thumbnailFile: File): Observable<any> {
    const formData = new FormData();
    formData.append('thumbnailFile', thumbnailFile, thumbnailFile.name);
    return this.http.put(
      environment.api + '/api/maps/' + id + '/thumbnail',
      formData,
      {
        responseType: 'text'
      }
    );
  }

  createMapImage(id: number, mapImageFile: File): Observable<MapImage> {
    const formData = new FormData();
    formData.append('mapImageFile', mapImageFile, mapImageFile.name);
    return this.http.post<MapImage>(
      environment.api + '/api/maps/' + id + '/images',
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
      environment.api + '/api/maps/' + id + '/images/' + mapImageID,
      formData
    );
  }

  deleteMapImage(id: number, mapImageID: number): Observable<any> {
    return this.http.delete(
      environment.api + '/api/maps/' + id + '/images/' + mapImageID
    );
  }
}
