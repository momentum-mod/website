import {Component, OnInit} from '@angular/core';
import {LocalUserService} from '../../../../@core/data/local-user.service';
import {MapCredit} from '../../../../@core/models/map-credit.model';
import {ToasterService} from 'angular2-toaster';
import {finalize} from 'rxjs/operators';
import {MapCreditType} from '../../../../@core/models/map-credit-type.model';

@Component({
  selector: 'profile-credits',
  templateUrl: './profile-credits.component.html',
  styleUrls: ['./profile-credits.component.scss'],
})
export class ProfileCreditsComponent implements OnInit {

  mapCredType: typeof MapCreditType = MapCreditType;
  mapCredits: MapCredit[];
  loadedCredits: boolean;
  pageLimit: number;
  currentPage: number;
  creditCount: number;

  constructor(private userService: LocalUserService,
              private toastService: ToasterService) {
    this.loadedCredits = false;
    this.pageLimit = 10;
    this.currentPage = 1;
    this.creditCount = 0;
  }

  ngOnInit() {
    this.loadCredits();
  }

  loadCredits() {
    this.userService.getMapCredits({
      params: {
        expand: 'mapWithInfo',
        limit: this.pageLimit,
        offset: (this.currentPage - 1) * this.pageLimit,
      },
    }).pipe(finalize(() => this.loadedCredits = true))
      .subscribe(resp => {
        this.creditCount = resp.count;
        this.mapCredits = resp.credits;
      }, err => this.toastService.popAsync('error', 'Cannot get user map credits', err.message));
  }

  onPageChange(pageNum: number) {
    this.currentPage = pageNum;
    this.loadCredits();
  }
}
