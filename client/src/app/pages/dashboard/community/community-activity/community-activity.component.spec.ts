import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import {CommunityActivityComponent} from './community-activity.component';
import {ThemeModule} from '../../../../@theme/theme.module';
import {ActivityService} from '../../../../@core/data/activity.service';
import {of} from 'rxjs';
import {Activity} from '../../../../@core/models/activity.model';
import {Activity_Type} from '../../../../@core/models/activity-type.model';
import {RouterModule} from '@angular/router';
import {APP_BASE_HREF} from '@angular/common';
import {TimeagoClock, TimeagoDefaultClock, TimeagoDefaultFormatter, TimeagoFormatter} from 'ngx-timeago';
import { NbToastrService } from '@nebular/theme';

describe('CommunityActivityComponent', () => {
  let component: CommunityActivityComponent;
  let fixture: ComponentFixture<CommunityActivityComponent>;
  let toastrStub: Partial<NbToastrService>;
  let actServiceStub: Partial<ActivityService>;
  beforeEach(waitForAsync(() => {
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
      imports: [ThemeModule.forRoot(), RouterModule.forRoot([], { relativeLinkResolution: 'legacy' })],
      declarations: [ CommunityActivityComponent ],
      providers: [
        { provide: NbToastrService, useValue: toastrStub },
        { provide: ActivityService, useValue: actServiceStub },
        { provide: APP_BASE_HREF, useValue: '/' },
        { provide: TimeagoFormatter, useClass: TimeagoDefaultFormatter },
        { provide: TimeagoClock, useClass: TimeagoDefaultClock },
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
