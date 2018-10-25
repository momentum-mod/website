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
  maps: MomentumMap[];
  fetchedMaps: boolean;
  constructor(private localUserService: LocalUserService,
              private toastService: ToasterService) {
    this.fetchedMaps = false;
  }

  ngOnInit(): void {
    this.localUserService.getSubmittedMaps().subscribe(res => {
      this.maps = res.maps;
    }, er => {
      this.toastService.popAsync('error', 'Error fetching submitted maps', er.message);
    }, () => {
      this.fetchedMaps = true;
    });
  }
}
