import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import { map, take } from 'rxjs/operators';
import {GlobalBaseStats} from '../../models/global-base-stats.model';
import {GlobalMapStats} from '../../models/global-map-stats.model';
import { StatsService } from './stats.service';

@Injectable({
  providedIn: 'root',
})
export class StatsStoreService {

  constructor(private statsService: StatsService) { }

  // Service Observables

  // Base Stats
  private _baseStats: BehaviorSubject<GlobalBaseStats> = new BehaviorSubject(null);
  public readonly baseStats$: Observable<GlobalBaseStats> = this._baseStats.asObservable();

  set baseStats(newBaseStats: GlobalBaseStats) {
    this._baseStats.next(newBaseStats);
  }

  get baseStats() {
    return this._baseStats.value;
  }

   // Map Stats
   private _mapStats: BehaviorSubject<GlobalMapStats> = new BehaviorSubject(null);
   public readonly mapStats$: Observable<GlobalMapStats> = this._mapStats.asObservable();

   set mapStats(newMapStats: GlobalMapStats) {
     this._mapStats.next(newMapStats);
   }

   get mapStats() {
     return this._mapStats.value;
   }

  /**
   * global base stats
   */
  setGlobalBaseStats(): void {
    this.statsService.getGlobalBaseStats().pipe(
      take(1),
      map((c: GlobalBaseStats) => {
        if(c) {
          this.baseStats = c;
        }
      }),
    );
  }

  /**
   * @return global stats for all maps
   */
  setGlobalMapStats(): void {
    this.statsService.getGlobalMapStats().pipe(
      take(1),
      map((c: GlobalMapStats) => {
        if(c) {
          this.mapStats = c;
        }
      }),
    );
  }

}

