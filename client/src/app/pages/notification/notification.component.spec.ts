import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {NotificationComponent} from './notification.component';
import {NbListModule, NbUserModule} from '@nebular/theme';
import {ActivityContentComponent} from './activity-content/activity-content.component';
import {CoreModule} from '../../@core/core.module';
import {RouterModule} from '@angular/router';
import {APP_BASE_HREF} from '@angular/common';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {ToasterModule} from 'angular2-toaster';
import {Activity_Type} from '../../@core/models/activity-type.model';

describe('NotificationComponent', () => {
  let component: NotificationComponent;
  let fixture: ComponentFixture<NotificationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [NbListModule, NbUserModule, RouterModule.forRoot([]), HttpClientTestingModule,
        ToasterModule.forRoot(), CoreModule.forRoot()],
      declarations: [ NotificationComponent, ActivityContentComponent ],
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
          id: '1',
          permissions: 0,
        },
        activity: {
          id: 1,
          user: {
            id: '1',
            permissions: 0,
            profile: {
              id: '1',
              alias: 'Ninja',
              bio: '',
              avatarURL: '/assets/images/caution.png',
            },
          },
          type: Activity_Type.USER_JOIN,
          data: 'lol',
        },
        read: false,
      },
      {
        id: 1,
        forUser: {
          id: '1',
          permissions: 0,
        },
        activity: {
          id: 1,
          user: {
            id: '1',
            permissions: 0,
            profile: {
              id: '1',
              alias: 'TESSSSSSSSSSSSSSSSSSST',
              bio: '',
              avatarURL: '/assets/images/caution.png',
            },
          },
          type: Activity_Type.PB_ACHIEVED,
          data: 'lol',
        },
        read: false,
      },
    ];
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
