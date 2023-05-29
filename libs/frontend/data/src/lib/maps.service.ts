import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpEvent, HttpResponse } from '@angular/common/http';
import {
  CreateMap,
  CreateMapCredit,
  Map,
  MapCredit,
  MapImage,
  MapInfo,
  MapsGetAllQuery,
  MapsGetQuery,
  QueryParam,
  UpdateMapCredit
} from '@momentum/types';
import { env } from '@momentum/frontend/env';
import { PagedResponse } from '@momentum/types';

@Injectable({ providedIn: 'root' })
export class MapsService {
  constructor(private http: HttpClient) {}

  getMap(id: number, query?: MapsGetQuery): Observable<Map> {
    return this.http.get<Map>(`${env.api}/v1/maps/${id}`, {
      params: query as QueryParam
    });
  }

  getMaps(query?: MapsGetAllQuery): Observable<PagedResponse<Map>> {
    return this.http.get<PagedResponse<Map>>(`${env.api}/v1/maps`, {
      params: query as QueryParam
    });
  }

  createMap(mapData: CreateMap): Observable<HttpResponse<Map>> {
    return this.http.post<Map>(`${env.api}/v1/maps`, mapData, {
      observe: 'response'
    });
  }

  updateMapInfo(id: number, mapInfo: MapInfo): Observable<any> {
    return this.http.patch(`${env.api}/v1/maps/${id}/info`, mapInfo);
  }

  getMapCredits(id: number): Observable<PagedResponse<MapCredit>> {
    return this.http.get<PagedResponse<MapCredit>>(
      `${env.api}/v1/maps/${id}/credits`
    );
  }

  createMapCredit(id: number, credit: CreateMapCredit): Observable<any> {
    return this.http.post<MapCredit>(`${env.api}/v1/maps/${id}/credits`, credit);
  }

  updateMapCredit(
    id: number,
    creditID: number,
    credit: UpdateMapCredit
  ): Observable<any> {
    return this.http.patch(`${env.api}/v1/maps/${id}/credits/${creditID}`, credit);
  }

  deleteMapCredit(id: number, creditID: number): Observable<any> {
    return this.http.delete(`${env.api}/v1/maps/${id}/credits/${creditID}`, {
      responseType: 'text'
    });
  }

  // TODO
  getMapFileUploadLocation(id: number): Observable<any> {
    return this.http.get(`${env.api}/v1/maps/${id}/upload`, {
      observe: 'response'
    });
  }

  uploadMapFile(
    uploadLocation: string,
    mapFile: File
  ): Observable<HttpEvent<string>> {
    const formData = new FormData();
    formData.append('mapFile', mapFile, mapFile.name);
    return this.http.post(uploadLocation, formData, {
      reportProgress: true,
      observe: 'events',
      responseType: 'text'
    });
  }

  downloadMapFile(id: number): Observable<Blob> {
    return this.http.get(`${env.api}/v1/maps/${id}/download`, {
      responseType: 'blob'
    });
  }

  updateMapAvatar(id: number, thumbnailFile: File): Observable<any> {
    const formData = new FormData();
    formData.append('thumbnailFile', thumbnailFile, thumbnailFile.name);
    return this.http.put(`${env.api}/v1/maps/${id}/thumbnail`, formData, {
      responseType: 'text'
    });
  }

  createMapImage(id: number, mapImageFile: File): Observable<MapImage> {
    const formData = new FormData();
    formData.append('mapImageFile', mapImageFile, mapImageFile.name);
    return this.http.post<MapImage>(`${env.api}/v1/maps/${id}/images`, formData);
  }

  updateMapImage(
    id: number,
    mapImageID: number,
    mapImageFile: File
  ): Observable<any> {
    const formData = new FormData();
    formData.append('mapImageFile', mapImageFile, mapImageFile.name);
    return this.http.put(
      `${env.api}/v1/maps/${id}/images/${mapImageID}`,
      formData
    );
  }

  deleteMapImage(id: number, mapImageID: number): Observable<any> {
    return this.http.delete(`${env.api}/v1/maps/${id}/images/${mapImageID}`);
  }
}
