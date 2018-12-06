import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {HttpClient} from '@angular/common/http';

@Injectable()
export class MapsService {

  constructor(private http: HttpClient) {
  }

  /**
   * @param query
   * @return a list of maps
   */
  searchMaps(query: string): Observable<any> {
    return this.http.get('/api/maps?expand=info&search=' + query);
  }

  /**
   * @param id The ID of the map
   * @param options The options for the request
   * @return Retrieves a specific map
   */
  getMap(id: number, options?: object): Observable<any> {
    return this.http.get('/api/maps/' + id, options || {});
  }

  /**
   * @param options
   * @return a list of maps
   */
  getMaps(options?: object): Observable<any> {
    return this.http.get('/api/maps', options || {});
  }

  /**
   * @param mapData
   * @return Create a map
   */
  createMap(mapData: object): Observable<any> {
    return this.http.post('/api/maps', mapData, {
      observe: 'response',
    });
  }

  /**
   * @param id
   * @return map file upload location
   */
  getMapFileUploadLocation(id: number): Observable<any> {
    return this.http.get('/api/maps/' + id + '/upload', {
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
    return this.http.get('/api/maps/' + id + '/download', {
      responseType: 'text',
    });
  }

  /**
   * @param id ID of a map avatar
   * @param avatarFile file of a map avatar
   * @return updated map avatar
   */
  updateMapAvatar(id: number, avatarFile: File): Observable<any> {
    const formData = new FormData();
    formData.append('avatarFile', avatarFile, avatarFile.name);
    return this.http.put('/api/maps/' + id + '/avatar', formData, {
      responseType: 'text',
    });
  }

  /**
   * @param id
   * @param mapImageFile
   */
  createMapImage(id: number, mapImageFile: File): Observable<any> {
    const formData = new FormData();
    formData.append('mapImageFile', mapImageFile, mapImageFile.name);
    return this.http.post('/api/maps/' + id + '/images', formData);
  }

  /**
   * @param id
   * @param mapImageID
   * @param mapImageFile
   */
  updateMapImage(id: number, mapImageID: number, mapImageFile: File): Observable<any> {
    const formData = new FormData();
    formData.append('mapImageFile', mapImageFile, mapImageFile.name);
    return this.http.put('/api/maps/' + id + '/images/' + mapImageID, formData);
  }

  /**
   * @param id
   * @param mapImageID
   */
  deleteMapImage(id: number, mapImageID: number): Observable<any> {
    return this.http.delete('/api/maps/' + id + '/images/' + mapImageID);
  }
}
