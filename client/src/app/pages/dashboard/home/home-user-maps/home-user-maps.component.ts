import { Component, OnInit } from '@angular/core';
import {LocalUserService} from '../../../../@core/data/local-user.service';
import {MapUploadStatus} from '../../../../@core/models/map-upload-status.model';

@Component({
  selector: 'home-user-maps',
  templateUrl: './home-user-maps.component.html',
  styleUrls: ['./home-user-maps.component.scss'],
})
export class HomeUserMapsComponent implements OnInit {

  MapUploadStatus: typeof MapUploadStatus = MapUploadStatus;
  submittedMapStatusSummary;

  constructor(private userService: LocalUserService) {
    this.submittedMapStatusSummary = {};
  }

  ngOnInit() {
    // TODO: create and use a special server endpoint for getting this summary
    this.userService.getSubmittedMaps().subscribe(res => {
      this.submittedMapStatusSummary = {};
      for (const map of res.maps) {
        if (!this.submittedMapStatusSummary[map.statusFlag])
          this.submittedMapStatusSummary[map.statusFlag] = 0;
        this.submittedMapStatusSummary[map.statusFlag]++;
      }
    }, err => {
      console.error(err);
    });
  }

}
