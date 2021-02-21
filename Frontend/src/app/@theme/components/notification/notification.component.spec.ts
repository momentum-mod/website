import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {NotificationComponent} from './notification.component';
import {NbIconModule, NbListModule, NbToastrConfig, NbToastRef, NbToastrService, NbUserModule} from '@nebular/theme';
import {ActivityContentComponent} from '..';
import {CoreModule} from '../../../@core/core.module';
import {RouterModule} from '@angular/router';
import {APP_BASE_HREF} from '@angular/common';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {Activity_Type} from '../../../@core/models/activity-type.model';
import {NbEvaIconsModule} from '@nebular/eva-icons';
import {
  TimeagoClock,
  TimeagoDefaultClock,
  TimeagoDefaultFormatter,
  TimeagoFormatter,
  TimeagoModule,
} from 'ngx-timeago';

describe('NotificationComponent', () => {
  let component: NotificationComponent;
  let fixture: ComponentFixture<NotificationComponent>;

  let toastrStub: Partial<NbToastrService>;
  beforeEach(async(() => {
    toastrStub = {
      danger(message: any, title?: any, config?: Partial<NbToastrConfig>): NbToastRef {
        return null;
      },
      success(message: any, title?: any, config?: Partial<NbToastrConfig>): NbToastRef {
        return null;
      },
    };

    TestBed.configureTestingModule({
      imports: [
        NbListModule,
        NbUserModule,
        NbEvaIconsModule,
        NbIconModule,
        RouterModule.forRoot([]),
        HttpClientTestingModule, CoreModule.forRoot(),
        TimeagoModule.forRoot(),
      ],
      declarations: [ NotificationComponent, ActivityContentComponent ],
      providers: [
        { provide: APP_BASE_HREF, useValue: '/' },
        { provide: NbToastrService, useValue: toastrStub },
        { provide: TimeagoFormatter, useClass: TimeagoDefaultFormatter },
        { provide: TimeagoClock, useClass: TimeagoDefaultClock },
      ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NotificationComponent);
    component = fixture.componentInstance;
    component.notifications = [
      {
        id: 1,
        forUser: {
          id: 'c64397a6-20b6-4c3a-a02e-2a6fecad6b8e',
          steamID: '1',
          alias: 'Ninjaz',
          aliasLocked: false,
          avatarURL: '/assets/images/badges/BadgeVerified.png',
          country: 'US',
          roles: 0,
          bans: 0,
        },
        activity: {
          id: 1,
          user: {
            id: 'c64397a6-20b6-4c3a-a02e-2a6fecad6b8e',
            steamID: '1',
            alias: 'Ninja',
            aliasLocked: false,
            avatarURL: '/assets/images/badges/BadgeVerified.png',
            country: 'US',
            roles: 0,
            bans: 0,
            profile: {
              id: '1',
              bio: '',
            },
          },
          type: Activity_Type.USER_JOINED,
          data: 'lol',
          createdAt: new Date().toString(),
        },
        read: false,
        createdAt: new Date().toString(),
      },
      {
        id: 1,
        forUser: {
          id: 'c64397a6-20b6-4c3a-a02e-2a6fecad6b8e',
          steamID: '1',
          alias: 'Ninjazzz',
          aliasLocked: false,
          avatarURL: '/assets/images/badges/BadgeVerified.png',
          country: 'US',
          roles: 0,
          bans: 0,
        },
        activity: {
          id: 1,
          user: {
            id: 'c64397a6-20b6-4c3a-a02e-2a6fecad6b8e',
            steamID: '1',
            alias: 'TESSSSSSSSSSSSSSSSSSST',
            aliasLocked: false,
            avatarURL: '/assets/images/badges/BadgeVerified.png',
            country: 'US',
            roles: 0,
            bans: 0,
            profile: {
              id: '1',
              bio: '',
            },
          },
          type: Activity_Type.PB_ACHIEVED,
          data: 'lol',
          createdAt: new Date().toString(),
        },
        read: false,
        createdAt: new Date().toString(),
      },
    ];
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
