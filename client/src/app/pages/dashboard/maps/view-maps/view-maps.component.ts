import {Component, OnInit} from '@angular/core';
import {MomentumMap} from '../../../../@core/models/momentum-map.model';
import {MapsService} from '../../../../@core/data/maps.service';
import {ToasterService} from 'angular2-toaster';
import {MapAPIQueryParams} from '../../../../@core/models/map-api-query-params.model';
import {FormControl, FormGroup} from '@angular/forms';

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
  searchOptions: FormGroup;

  constructor(private mapService: MapsService,
              private toasterService: ToasterService) {
    this.pageLimit = 10;
    this.currentPage = 1;
    this.searchOptions = new FormGroup({
      search: new FormControl(''),
    });
  }

  ngOnInit() {
    this.loadMaps();
  }

  genQueryParams(): MapAPIQueryParams {
    const searchOptions = this.searchOptions.value;
    const queryParams: MapAPIQueryParams = {
      expand: 'info,submitter',
      limit: this.pageLimit,
      offset: (this.currentPage - 1) * this.pageLimit,
    };
    if (searchOptions.search)
      queryParams.search = searchOptions.search;
    return queryParams;
  }

  loadMaps() {
    const options = { params: this.genQueryParams() };
    this.mapService.getMaps(options).subscribe(res => {
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
