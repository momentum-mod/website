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
import {MapImage} from '../../models/map-image.model';
import {MomentumMapInfo} from '../../models/map-info.model';
import {MapCredit} from '../../models/map-credit.model';
import { MomentumMapType } from '../../models/map-type.model';


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

    // TODO: Implement
    throw new Error('NotImplemented');
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

    // TODO: Implement
    throw new Error('NotImplemented');
  }

  /**
   * @param mapData
   * @return Create a map
   */
  createMap(mapData: object): void {
    // TODO: Implement
    throw new Error('NotImplemented');
  }

  /**
   * @param id
   * @param mapInfo MomentumMapInfo with new values of properties
   * @return response
   */
  updateMapInfo(id: number, mapInfo: MomentumMapInfo): void {
    // TODO: Implement
    throw new Error('NotImplemented');
  }

  /**
   * @param id
   * @return credits list of the specific map
   */
  getMapCredits(id: number): void {
    // TODO: Implement
    throw new Error('NotImplemented');
  }

  /**
   * @param id
   * @param credit
   * @return newly created MapCredit
   */
  createMapCredit(id: number, credit: MapCredit): void {
    // TODO: Implement
    throw new Error('NotImplemented');
  }

  /**
   * @param id
   * @param creditID
   * @param credit MapCredit with new values of properties
   * @return response
   */
  updateMapCredit(id: number, creditID: number, credit: MapCredit): void {
    // TODO: Implement
    throw new Error('NotImplemented');
  }

  /**
   * @param id
   * @param creditID
   * @return response
   */
  deleteMapCredit(id: number, creditID: number): void {
    // TODO: Implement
    throw new Error('NotImplemented');
  }

  /**
   * @param id
   * @return map file upload location
   */
  getMapFileUploadLocation(id: number): void {
    // TODO: Implement
    throw new Error('NotImplemented');
  }

  /**
   * @param uploadLocation updated location of map
   * @param mapFile the map file to upload
   * @return uploads a map file of a map
   */
  uploadMapFile(uploadLocation: string, mapFile: File): void {
    // TODO: Implement
    throw new Error('NotImplemented');
  }

  /**
   * @param id
   * @return downloads a map file of a map
   */
  downloadMapFile(id: number): void {
    // TODO: Implement
    throw new Error('NotImplemented');
  }

  /**
   * @param id ID of a map avatar
   * @param thumbnailFile file of a map avatar
   * @return updated map avatar
   */
  updateMapAvatar(id: number, thumbnailFile: File): void {
    // TODO: Implement
    throw new Error('NotImplemented');
  }

  /**
   * @param id
   * @param mapImageFile
   */
  createMapImage(id: number, mapImageFile: File): void {
    // TODO: Implement
    throw new Error('NotImplemented');
  }

  /**
   * @param id
   * @param mapImageID
   * @param mapImageFile
   */
  updateMapImage(id: number, mapImageID: number, mapImageFile: File): void {
    // TODO: Implement
    throw new Error('NotImplemented');
  }

  /**
   * @param id
   * @param mapImageID
   */
  deleteMapImage(id: number, mapImageID: number): void {
    // TODO: Implement
    throw new Error('NotImplemented');
  }
}
