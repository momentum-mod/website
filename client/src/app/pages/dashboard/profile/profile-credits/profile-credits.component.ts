import {Component, Input, OnInit} from '@angular/core';
import {MapCredit} from '../../../../@core/models/map-credit.model';
import {finalize} from 'rxjs/operators';
import {MapCreditType} from '../../../../@core/models/map-credit-type.model';
import {Observable} from 'rxjs';
import {User} from '../../../../@core/models/user.model';
import {UsersService} from '../../../../@core/data/users.service';
import {NbToastrService} from '@nebular/theme';

@Component({
  selector: 'profile-credits',
  templateUrl: './profile-credits.component.html',
  styleUrls: ['./profile-credits.component.scss'],
})
export class ProfileCreditsComponent implements OnInit {

  @Input('userSubj') userSubj$: Observable<User>;

  user: User;
  mapCredType: typeof MapCreditType = MapCreditType;
  mapCredits: MapCredit[];
  loadedCredits: boolean;
  pageLimit: number;
  currentPage: number;
  creditCount: number;

  constructor(private usersService: UsersService,
              private toastService: NbToastrService) {
    this.loadedCredits = false;
    this.pageLimit = 10;
    this.currentPage = 1;
    this.creditCount = 0;
    this.mapCredits = [];
  }

  ngOnInit() {
    this.userSubj$.subscribe(usr => {
      this.user = usr;
      this.loadCredits();
    });
  }

  loadCredits() {
    this.usersService.getMapCredits(this.user.id, {
      params: {
        expand: 'map,mapInfo,mapThumbnail',
        limit: this.pageLimit,
        offset: (this.currentPage - 1) * this.pageLimit,
      },
    }).pipe(finalize(() => this.loadedCredits = true))
      .subscribe(resp => {
        this.creditCount = resp.count;
        this.mapCredits = resp.credits;
      }, err => this.toastService.danger(err.message, 'Cannot get user map credits'));
  }

  onPageChange(pageNum: number) {
    this.currentPage = pageNum;
    this.loadCredits();
  }
}
