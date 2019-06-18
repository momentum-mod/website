import {Component, Input, OnInit} from '@angular/core';
import {Observable} from 'rxjs';
import {User} from '../../../../@core/models/user.model';
import {UsersService} from '../../../../@core/data/users.service';
import {finalize} from 'rxjs/operators';
import {Run} from '../../../../@core/models/run.model';
import {FormBuilder, FormGroup} from '@angular/forms';
import {NbToastrService} from '@nebular/theme';

@Component({
  selector: 'profile-run-history',
  templateUrl: './profile-run-history.component.html',
  styleUrls: ['./profile-run-history.component.scss'],
})
export class ProfileRunHistoryComponent implements OnInit {

  @Input('userSubj') userSubj$: Observable<User>;
  user: User;
  runHistory: Run[];
  loadedRuns: boolean;
  pageLimit: number;
  currentPage: number;
  runCount: number;
  showFilters: boolean;

  filterFG: FormGroup = this.fb.group({
    'isPersonalBest': [false],
    'map': [''],
    'order': ['date'],
  });

  constructor(private usersService: UsersService,
              private toastService: NbToastrService,
              private fb: FormBuilder) {
    this.loadedRuns = false;
    this.pageLimit = 10;
    this.currentPage = 1;
    this.runCount = 0;
    this.showFilters = false;
    this.runHistory = [];
  }

  ngOnInit() {
    this.userSubj$.subscribe(usr => {
      this.user = usr;
      this.loadRunHistory();
    });
  }
  loadRunHistory() {
    this.usersService.getRunHistory(this.user.id, {
      params: {
        expand: 'map',
        limit: this.pageLimit,
        offset: (this.currentPage - 1) * this.pageLimit,
      },
    }).pipe(finalize(() => this.loadedRuns = true))
      .subscribe(resp => {
        this.runCount = resp.count;
        this.runHistory = resp.runs;
      }, err => this.toastService.danger(err.message, 'Cannot get user map credits'));
  }

  onPageChange(pageNum: number) {
    this.currentPage = pageNum;
    this.loadRunHistory();
  }
}
