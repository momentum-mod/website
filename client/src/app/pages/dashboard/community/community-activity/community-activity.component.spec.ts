import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {CommunityActivityComponent} from './community-activity.component';
import {ThemeModule} from '../../../../@theme/theme.module';
import {ActivityService} from '../../../../@core/data/activity.service';
import {of} from 'rxjs';
import {Activity} from '../../../../@core/models/activity.model';
import {Activity_Type} from '../../../../@core/models/activity-type.model';
import {RouterModule} from '@angular/router';
import {APP_BASE_HREF} from '@angular/common';

describe('CommunityActivityComponent', () => {
  let component: CommunityActivityComponent;
  let fixture: ComponentFixture<CommunityActivityComponent>;

  let actServiceStub: Partial<ActivityService>;
  beforeEach(async(() => {
    const testActivities: Activity[] = [
      {
        id: 3,
        type: Activity_Type.MAP_APPROVED,
        user: {
          id: 2,
          steamID: '2',
          alias: 'dude',
          aliasLocked: false,
          avatarURL: 'IJJJ',
          country: 'US',
          roles: 0,
          bans: 0,
          profile: {
            id: '7',
            bio: '>:)',
          },
        },
        data: 'test',
        createdAt: new Date().toString(),
      },
    ];
    actServiceStub = {
      getRecentActivity: () => {
        return of({
          activities: testActivities,
        });
      },
    };
    TestBed.configureTestingModule({
      imports: [ThemeModule.forRoot(), RouterModule.forRoot([])],
      declarations: [ CommunityActivityComponent ],
      providers: [
        { provide: ActivityService, useValue: actServiceStub },
        { provide: APP_BASE_HREF, useValue: '/' },
      ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CommunityActivityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
