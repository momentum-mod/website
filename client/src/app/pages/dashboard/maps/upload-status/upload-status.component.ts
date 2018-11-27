import {Component, OnInit} from '@angular/core';
import {LocalUserService} from '../../../../@core/data/local-user.service';
import {MomentumMap} from '../../../../@core/models/momentum-map.model';
import {ToasterService} from 'angular2-toaster';

@Component({
  selector: 'app-map-queue',
  templateUrl: './upload-status.component.html',
  styleUrls: ['./upload-status.component.scss'],
})
export class UploadStatusComponent implements OnInit {
  mapCount: number;
  maps: MomentumMap[];
  fetchedMaps: boolean;
  pageLimit: number;
  currentPage: number;
  constructor(private localUserService: LocalUserService,
              private toastService: ToasterService) {
    this.fetchedMaps = false;
    this.pageLimit = 5;
    this.currentPage = 1;
  }

  ngOnInit(): void {
    this.loadSubmittedMaps();
  }

  loadSubmittedMaps() {
    this.localUserService.getSubmittedMaps({
      params: {
        expand: 'info,credits',
        offset: (this.currentPage - 1) * this.pageLimit,
        limit: this.pageLimit,
        // status: MapUploadStatus.PENDING,
      },
    }).subscribe(res => {
      this.mapCount = res.count;
      this.maps = res.maps;
    }, er => {
      this.toastService.popAsync('error', 'Error fetching submitted maps', er.message);
    }, () => {
      this.fetchedMaps = true;
    });
   }

  onPageChange(pageNum) {
    this.currentPage = pageNum;
    this.loadSubmittedMaps();
  }
}
