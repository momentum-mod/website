import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import {ActivityContentComponent} from './activity-content.component';
import {NbUserModule} from '@nebular/theme';
import {Activity_Type} from '../../../../@core/models/activity-type.model';
import {RouterModule} from '@angular/router';
import {APP_BASE_HREF} from '@angular/common';
import {TimeagoModule} from 'ngx-timeago';

describe('ActivityContentComponent', () => {
  let component: ActivityContentComponent;
  let fixture: ComponentFixture<ActivityContentComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [NbUserModule, RouterModule.forRoot([], { relativeLinkResolution: 'legacy' }), TimeagoModule.forRoot()],
      declarations: [ ActivityContentComponent ],
      providers: [
        { provide: APP_BASE_HREF, useValue: '/' },
      ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ActivityContentComponent);
    component = fixture.componentInstance;
    component.activity = {
      id: 1,
      user: {
        id: 1,
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
    };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
