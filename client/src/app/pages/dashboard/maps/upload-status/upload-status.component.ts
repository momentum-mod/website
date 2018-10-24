import {Component, OnInit} from '@angular/core';
import {LocalUserService} from '../../../../@core/data/local-user.service';
import {MomentumMap} from '../../../../@core/models/momentum-map.model';

@Component({
  selector: 'app-map-queue',
  templateUrl: './upload-status.component.html',
  styleUrls: ['./upload-status.component.scss'],
})
export class UploadStatusComponent implements OnInit {
  maps: MomentumMap[];
  constructor(private localUserService: LocalUserService) {}
  ngOnInit(): void {
    this.localUserService.getLocalUserMaps().subscribe(res => {
      this.maps = res.maps;
    });
  }
}
