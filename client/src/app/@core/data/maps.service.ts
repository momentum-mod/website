import {Injectable} from '@angular/core';
import {Observable, of} from 'rxjs';
import {HttpClient} from '@angular/common/http';

@Injectable()
export class MapsService {

  constructor(private http: HttpClient) {
  }

  searchMaps(query: string): Observable<any> {
    return this.http.get('/api/maps/?search=' + query);
  }

  getMap(id: string): Observable<any> {
    return of({
      id: id,
      name: 'Lego Land',
      info: {
        id: id,
        totalDownloads: '100',
        avatarURL: '<img src="assets\\images\\Lego2.jpg" height="250px" width="px">',
        description: 'test',
        numBonuses: 10,
        numCheckpoints: 12,
        numStages: 7,
        difficulty: 9,
      },
    });
   // return this.http.get('/api/maps/' + id);
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
