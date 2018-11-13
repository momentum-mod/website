import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeActivityComponent } from './home-activity.component';
import {ThemeModule} from '../../../../@theme/theme.module';
import {RouterModule} from '@angular/router';
import {ActivityService} from '../../../../@core/data/activity.service';
import {APP_BASE_HREF} from '@angular/common';
import {of} from 'rxjs';
import {Activity} from '../../../../@core/models/activity.model';
import {Activity_Type} from '../../../../@core/models/activity-type.model';

describe('HomeActivityComponent', () => {
  let component: HomeActivityComponent;
  let fixture: ComponentFixture<HomeActivityComponent>;

  let actServiceStub: Partial<ActivityService>;
  beforeEach(async(() => {
    const testActivities: Activity[] = [
      {
        id: 3,
        type: Activity_Type.MAP_APPROVED,
        user: {
          id: '2',
          permissions: 2,
          profile: {
            id: '7',
            alias: 'dude',
            avatarURL: 'IJJJ',
          },
        },
        data: 'test',
        createdAt: new Date(),
      },
    ];
    actServiceStub = {
      getFollowedActivity: () => {
        return of({
          activities: testActivities,
        });
      },
    };
    TestBed.configureTestingModule({
      imports: [ThemeModule, RouterModule.forRoot([])],
      declarations: [ HomeActivityComponent ],
      providers: [
        { provide: ActivityService, useValue: actServiceStub },
        { provide: APP_BASE_HREF, useValue: '/' },
      ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HomeActivityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
