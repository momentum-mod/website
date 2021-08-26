// Services
//  External
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { take, map } from 'rxjs/operators';
//  Internal
import { MapsService } from './maps.service';

// Models
import { MomentumMaps } from '../../models/momentum-maps.model';
import { MomentumMap } from '../../models/momentum-map.model';
import { MomentumMapInfo } from '../../models/map-info.model';
import { MapCredit } from '../../models/map-credit.model';


@Injectable()
export class MapStoreService {

  constructor(
    private mapsService: MapsService,
  ) { }


  // Service Observables

  // map list
  private _maps: BehaviorSubject<MomentumMaps> = new BehaviorSubject({ number: 0, maps: [] });
  public readonly maps$: Observable<MomentumMaps> = this._maps.asObservable();

  set maps(newMaps: MomentumMaps) {
    this._maps.next(newMaps);
  }

  get maps() {
    return this._maps.value;
  }

  // current map
  private _map: BehaviorSubject<MomentumMap> = new BehaviorSubject(null);
  public readonly map$: Observable<MomentumMap> = this._map.asObservable();

  set map(newMap: MomentumMap) {
    this._map.next(newMap);
  }

  get map() {
    return this._map.value;
  }


  /**
   * @param id The ID of the map
   * @param options The options for the request
   * @return Retrieves a specific map
   */
   getMap(id: number, options?: object): void {
    this.mapsService.getMap(id, options).pipe(
      take(1),
      map((c: MomentumMap) => {
        console.log(`MapStoreService: Received ${c.name}`);
        this.map = c;
      }),
    );
  }

  /**
   * @param options
   * @return a list of maps
   */
  getMaps(options?: object): void {
    this.mapsService.getMaps(options).pipe(
      take(1),
      map((c: MomentumMaps) => {
        console.log(`MapStoreService: Received ${c.count} maps`);
        this.maps = c;
      }),
    );
  }

  /**
   * @param mapData
   * @return Create a map
   */
  createMap(mapData: object): Observable<MomentumMap> {
    return this.mapsService.createMap(mapData);
  }

  /**
   * @param id
   * @param mapInfo MomentumMapInfo with new values of properties
   * @return response
   */
  updateMapInfo(id: number, mapInfo: MomentumMapInfo): Observable<any> {
    // TODO: Type up this response
    return this.mapsService.updateMapInfo(id, mapInfo);
  }

  /**
   * @param id
   * @return credits list of the specific map
   */
  getMapCredits(id: number): Observable<any> {
    // TODO: Type up this response
    // TODO: this should prbably be updated to get the credits of the
    // map in map$ but that might be wrong. Talk to Gocnak/Hona
    return this.mapsService.getMapCredits(id);
  }

  /**
   * @param id
   * @param credit
   * @return newly created MapCredit
   */
  createMapCredit(id: number, credit: MapCredit): Observable<any> {
    // TODO: Type up this response
    // TODO: this should prbably be updated to get the credits of the
    // map in map$ but that might be wrong.
    // Depends on API Repsonce. Talk to Gocnak/Hona.
    return this.mapsService.createMapCredit(id, credit);
  }

  /**
   * @param id
   * @param creditID
   * @param credit MapCredit with new values of properties
   * @return response
   */
  updateMapCredit(id: number, creditID: number, credit: MapCredit): Observable<any> {
    // TODO: Type up this response
    // TODO: this should prbably be updated to get the credits of the
    // map in map$ but that might be wrong. Talk to Gocnak/Hona
    return this.mapsService.updateMapCredit(id, creditID, credit);
  }

  /**
   * @param id
   * @param creditID
   * @return response
   */
  deleteMapCredit(id: number, creditID: number): Observable<any> {
    // TODO: Type up this response
    // TODO: this should prbably be updated to get the credits of the
    // map in map$ but that might be wrong.
    // Depends on API Repsonce. Talk to Gocnak/Hona.
    return this.mapsService.deleteMapCredit(id, creditID);
  }

  /**
   * @param id
   * @return map file upload location
   */
  getMapFileUploadLocation(id: number): Observable<any> {
    // TODO: Type up this response
    return this.mapsService.getMapFileUploadLocation(id);
  }

  /**
   * @param uploadLocation updated location of map
   * @param mapFile the map file to upload
   * @return uploads a map file of a map
   */
  uploadMapFile(uploadLocation: string, mapFile: File): Observable<any> {
    // TODO: Type up this response
    return this.mapsService.uploadMapFile(uploadLocation, mapFile);
  }

  /**
   * @param id
   * @return downloads a map file of a map
   */
  downloadMapFile(id: number): Observable<any> {
    // TODO: Type up this response
    return this.mapsService.downloadMapFile(id);
  }

  /**
   * @param id ID of a map avatar
   * @param thumbnailFile file of a map avatar
   * @return updated map avatar
   */
  updateMapAvatar(id: number, thumbnailFile: File): Observable<any> {
    // TODO: Type up this response
    // TODO: Update the map$ so all components have fresh data
    return this.mapsService.updateMapAvatar(id, thumbnailFile);
  }

  /**
   * @param id
   * @param mapImageFile
   */
  createMapImage(id: number, mapImageFile: File): Observable<any> {
    // TODO: Type up this response
    // TODO: Update the map$ so all components have fresh data
    return this.mapsService.createMapImage(id, mapImageFile);
  }

  /**
   * @param id
   * @param mapImageID
   * @param mapImageFile
   */
  updateMapImage(id: number, mapImageID: number, mapImageFile: File): Observable<any> {
    // TODO: Type up this response
    // TODO: Update the map$ so all components have fresh data
    return this.mapsService.updateMapImage(id, mapImageID, mapImageFile);
  }

  /**
   * @param id
   * @param mapImageID
   */
  deleteMapImage(id: number, mapImageID: number): Observable<any> {
    // TODO: Type up this response
    // TODO: Update the map$ so all components have fresh data
    return this.mapsService.deleteMapCredit(id, mapImageID);
  }
}
