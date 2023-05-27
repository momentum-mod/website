import { Component, Input, OnInit } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { NbToastrService } from '@nebular/theme';
import { MapCredit, User } from '@momentum/types';
import { MapCreditType } from '@momentum/constants';
import { UsersService } from '@momentum/frontend/data';

@Component({
  selector: 'mom-profile-credits',
  templateUrl: './profile-credits.component.html',
  styleUrls: ['./profile-credits.component.scss']
})
export class ProfileCreditsComponent implements OnInit {
  @Input() userSubj: Observable<User>;

  user: User;
  protected readonly MapCreditType = MapCreditType;
  mapCredits: MapCredit[];
  loadedCredits: boolean;
  pageLimit: number;
  currentPage: number;
  creditCount: number;

  constructor(
    private usersService: UsersService,
    private toastService: NbToastrService
  ) {
    this.loadedCredits = false;
    this.pageLimit = 10;
    this.currentPage = 1;
    this.creditCount = 0;
    this.mapCredits = [];
  }

  ngOnInit() {
    this.userSubj.subscribe((user) => {
      this.user = user;
      this.loadCredits();
    });
  }

  loadCredits() {
    this.usersService
      .getMapCredits(this.user.id, {
        expand: ['map', 'mapInfo', 'mapThumbnail']
        // TODO
        // take: this.pageLimit,
        // skip: (this.currentPage - 1) * this.pageLimit
      })
      .pipe(finalize(() => (this.loadedCredits = true)))
      .subscribe({
        next: (response) => {
          this.creditCount = response.totalCount;
          this.mapCredits = response.response;
        },
        error: (error) =>
          this.toastService.danger(error.message, 'Cannot get user map credits')
      });
  }

  onPageChange(pageNum: number) {
    this.currentPage = pageNum;
    this.loadCredits();
  }
}
