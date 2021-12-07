import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {HttpClient, HttpResponse} from '@angular/common/http';
import {MomentumMaps} from '../models/momentum-maps.model';
import {MomentumMap} from '../models/momentum-map.model';
import {MapImage} from '../models/map-image.model';
import {MomentumMapInfo} from '../models/map-info.model';
import {MapCredit} from '../models/map-credit.model';
import {environment} from '../../../environments/environment';

@Injectable()
export class MapsService {

  constructor(private http: HttpClient) {
  }

  /**
   * @param id The ID of the map
   * @param options The options for the request
   * @return Retrieves a specific map
   */
  getMap(id: number, options?: object): Observable<MomentumMap> {
    return this.http.get<MomentumMap>(environment.api + '/api/maps/' + id, options || {});
  }

  /**
   * @param options
   * @return a list of maps
   */
  getMaps(options?: object): Observable<MomentumMaps> {
    return this.http.get<MomentumMaps>(environment.api + '/api/maps', options || {});
  }

  /**
   * @param mapData
   * @return Create a map
   */
  createMap(mapData: object): Observable<HttpResponse<MomentumMap>> {
    return this.http.post<MomentumMap>(environment.api + '/api/maps', mapData, {
      observe: 'response',
    });
  }

  /**
   * @param mapName
   * @return Rename a map
   */
   updateMapName(id: number, mapName: object): Observable<any> {
    return this.http.patch(environment.api + '/api/maps/' + id, mapName);
  }

  /**
   * @param id
   * @param mapInfo MomentumMapInfo with new values of properties
   * @return response
   */
  updateMapInfo(id: number, mapInfo: MomentumMapInfo): Observable<any> {
    return this.http.patch(environment.api + '/api/maps/' + id + '/info', mapInfo);
  }

  /**
   * @param id
   * @return credits list of the specific map
   */
  getMapCredits(id: number): Observable<any> {
    return this.http.get<MapCredit>(environment.api + '/api/maps/' + id + '/credits');
  }

  /**
   * @param id
   * @param credit
   * @return newly created MapCredit
   */
  createMapCredit(id: number, credit: MapCredit): Observable<any> {
    return this.http.post<MapCredit>(environment.api + '/api/maps/' + id + '/credits', credit);
  }

  /**
   * @param id
   * @param creditID
   * @param credit MapCredit with new values of properties
   * @return response
   */
  updateMapCredit(id: number, creditID: number, credit: MapCredit): Observable<any> {
    return this.http.patch(environment.api + '/api/maps/' + id + '/credits/' + creditID, credit);
  }

  /**
   * @param id
   * @param creditID
   * @return response
   */
  deleteMapCredit(id: number, creditID: number): Observable<any> {
    return this.http.delete(environment.api + '/api/maps/' + id + '/credits/' + creditID, {
      responseType: 'text',
    });
  }

  /**
   * @param id
   * @return map file upload location
   */
  getMapFileUploadLocation(id: number): Observable<any> {
    return this.http.get(environment.api + '/api/maps/' + id + '/upload', {
      observe: 'response',
    });
  }

  /**
   * @param uploadLocation updated location of map
   * @param mapFile the map file to upload
   * @return uploads a map file of a map
   */
  uploadMapFile(uploadLocation: string, mapFile: File): Observable<any> {
    const formData = new FormData();
    formData.append('mapFile', mapFile, mapFile.name);
    return this.http.post(uploadLocation, formData, {
      reportProgress: true,
      observe: 'events',
      responseType: 'text',
    });
  }

  /**
   * @param id
   * @return downloads a map file of a map
   */
  downloadMapFile(id: number): Observable<any> {
    return this.http.get(environment.api + '/api/maps/' + id + '/download', {
      responseType: 'blob',
    });
  }

  /**
   * @param id ID of a map avatar
   * @param thumbnailFile file of a map avatar
   * @return updated map avatar
   */
  updateMapAvatar(id: number, thumbnailFile: File): Observable<any> {
    const formData = new FormData();
    formData.append('thumbnailFile', thumbnailFile, thumbnailFile.name);
    return this.http.put(environment.api + '/api/maps/' + id + '/thumbnail', formData, {
      responseType: 'text',
    });
  }

  /**
   * @param id
   * @param mapImageFile
   */
  getMapImages(id: number): Observable<MapImage[]> {
    return this.http.get<MapImage[]>(environment.api + '/api/maps/' + id + '/images');
  }

  /**
   * @param id
   * @param mapImageFile
   */
  createMapImage(id: number, mapImageFile: File): Observable<MapImage> {
    const formData = new FormData();
    formData.append('mapImageFile', mapImageFile, mapImageFile.name);
    return this.http.post<MapImage>(environment.api + '/api/maps/' + id + '/images', formData);
  }

  /**
   * @param id
   * @param mapImageID
   * @param mapImageFile
   */
  updateMapImage(id: number, mapImageID: number, mapImageFile: File): Observable<any> {
    const formData = new FormData();
    formData.append('mapImageFile', mapImageFile, mapImageFile.name);
    return this.http.put(environment.api + '/api/maps/' + id + '/images/' + mapImageID, formData);
  }

  /**
   * @param id
   * @param mapImageID
   */
  deleteMapImage(id: number, mapImageID: number): Observable<any> {
    return this.http.delete(environment.api + '/api/maps/' + id + '/images/' + mapImageID);
  }
}
