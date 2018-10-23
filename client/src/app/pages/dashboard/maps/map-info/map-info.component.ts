import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, ParamMap} from '@angular/router';
import {switchMap} from 'rxjs/operators';
import {MapsService} from '../../../../@core/data/maps.service';
import {MomentumMap} from '../../../../@core/models/momentum-map.model';

@Component({
  selector: 'map-info',
  templateUrl: './map-info.component.html',
  styleUrls: ['./map-info.component.scss'],
})

export class MapInfoComponent implements OnInit {
  map: MomentumMap;
  constructor(private route: ActivatedRoute,
              private mapService: MapsService) {}
  ngOnInit() {
    this.route.paramMap.pipe(
      switchMap((params: ParamMap) =>
          this.mapService.getMap(params.get('id')),
      ),
    ).subscribe(map => this.map = map);
  }
}
