import {Component, OnInit} from '@angular/core';
import {MomentumMap} from '../../../../@core/models/momentum-map.model';
import {LocalUserService} from '../../../../@core/data/local-user.service';
import {NbToastrService} from '@nebular/theme';
import {finalize} from 'rxjs/operators';

@Component({
  selector: 'home-user-library',
  templateUrl: './home-user-library.component.html',
  styleUrls: ['./home-user-library.component.scss'],
})
export class HomeUserLibraryComponent implements OnInit {
  loading: boolean;
  mapLibraryCount: number;
  mostRecentlyAddedMap: MomentumMap;

  constructor(private userService: LocalUserService, private toasterService: NbToastrService) {
    this.loading = false;
  }

  ngOnInit() {
    this.loading = true;
    this.userService.getMapLibrary({
      params: { limit: 1 },
    }).pipe(finalize(() => this.loading = false)).subscribe(res => {
      this.mapLibraryCount = res.count;
      if (res.entries[0])
        this.mostRecentlyAddedMap = res.entries[0].map;
    }, err => {
      this.toasterService.danger(err.message, 'Could not get map library');
      console.error(err);
    });
  }

}
