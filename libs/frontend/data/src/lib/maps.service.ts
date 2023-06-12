import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpEvent, HttpResponse } from '@angular/common/http';
import {
  CreateMap,
  CreateMapCredit,
  Map,
  MapCredit,
  MapImage,
  MapInfo,
  MapsGetAllQuery,
  MapsGetQuery,
  UpdateMapCredit
} from '@momentum/types';
import { PagedResponse } from '@momentum/types';
import { HttpService } from './http.service';

@Injectable({ providedIn: 'root' })
export class MapsService {
  constructor(private http: HttpService) {}

  getMap(id: number, query?: MapsGetQuery): Observable<Map> {
    return this.http.get<Map>(`maps/${id}`, { query });
  }

  getMaps(query?: MapsGetAllQuery): Observable<PagedResponse<Map>> {
    return this.http.get<PagedResponse<Map>>('maps', { query });
  }

  createMap(body: CreateMap): Observable<HttpResponse<Map>> {
    return this.http.post<Map>('maps', { body, observe: 'response' });
  }

  updateMapInfo(id: number, body: MapInfo): Observable<any> {
    return this.http.patch(`maps/${id}/info`, { body });
  }

  getMapCredits(id: number): Observable<PagedResponse<MapCredit>> {
    return this.http.get<PagedResponse<MapCredit>>(`maps/${id}/credits`);
  }

  createMapCredit(id: number, body: CreateMapCredit): Observable<any> {
    return this.http.post<MapCredit>(`maps/${id}/credits`, { body });
  }

  updateMapCredit(creditID: number, body: UpdateMapCredit): Observable<any> {
    return this.http.patch(`maps/credits/${creditID}`, { body });
  }

  deleteMapCredit(creditID: number): Observable<void> {
    return this.http.delete(`maps/credits/${creditID}`);
  }

  // TODO
  getMapFileUploadLocation(id: number): Observable<any> {
    return this.http.get(`maps/${id}/upload`, {
      observe: 'response'
    });
  }

  uploadMapFile(
    uploadLocation: string,
    mapFile: File
  ): Observable<HttpEvent<string>> {
    const formData = new FormData();
    formData.append('mapFile', mapFile, mapFile.name);
    return this.http.post(uploadLocation, {
      body: formData,
      reportProgress: true,
      observe: 'events',
      responseType: 'text'
    });
  }

  downloadMapFile(id: number): Observable<Blob> {
    return this.http.get(`maps/${id}/download`, {
      responseType: 'blob'
    });
  }

  updateMapAvatar(id: number, thumbnailFile: File): Observable<any> {
    const formData = new FormData();
    formData.append('thumbnailFile', thumbnailFile, thumbnailFile.name);
    return this.http.put(`maps/${id}/thumbnail`, {
      body: formData,
      responseType: 'text'
    });
  }

  createMapImage(id: number, mapImageFile: File): Observable<MapImage> {
    const formData = new FormData();
    formData.append('mapImageFile', mapImageFile, mapImageFile.name);
    return this.http.post<MapImage>(`maps/${id}/images`, { body: formData });
  }

  updateMapImage(
    id: number,
    mapImageID: number,
    mapImageFile: File
  ): Observable<void> {
    const formData = new FormData();
    formData.append('mapImageFile', mapImageFile, mapImageFile.name);
    return this.http.put(`maps/${id}/images/${mapImageID}`, { body: formData });
  }

  deleteMapImage(id: number, mapImageID: number): Observable<void> {
    return this.http.delete(`maps/${id}/images/${mapImageID}`);
  }
}
