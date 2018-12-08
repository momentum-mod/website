import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {ActivityContentComponent} from './activity-content.component';
import {NbUserModule} from '@nebular/theme';
import {Activity_Type} from '../../../../@core/models/activity-type.model';
import {RouterModule} from '@angular/router';
import {TimeAgoPipe} from 'time-ago-pipe';
import {APP_BASE_HREF} from '@angular/common';

describe('ActivityContentComponent', () => {
  let component: ActivityContentComponent;
  let fixture: ComponentFixture<ActivityContentComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [NbUserModule, RouterModule.forRoot([])],
      declarations: [ TimeAgoPipe, ActivityContentComponent ],
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
        id: '1',
        country: 'US',
        permissions: 0,
        profile: {
          id: '1',
          alias: 'Ninja',
          bio: '',
          avatarURL: '/assets/images/caution.png',
        },
      },
      type: Activity_Type.USER_JOINED,
      data: 'lol',
      createdAt: new Date(),
    };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
