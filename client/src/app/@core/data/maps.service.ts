import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {HttpClient} from '@angular/common/http';

@Injectable()
export class MapsService {

  constructor(private http: HttpClient) {
  }

  searchMaps(query: string): Observable<any> {
    return this.http.get('/api/maps?expand=info&search=' + query);
  }

  getMap(id: string): Observable<any> {
    return this.http.get('/api/maps/' + id + '?expand=info,credits');
  }

  createMap(mapData: object): Observable<any> {
    return this.http.post('/api/maps', mapData, {
      observe: 'response',
    });
  }

  getMapFileUploadLocation(id: string): Observable<any> {
    return this.http.get('/api/maps/' + id + '/upload', {
      observe: 'response',
    });
  }

  uploadMapFile(uploadLocation: string, mapFile: File): Observable<any> {
    const formData = new FormData();
    formData.append('mapFile', mapFile, mapFile.name);
    return this.http.post(uploadLocation, formData, {
      reportProgress: true,
      observe: 'events',
      responseType: 'text',
    });
  }

  updateMapAvatar(id: string, avatarFile: File): Observable<any> {
    const formData = new FormData();
    formData.append('avatarFile', avatarFile, avatarFile.name);
    return this.http.put('/api/maps/' + id + '/avatar', formData, {
      responseType: 'text',
    });
  }
}
