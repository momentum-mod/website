import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpEvent, HttpResponse } from '@angular/common/http';
import {
  CreateMap,
  CreateMapCredit,
  MMap,
  MapCredit,
  MapImage,
  MapInfo,
  MapsGetAllQuery,
  MapsGetQuery
} from '@momentum/constants';
import { PagedResponse } from '@momentum/constants';
import { HttpService } from './http.service';

@Injectable({ providedIn: 'root' })
export class MapsService {
  constructor(private http: HttpService) {}

  getMap(id: number, query?: MapsGetQuery): Observable<MMap> {
    return this.http.get<MMap>(`maps/${id}`, { query });
  }

  getMaps(query?: MapsGetAllQuery): Observable<PagedResponse<MMap>> {
    return this.http.get<PagedResponse<MMap>>('maps', { query });
  }

  createMap(body: CreateMap): Observable<HttpResponse<MMap>> {
    return this.http.post<MMap>('maps', { body, observe: 'response' });
  }

  updateMapInfo(mapID: number, body: MapInfo): Observable<any> {
    return this.http.patch(`maps/${mapID}/info`, { body });
  }

  getMapCredits(mapID: number): Observable<PagedResponse<MapCredit>> {
    return this.http.get<PagedResponse<MapCredit>>(`maps/${mapID}/credits`);
  }

  updateMapCredits(
    mapID: number,
    body: CreateMapCredit[]
  ): Observable<MapCredit[]> {
    return this.http.put<MapCredit[]>(`maps/${mapID}/credits`, { body });
  }

  // TODO
  getMapFileUploadLocation(id: number): Observable<any> {
    return this.http.get(`maps/${id}/upload`, {
      observe: 'response'
    });
  }

  uploadMapFile(mapID: number, mapFile: File): Observable<HttpEvent<string>> {
    const formData = new FormData();
    formData.append('file', mapFile, mapFile.name);
    return this.http.post(`maps/${mapID}/upload`, {
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
    formData.append('file', thumbnailFile, thumbnailFile.name);
    return this.http.put(`maps/${id}/thumbnail`, {
      body: formData,
      responseType: 'text'
    });
  }

  createMapImage(id: number, mapImageFile: File): Observable<MapImage> {
    const formData = new FormData();
    formData.append('file', mapImageFile, mapImageFile.name);
    return this.http.post<MapImage>(`maps/${id}/images`, { body: formData });
  }

  updateMapImage(
    id: number,
    mapImageID: number,
    mapImageFile: File
  ): Observable<void> {
    const formData = new FormData();
    formData.append('file', mapImageFile, mapImageFile.name);
    return this.http.put(`maps/${id}/images/${mapImageID}`, { body: formData });
  }

  deleteMapImage(id: number, mapImageID: number): Observable<void> {
    return this.http.delete(`maps/${id}/images/${mapImageID}`);
  }
}
