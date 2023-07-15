it.todo('');

/*
import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {ProfileRunHistoryComponent} from './profile-run-history.component';
import {
  NbButtonModule,
  NbCheckboxModule,
  NbListModule,
  NbOverlayModule,
  NbPopoverModule,
  NbSelectModule,
  NbThemeModule
} from '@nebular/theme';
import {ReactiveFormsModule} from '@angular/forms';
import {NgxPaginationModule} from 'ngx-pagination';
import {RouterTestingModule} from '@angular/router/testing';
import {UsersService} from '../../../../@core/data/users.service';
import {Observable, of} from 'rxjs';
import {ToasterModule} from 'angular2-toaster';
import {TimeAgoPipe} from 'time-ago-pipe';
import {TimingPipe} from '../../../../@theme/pipes';

describe('ProfileRunHistoryComponent', () => {
  let component: ProfileRunHistoryComponent;
  let fixture: ComponentFixture<ProfileRunHistoryComponent>;

  let usersServiceStub: Partial<UsersService>;
  beforeEach(async(() => {
    usersServiceStub = {
      getRunHistory(userID: number, options?: object): Observable<any> {
        return of({
          count: 1,
          runs: [{
            id: 1,
          }],
        });
      },
    };
    TestBed.configureTestingModule({
      imports: [
        NbThemeModule.forRoot(),
        NbListModule,
        NbSelectModule,
        NbButtonModule,
        NbCheckboxModule,
        NbPopoverModule,
        NbOverlayModule.forRoot(),
        ReactiveFormsModule,
        NgxPaginationModule,
        RouterTestingModule.withRoutes([]),
        ToasterModule.forRoot(),
      ],
      declarations: [ ProfileRunHistoryComponent, TimeAgoPipe, TimingPipe ],
      providers: [
        {provide: UsersService, useValue: usersServiceStub},
      ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ProfileRunHistoryComponent);
    component = fixture.componentInstance;
    component.userSubj$ = of({
      id: '1',
      country: 'US',
      roles: 0,
      bans: 0,
    })
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
*/
