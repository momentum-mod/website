import { Component, Input, OnInit } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { MapCredit, User } from '@momentum/constants';
import { MapCreditType } from '@momentum/constants';
import { UsersService } from '@momentum/frontend/data';
import { SharedModule } from '../../../shared.module';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'm-profile-credits',
  templateUrl: './profile-credits.component.html',
  standalone: true,
  imports: [SharedModule]
})
export class ProfileCreditsComponent implements OnInit {
  protected readonly MapCreditType = MapCreditType;

  @Input() userSubject: Observable<User>;

  user: User;
  mapCredits: MapCredit[] = [];
  loadedCredits = false;
  pageLimit = 10;
  currentPage = 1;
  creditCount = 0;

  constructor(
    private readonly usersService: UsersService,
    private readonly messageService: MessageService
  ) {}

  ngOnInit() {
    this.userSubject.subscribe((user) => {
      this.user = user;
      this.loadCredits();
    });
  }

  loadCredits() {
    this.usersService
      .getMapCredits(this.user.id, {
        expand: ['map', 'info', 'thumbnail'],
        take: this.pageLimit,
        skip: (this.currentPage - 1) * this.pageLimit
      })
      .pipe(finalize(() => (this.loadedCredits = true)))
      .subscribe({
        next: (response) => {
          this.creditCount = response.totalCount;
          this.mapCredits = response.data;
        },
        error: (error) =>
          this.messageService.add({
            severity: 'error',
            summary: 'Cannot get user map credits',
            detail: error.message
          })
      });
  }

  onPageChange(pageNum: number) {
    this.currentPage = pageNum;
    this.loadCredits();
  }
}
