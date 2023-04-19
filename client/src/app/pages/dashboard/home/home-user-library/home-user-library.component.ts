import { Component, OnInit } from '@angular/core';
import { MomentumMap } from '../../../../@core/models/momentum-map.model';
import { LocalUserService } from '../../../../@core/data/local-user.service';

@Component({
  selector: 'home-user-library',
  templateUrl: './home-user-library.component.html',
  styleUrls: ['./home-user-library.component.scss']
})
export class HomeUserLibraryComponent implements OnInit {
  mapLibraryCount: number;
  mostRecentlyAddedMap: MomentumMap;

  constructor(private userService: LocalUserService) {}

  ngOnInit() {
    this.userService
      .getMapLibrary({
        params: { limit: 1 }
      })
      .subscribe(
        (res) => {
          this.mapLibraryCount = res.count;
          if (res.entries[0]) this.mostRecentlyAddedMap = res.entries[0].map;
        },
        (err) => {
          console.error(err);
        }
      );
  }
}
