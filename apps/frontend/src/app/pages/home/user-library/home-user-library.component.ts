import { Component, OnInit } from '@angular/core';
import { LocalUserService } from '@momentum/frontend/data';
import { MMap } from '@momentum/constants';
import { NbAccordionModule } from '@nebular/theme';
import { SharedModule } from '../../../shared.module';

@Component({
  selector: 'mom-home-user-library',
  templateUrl: './home-user-library.component.html',
  styleUrls: ['./home-user-library.component.scss'],
  standalone: true,
  imports: [NbAccordionModule, SharedModule]
})
export class HomeUserLibraryComponent implements OnInit {
  mapLibraryCount: number;
  mostRecentlyAddedMap: MMap;

  constructor(private userService: LocalUserService) {}

  ngOnInit() {
    this.userService.getMapLibrary({ take: 1 }).subscribe({
      next: (response) => {
        this.mapLibraryCount = response.totalCount;
        if (response.data[0]) this.mostRecentlyAddedMap = response.data[0].map;
      },
      error: (error) => console.error(error)
    });
  }
}
