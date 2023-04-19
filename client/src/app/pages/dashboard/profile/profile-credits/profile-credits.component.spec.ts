import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ProfileCreditsComponent } from './profile-credits.component';
import { NgxPaginationModule } from 'ngx-pagination';
import { CommonModule } from '@angular/common';
import { RouterTestingModule } from '@angular/router/testing';
import {
  NbListModule,
  NbToastrConfig,
  NbToastRef,
  NbToastrService
} from '@nebular/theme';
import { UsersService } from '../../../../@core/data/users.service';
import { Observable, of } from 'rxjs';

describe('ProfileCreditsComponent', () => {
  let component: ProfileCreditsComponent;
  let fixture: ComponentFixture<ProfileCreditsComponent>;

  let usersServiceStub: Partial<UsersService>;
  let toastrStub: Partial<NbToastrService>;
  beforeEach(waitForAsync(() => {
    usersServiceStub = {
      getMapCredits(userID: number, options?: object): Observable<any> {
        return of({
          count: 1,
          credits: [
            {
              id: 1
            }
          ]
        });
      }
    };
    toastrStub = {
      danger(
        message: any,
        title?: any,
        config?: Partial<NbToastrConfig>
      ): NbToastRef {
        return null;
      },
      success(
        message: any,
        title?: any,
        config?: Partial<NbToastrConfig>
      ): NbToastRef {
        return null;
      }
    };

    TestBed.configureTestingModule({
      imports: [
        CommonModule,
        NgxPaginationModule,
        RouterTestingModule,
        NbListModule
      ],
      declarations: [ProfileCreditsComponent],
      providers: [
        { provide: UsersService, useValue: usersServiceStub },
        { provide: NbToastrService, useValue: toastrStub }
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ProfileCreditsComponent);
    component = fixture.componentInstance;
    component.userSubj$ = of({
      id: 1,
      steamID: '2',
      alias: 'IAmWhoIAmWhoAmI',
      aliasLocked: false,
      avatarURL: '',
      country: 'US',
      roles: 0,
      bans: 0
    });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
