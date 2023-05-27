import { Component, OnInit } from '@angular/core';
import { MapStatus } from '@momentum/constants';
import { LocalUserService } from '@momentum/frontend/data';

@Component({
  selector: 'mom-home-user-maps',
  templateUrl: './home-user-maps.component.html',
  styleUrls: ['./home-user-maps.component.scss']
})
export class HomeUserMapsComponent implements OnInit {
  protected readonly MapStatus = MapStatus;
  submittedMapStatusSummary;

  constructor(private userService: LocalUserService) {
    this.submittedMapStatusSummary = {};
  }

  ngOnInit() {
    this.userService.getSubmittedMapSummary().subscribe({
      next: (response) => {
        this.submittedMapStatusSummary = {};
        for (const sum of response)
          this.submittedMapStatusSummary[sum.statusFlag] = sum.statusCount;
      },
      error: (error) => console.error(error)
    });
  }
}
