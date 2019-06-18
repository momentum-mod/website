import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {NotificationComponent} from './notification.component';
import {NbListModule, NbUserModule} from '@nebular/theme';
import {ActivityContentComponent} from '..';
import {CoreModule} from '../../../@core/core.module';
import {RouterModule} from '@angular/router';
import {APP_BASE_HREF} from '@angular/common';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {ToasterModule} from 'angular2-toaster';
import {Activity_Type} from '../../../@core/models/activity-type.model';
import {TimeAgoPipe} from 'time-ago-pipe';

describe('NotificationComponent', () => {
  let component: NotificationComponent;
  let fixture: ComponentFixture<NotificationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [NbListModule, NbUserModule, RouterModule.forRoot([]), HttpClientTestingModule,
        ToasterModule.forRoot(), CoreModule.forRoot()],
      declarations: [ TimeAgoPipe, NotificationComponent, ActivityContentComponent ],
      providers: [
        { provide: APP_BASE_HREF, useValue: '/' },
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
          id: 1,
          steamID: '1',
          alias: 'Ninjaz',
          aliasLocked: false,
          avatarURL: '/assets/images/caution.png',
          country: 'US',
          roles: 0,
          bans: 0,
        },
        activity: {
          id: 1,
          user: {
            id: 1,
            steamID: '1',
            alias: 'Ninja',
            aliasLocked: false,
            avatarURL: '/assets/images/caution.png',
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
          id: 1,
          steamID: '1',
          alias: 'Ninjazzz',
          aliasLocked: false,
          avatarURL: '/assets/images/caution.png',
          country: 'US',
          roles: 0,
          bans: 0,
        },
        activity: {
          id: 1,
          user: {
            id: 1,
            steamID: '1',
            alias: 'TESSSSSSSSSSSSSSSSSSST',
            aliasLocked: false,
            avatarURL: '/assets/images/caution.png',
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
