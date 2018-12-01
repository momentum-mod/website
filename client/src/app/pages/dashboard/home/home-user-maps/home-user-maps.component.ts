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
    this.userService.getSubmittedMapSummary().subscribe(res => {
      this.submittedMapStatusSummary = {};
      for (const sum of res)
        this.submittedMapStatusSummary[sum.statusFlag] = sum.statusCount;
    }, err => {
      console.error(err);
    });
  }

}
