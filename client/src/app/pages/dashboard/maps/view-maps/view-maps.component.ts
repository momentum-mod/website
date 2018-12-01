import {Component, OnInit} from '@angular/core';
import {MomentumMap} from '../../../../@core/models/momentum-map.model';
import {MapsService} from '../../../../@core/data/maps.service';
import {ToasterService} from 'angular2-toaster';

@Component({
  selector: 'app-map-queue',
  templateUrl: './view-maps.component.html',
  styleUrls: ['./view-maps.component.scss'],
})
export class ViewMapsComponent implements OnInit {

  mapCount: number;
  maps: MomentumMap[];
  pageLimit: number;
  currentPage: number;

  constructor(private mapService: MapsService,
              private toasterService: ToasterService) {
    this.pageLimit = 10;
    this.currentPage = 1;
  }

  ngOnInit() {
    this.loadMaps();
  }

  loadMaps() {
    const queryParams = {
      expand: 'info,submitter',
      limit: this.pageLimit,
      offset: (this.currentPage - 1) * this.pageLimit,
    };
    this.mapService.getMaps({ params: queryParams }).subscribe(res => {
      this.mapCount = res.count;
      this.maps =  res.maps;
    }, err => {
      console.error(err);
      this.toasterService.popAsync('error', 'Failed to get maps', err.message);
    });
  }

  onPageChange(pageNum) {
    this.currentPage = pageNum;
    this.loadMaps();
  }

}
