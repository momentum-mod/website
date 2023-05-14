import { Component, OnInit } from '@angular/core';
import { LocalUserService } from '@momentum/frontend/data';
import { Map } from '@momentum/types';

@Component({
  selector: 'mom-home-user-library',
  templateUrl: './home-user-library.component.html',
  styleUrls: ['./home-user-library.component.scss']
})
export class HomeUserLibraryComponent implements OnInit {
  mapLibraryCount: number;
  mostRecentlyAddedMap: Map;

  constructor(private userService: LocalUserService) {}

  ngOnInit() {
    this.userService
      .getMapLibrary({
        params: { limit: 1 }
      })
      .subscribe({
        next: (response) => {
          this.mapLibraryCount = response.count;
          if (response.entries[0])
            this.mostRecentlyAddedMap = response.entries[0].map;
        },
        error: (error) => console.error(error)
      });
  }
}
