import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {ActivityCardComponent} from './activity-card.component';
import {ActivityService} from '../../../../@core/data/activity.service';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {ActivityContentComponent} from '../..';
import {TimeAgoPipe} from 'time-ago-pipe';
import {NbCardModule, NbListModule, NbUserModule, NbSelectModule, NbThemeModule} from '@nebular/theme';
import {RouterModule} from '@angular/router';
import {ActivityListComponent} from '../activity-list/activity-list.component';

describe('ActivityCardComponent', () => {
  let component: ActivityCardComponent;
  let fixture: ComponentFixture<ActivityCardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [NbCardModule, NbListModule, NbUserModule, NbSelectModule,
        HttpClientTestingModule, RouterModule, NbThemeModule.forRoot()],
      declarations: [ TimeAgoPipe, ActivityCardComponent, ActivityContentComponent, ActivityListComponent],
      providers: [ActivityService ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ActivityCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
