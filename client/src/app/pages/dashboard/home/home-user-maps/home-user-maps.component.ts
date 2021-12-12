import {Component, OnInit} from '@angular/core';
import {LocalUserService} from '../../../../@core/data/local-user.service';
import {MapUploadStatus} from '../../../../@core/models/map-upload-status.model';
import {NbToastrService} from '@nebular/theme';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'home-user-maps',
  templateUrl: './home-user-maps.component.html',
  styleUrls: ['./home-user-maps.component.scss'],
})
export class HomeUserMapsComponent implements OnInit {

  loading: boolean;
  MapUploadStatus: typeof MapUploadStatus = MapUploadStatus;
  submittedMapStatusSummary;

  constructor(private userService: LocalUserService, private toasterService: NbToastrService) {
    this.submittedMapStatusSummary = {};
  }

  ngOnInit() {
    this.loading = true;
    this.userService.getSubmittedMapSummary().pipe(finalize(() => this.loading = false)).subscribe(res => {
      this.submittedMapStatusSummary = {};
      for (const sum of res)
        this.submittedMapStatusSummary[sum.statusFlag] = sum.statusCount;
    }, err => {
      this.toasterService.danger(err.message, 'Could not get submitted maps');
      console.error(err);
    });
  }

}
