import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {ProfileCreditsComponent} from './profile-credits.component';
import {NgxPaginationModule} from 'ngx-pagination';
import {CommonModule} from '@angular/common';
import {RouterTestingModule} from '@angular/router/testing';
import {NbListModule} from '@nebular/theme';
import {UsersService} from '../../../../@core/data/users.service';
import {Observable, of} from 'rxjs';
import {ToasterModule} from 'angular2-toaster';

describe('ProfileCreditsComponent', () => {
  let component: ProfileCreditsComponent;
  let fixture: ComponentFixture<ProfileCreditsComponent>;

  let usersServiceStub: Partial<UsersService>;
  beforeEach(async(() => {

    usersServiceStub = {
      getMapCredits(userID: string, options?: object): Observable<any> {
        return of({
          count: 1,
          credits: [
            {
              id: 1,
            },
          ],
        });
      },
    };

    TestBed.configureTestingModule({
      imports: [
        CommonModule,
        NgxPaginationModule,
        RouterTestingModule,
        NbListModule,
        ToasterModule.forRoot(),
      ],
      declarations: [ ProfileCreditsComponent ],
      providers: [
        { provide: UsersService, useValue: usersServiceStub },
      ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ProfileCreditsComponent);
    component = fixture.componentInstance;
    component.userSubj$ = of({
      id: '1',
      country: 'US',
      permissions: 0,
    });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
