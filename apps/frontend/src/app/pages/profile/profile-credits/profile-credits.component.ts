import { Component, Input, OnInit } from '@angular/core';
import { switchMap, tap } from 'rxjs/operators';
import { Observable, Subject, merge } from 'rxjs';
import { MapCredit, User } from '@momentum/constants';
import { MapCreditType } from '@momentum/constants';
import { UsersService } from '../../../services';
import { SharedModule } from '../../../shared.module';
import { MessageService } from 'primeng/api';
import { PaginatorState } from 'primeng/paginator/paginator.interface';
import { SpinnerDirective } from '../../../directives/spinner.directive';
import { PaginatorModule } from 'primeng/paginator';

@Component({
  selector: 'm-profile-credits',
  templateUrl: './profile-credits.component.html',
  standalone: true,
  imports: [SharedModule, SpinnerDirective, PaginatorModule]
})
export class ProfileCreditsComponent implements OnInit {
  protected readonly MapCreditType = MapCreditType;

  // TODO: Subject/BehaviorSubject
  @Input() userSubject: Observable<User>;

  userID: number;
  credits: MapCredit[] = [];

  protected readonly rows = 10;
  protected totalRecords = 0;
  protected first = 0;

  protected loading: boolean;
  protected readonly load = new Subject<void>();
  protected readonly pageChange = new Subject<PaginatorState>();

  constructor(
    private readonly usersService: UsersService,
    private readonly messageService: MessageService
  ) {}

  ngOnInit() {
    this.userSubject.subscribe((user) => {
      this.userID = user.id;
      this.load.next();
    });

    merge(
      this.load,
      this.pageChange.pipe(tap(({ first }) => (this.first = first)))
    )
      .pipe(
        tap(() => (this.loading = true)),
        switchMap(() =>
          this.usersService.getMapCredits(this.userID, {
            expand: ['map', 'info', 'thumbnail'],
            take: this.rows,
            skip: this.first
          })
        ),
        tap(() => (this.loading = false))
      )
      .subscribe({
        next: (response) => {
          this.totalRecords = response.totalCount;
          this.credits = response.data;
        },
        error: (error) =>
          this.messageService.add({
            severity: 'error',
            summary: 'Cannot get user map credits',
            detail: error.message
          })
      });
  }
}
