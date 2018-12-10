import {Component, OnInit} from '@angular/core';
import {LocalUserService} from '../../../../@core/data/local-user.service';
import {MapLibraryEntry} from '../../../../@core/models/map-library-entry';
import {finalize} from 'rxjs/operators';
import {ToasterService} from 'angular2-toaster';

@Component({
  selector: 'map-library',
  templateUrl: './map-library.component.html',
  styleUrls: ['./map-library.component.scss'],
})
export class MapLibraryComponent implements OnInit {

  entryCount: number;
  entries: MapLibraryEntry[];
  sentRequest: boolean;
  pageLimit: number;
  currentPage: number;

  constructor(private locUsrService: LocalUserService, private toastService: ToasterService) {
    this.entries = [];
    this.sentRequest = false;
    this.pageLimit = 5;
    this.currentPage = 1;
  }

  ngOnInit() {
    this.loadMapLibrary();
  }

  loadMapLibrary() {
    this.locUsrService.getMapLibrary({
      params: {
        expand: 'submitter,favorite,libraryEntry',
        offset: (this.currentPage - 1) * this.pageLimit,
        limit: this.pageLimit,
      },
    })
      .pipe(finalize(() => this.sentRequest = true))
      .subscribe(res => {
        this.entryCount = res.count;
        this.entries = res.entries;
      }, err => {
        this.toastService.popAsync('error', 'Cannot get map library', err.message);
      });
  }

  onPageChange(pageNum) {
    this.currentPage = pageNum;
    this.loadMapLibrary();
  }
}
