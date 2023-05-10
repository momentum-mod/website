import { Component, Input, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from '../../../../@core/models/user.model';
import { UsersService } from '../../../../@core/data/users.service';
import { finalize } from 'rxjs/operators';
import { Run } from '../../../../@core/models/run.model';
import { FormBuilder, FormGroup } from '@angular/forms';
import { NbToastrService } from '@nebular/theme';

@Component({
  selector: 'mom-profile-run-history',
  templateUrl: './profile-run-history.component.html',
  styleUrls: ['./profile-run-history.component.scss']
})
export class ProfileRunHistoryComponent implements OnInit {
  @Input() userSubj: Observable<User>;
  user: User;
  runHistory: Run[];
  loadedRuns: boolean;
  pageLimit: number;
  currentPage: number;
  runCount: number;
  showFilters: boolean;
  currentFilter: {
    isPersonalBest: boolean;
    map: string;
    order: string;
  };

  filterFG: FormGroup = this.fb.group({
    isPersonalBest: [false],
    map: [''],
    order: ['date']
  });

  constructor(
    private usersService: UsersService,
    private toastService: NbToastrService,
    private fb: FormBuilder
  ) {
    this.loadedRuns = false;
    this.pageLimit = 10;
    this.currentPage = 1;
    this.runCount = 0;
    this.showFilters = false;
    this.runHistory = [];
    this.currentFilter = {
      isPersonalBest: this.filterFG.value.isPersonalBest,
      map: this.filterFG.value.map,
      order: this.filterFG.value.order
    };
  }

  ngOnInit() {
    this.userSubj.subscribe((user) => {
      this.user = user;
      this.loadRunHistory();
    });
  }

  loadRunHistory() {
    this.usersService
      .getRunHistory(this.user.id, {
        params: {
          expand: 'map',
          mapName: this.currentFilter.map,
          isPB: this.currentFilter.isPersonalBest,
          order: this.currentFilter.order,
          limit: this.pageLimit,
          offset: (this.currentPage - 1) * this.pageLimit
        }
      })
      .pipe(finalize(() => (this.loadedRuns = true)))
      .subscribe({
        next: (response) => {
          this.runCount = response.count;
          this.runHistory = response.runs;
        },
        error: (error) =>
          this.toastService.danger(error.message, 'Cannot get user map credits')
      });
  }

  onPageChange(pageNum: number) {
    this.currentPage = pageNum;
    this.loadRunHistory();
  }

  onFilterApply() {
    // Some destructuring to shorten the upcoming if statement
    const { isPersonalBest, map, order } = this.filterFG.value;
    if (
      // Don't do anything if the filters didn't change
      this.currentFilter.isPersonalBest === isPersonalBest &&
      this.currentFilter.map === map &&
      this.currentFilter.order === order
    )
      return;
    this.currentFilter = { isPersonalBest, map, order };
    this.currentPage = 1; // Reset page back to 1 so you don't potentially pull a page past the last filtered page
    this.loadRunHistory();
  }
}
